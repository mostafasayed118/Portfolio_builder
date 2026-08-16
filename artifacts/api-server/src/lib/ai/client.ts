import { z } from "zod";
import { env } from "../env";

export type AiErrorCode = "not_configured" | "http" | "timeout" | "network" | "invalid_json";

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly status?: number;
  constructor(code: AiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "AiError";
    this.code = code;
    this.status = status;
  }
}

export function isAiConfigured(): boolean {
  return Boolean(env.AI_API_KEY);
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateTextOptions {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

async function complete(options: GenerateTextOptions): Promise<string> {
  if (!isAiConfigured()) {
    throw new AiError("not_configured", "AI is not configured (AI_API_KEY missing)");
  }
  const timeoutMs = options.timeoutMs ?? env.AI_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: options.model ?? env.AI_MODEL,
        messages: options.messages,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiError("timeout", `AI request timed out after ${timeoutMs}ms`);
    }
    throw new AiError("network", err instanceof Error ? err.message : "network error");
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw new AiError("http", `AI provider returned ${res.status}`, res.status);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

export async function generateText(options: GenerateTextOptions): Promise<string> {
  return complete(options);
}

export interface GenerateJsonOptions<T> extends GenerateTextOptions {
  schema?: z.ZodType<T>;
  retries?: number;
}

function stripFences(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) text = fence[1];
  const starts = [text.indexOf("{"), text.indexOf("[")].filter((i) => i >= 0);
  if (starts.length > 0) {
    text = text.slice(Math.min(...starts));
    const last = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (last >= 0) text = text.slice(0, last + 1);
  }
  return text;
}

export async function generateJson<T>(options: GenerateJsonOptions<T>): Promise<T> {
  const retries = options.retries ?? 1;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const raw = await complete(options);
      let value: unknown;
      try {
        value = JSON.parse(stripFences(raw));
      } catch (parseErr) {
        throw new AiError("invalid_json", parseErr instanceof Error ? parseErr.message : "invalid JSON");
      }
      if (options.schema) {
        const parsed = options.schema.safeParse(value);
        if (!parsed.success) throw new AiError("invalid_json", parsed.error.message);
        return parsed.data;
      }
      return value as T;
    } catch (err) {
      const retryable = err instanceof AiError && err.code === "invalid_json" && attempt < retries;
      if (!retryable) throw err;
    }
  }
  throw new AiError("invalid_json", "model did not return valid JSON");
}
