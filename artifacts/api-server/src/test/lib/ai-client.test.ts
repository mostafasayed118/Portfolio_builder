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
    vi.useRealTimers();
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

  it("generateJson waits ~400ms before retrying invalid_json", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "still not json" } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "{\"a\":1}" } }] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const pending = generateJson<{ a: number }>({ messages: [{ role: "user", content: "x" }] });

    await vi.advanceTimersByTimeAsync(399);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ a: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("generateJson does NOT retry or delay on http errors", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateJson<{ a: number }>({ messages: [{ role: "user", content: "x" }] }))
      .rejects.toMatchObject({ code: "http", status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("generateJson does NOT retry or delay on network errors", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new Error("connection reset"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateJson<{ a: number }>({ messages: [{ role: "user", content: "x" }] }))
      .rejects.toMatchObject({ code: "network" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
