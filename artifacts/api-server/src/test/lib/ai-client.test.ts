import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateText, generateJson, isAiConfigured, AiError } from "../../lib/ai/client";

function stubFetch(body: unknown, status = 200): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe("lib/ai/client", () => {
  beforeEach(() => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_BASE_URL", "https://api.groq.com/openai/v1");
    vi.stubEnv("AI_MODEL", "grok-test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("isAiConfigured reflects AI_API_KEY presence", () => {
    expect(isAiConfigured()).toBe(true);
    vi.stubEnv("AI_API_KEY", "");
    expect(isAiConfigured()).toBe(false);
  });

  it("generateText returns the assistant content", async () => {
    vi.stubGlobal("fetch", stubFetch({ choices: [{ message: { content: "hi there" } }] }));
    const text = await generateText({ messages: [{ role: "user", content: "hello" }] });
    expect(text).toBe("hi there");
  });

  it("throws AiError(http) on non-2xx", async () => {
    vi.stubGlobal("fetch", stubFetch({ error: {} }, 429));
    await expect(generateText({ messages: [{ role: "user", content: "hello" }] }))
      .rejects.toMatchObject({ code: "http", status: 429 });
  });

  it("throws AiError(not_configured) when key is absent", async () => {
    vi.stubEnv("AI_API_KEY", "");
    await expect(generateText({ messages: [{ role: "user", content: "hello" }] }))
      .rejects.toMatchObject({ code: "not_configured" });
  });

  it("throws AiError(timeout) when the request exceeds the timeout", async () => {
    vi.stubEnv("AI_TIMEOUT_MS", "10");
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
      ),
    );
    await expect(generateText({ messages: [{ role: "user", content: "hello" }] }))
      .rejects.toMatchObject({ code: "timeout" });
  });

  it("generateJson parses fenced JSON", async () => {
    vi.stubGlobal("fetch", stubFetch({ choices: [{ message: { content: "```json\n{\"a\":1}\n```" } }] }));
    const out = await generateJson<{ a: number }>({ messages: [{ role: "user", content: "x" }] });
    expect(out).toEqual({ a: 1 });
  });

  it("generateJson throws invalid_json on malformed output", async () => {
    vi.stubGlobal("fetch", stubFetch({ choices: [{ message: { content: "not json" } }] }));
    await expect(generateJson<{ a: number }>({ messages: [{ role: "user", content: "x" }] }))
      .rejects.toBeInstanceOf(AiError);
  });
});
