/**
 * Minimal Gemini REST client for the admin AI assistant.
 *
 * Uses the generativelanguage REST API directly (no SDK dependency) so the
 * feature stays dependency-light, matching how the rest of the api-server
 * calls out (global fetch, like lib/turnstile.ts).
 *
 * Env:
 *   GEMINI_API_KEY  — required; Google AI Studio / Gemini API key
 *   GEMINI_BASE_URL — optional override (default https://generativelanguage.googleapis.com)
 *   GEMINI_MODEL    — optional model override (default gemini-flash-latest)
 */

const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateContent(
  prompt: string,
  opts?: { model?: string; temperature?: number },
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  const model = opts?.model ?? GEMINI_MODEL;
  const res = await fetch(`${GEMINI_BASE_URL}/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: opts?.temperature ?? 0.7 },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${body.slice(0, 200)}`);
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
