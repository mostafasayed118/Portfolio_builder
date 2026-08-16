/**
 * Minimal Gemini REST client for the admin AI assistant.
 *
 * Uses the generativelanguage REST API directly (no SDK dependency) so the
 * feature stays dependency-light, matching how the rest of the api-server
 * calls out (global fetch, like lib/turnstile.ts).
 *
 * Transient failures — HTTP 429 (rate limited), 5xx (incl. the "high demand"
 * 503s gemini-flash has been serving), network errors, and our own timeout
 * aborts — are retried with exponential backoff + jitter so a short provider
 * hiccup doesn't surface as a 500 to the admin UI. Deterministic errors
 * (invalid key / bad model 4xx, missing key) fail fast.
 *
 * A HARD TOTAL BUDGET caps how long a request may take across every attempt
 * and backoff (default 30s, configurable via totalTimeoutMs). Each attempt's
 * timeout is capped to whatever budget remains, so a request never exceeds
 * the deadline — during overload it retries while budget remains, then
 * surfaces the last provider error instead of hanging the admin UI.
 *
 * Env:
 *   GEMINI_API_KEY  — required; Google AI Studio / Gemini API key
 *   GEMINI_BASE_URL — optional override (default https://generativelanguage.googleapis.com)
 *   GEMINI_MODEL    — optional model override (default gemini-flash-latest)
 */

const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

/** Per-attempt ceiling. Slow model generations get room, but a Vercel function
 *  still has a hard execution budget, so keep the total well under it. */
const DEFAULT_TIMEOUT_MS = 30_000;
/** Hard cap on total time across all attempts + backoff (admin clicks stay snappy). */
const DEFAULT_TOTAL_TIMEOUT_MS = 30_000;
/** Extra attempts after the first (3 total calls worst case). */
const DEFAULT_MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 4_000;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Provider error carrying the HTTP status so retry logic can classify it. */
export class GeminiApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GeminiApiError";
    this.status = status;
  }
}

export interface GenerateContentOptions {
  model?: string;
  temperature?: number;
  /** Override the per-attempt timeout (used by tests). */
  timeoutMs?: number;
  /** Override the retry count (used by tests). */
  maxRetries?: number;
  /** Hard cap on total time across attempts + backoff (used by tests). */
  totalTimeoutMs?: number;
}

/** Result of a generateContent call, including retry activity. */
export interface GeminiResult {
  text: string;
  /** How many API calls were made before one succeeded (1 = no retries). */
  attempts: number;
}

interface AttemptConfig {
  model: string;
  temperature: number;
  timeoutMs: number;
}

/**
 * A failed call is worth retrying when it wasn't a deterministic client
 * problem: 429 / 5xx (provider overloaded or mid-failure), a network error
 * (no HTTP status, incl. our own timeout abort — a generation is idempotent,
 * so re-sending is safe), or a malformed/empty response.
 */
function isRetryable(err: unknown): boolean {
  if (err instanceof GeminiApiError) {
    const { status } = err;
    if (status === undefined) return true;
    return status === 429 || (status >= 500 && status <= 599);
  }
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOnce(apiKey: string, prompt: string, cfg: AttemptConfig): Promise<string> {
  const res = await fetch(`${GEMINI_BASE_URL}/v1beta/models/${cfg.model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: cfg.temperature },
    }),
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GeminiApiError(`Gemini API ${res.status}: ${body.slice(0, 200)}`, res.status);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? "";
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Gemini returned no text");
  }
  return trimmed;
}

export async function generateContent(
  prompt: string,
  opts?: GenerateContentOptions,
): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const cfg: AttemptConfig = {
    model: opts?.model ?? GEMINI_MODEL,
    temperature: opts?.temperature ?? 0.7,
    timeoutMs: opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
  const maxRetries = opts?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const totalTimeoutMs = opts?.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS;
  const startedAt = Date.now();

  let attempt = 1;
  let lastError: unknown;
  for (;;) {
    const remaining = totalTimeoutMs - (Date.now() - startedAt);
    if (remaining <= 0 && attempt > 1) {
      // Budget exhausted — surface the most recent provider failure rather
      // than starting an attempt that can't finish in time.
      throw lastError;
    }
    try {
      // Cap the attempt timeout to the remaining budget so a single slow
      // attempt can't push the request past the total deadline.
      const text = await callOnce(apiKey, prompt, {
        ...cfg,
        timeoutMs: Math.min(cfg.timeoutMs, Math.max(remaining, 1)),
      });
      return { text, attempts: attempt };
    } catch (err) {
      lastError = err;
      if (attempt > maxRetries || !isRetryable(err)) {
        throw err;
      }
      attempt += 1;
      const backoff = Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempt - 2), MAX_RETRY_DELAY_MS);
      // Full jitter (0…backoff added) spreads concurrent retries; don't wait
      // past the deadline either.
      const remainingAfterFailure = totalTimeoutMs - (Date.now() - startedAt);
      if (remainingAfterFailure <= 0) {
        throw err;
      }
      await delay(Math.min(backoff + Math.random() * backoff, remainingAfterFailure));
    }
  }
}

/** Split a Gemini list response (tags/categories) on commas or newlines. */
export function parseListResponse(text: string, limit: number): string[] {
  const items = text
    .split(/[\n,]+/)
    .map((item) => item.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean)
    .map((item) => item.replace(/^"+|"+$/g, "").trim())
    .filter(Boolean);
  return [...new Set(items)].slice(0, limit);
}
