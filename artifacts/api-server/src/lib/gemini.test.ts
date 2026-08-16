import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateContent, parseListResponse, GeminiApiError } from "./gemini";

const OK_BODY = JSON.stringify({
  candidates: [{ content: { parts: [{ text: "OK" }] } }],
});

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function mockFetchSequence(...responses: Response[]): ReturnType<typeof vi.fn> {
  const mock = vi.fn();
  for (const res of responses) mock.mockResolvedValueOnce(res);
  return mock;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("generateContent retry behavior", () => {
  it("returns the text on the first successful attempt", async () => {
    const fetchMock = mockFetchSequence(jsonResponse(OK_BODY));
    vi.stubGlobal("fetch", fetchMock);

    const promise = generateContent("hello", { timeoutMs: 5_000, maxRetries: 2 });
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(promise).resolves.toBe("OK");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a 503 'high demand' and succeeds on the second attempt", async () => {
    const fetchMock = mockFetchSequence(
      jsonResponse({ error: { message: "high demand" } }, 503),
      jsonResponse(OK_BODY),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = generateContent("hello", { timeoutMs: 5_000, maxRetries: 2 });
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(promise).resolves.toBe("OK");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries 429 and 5xx statuses", async () => {
    const fetchMock = mockFetchSequence(
      jsonResponse({}, 429),
      jsonResponse({}, 502),
      jsonResponse(OK_BODY),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = generateContent("hello", { timeoutMs: 5_000, maxRetries: 2 });
    await vi.advanceTimersByTimeAsync(20_000);

    await expect(promise).resolves.toBe("OK");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries a network error (fetch throws)", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(jsonResponse(OK_BODY));
    vi.stubGlobal("fetch", fetchMock);

    const promise = generateContent("hello", { timeoutMs: 5_000, maxRetries: 2 });
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(promise).resolves.toBe("OK");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after max retries and surfaces the last provider error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: { message: "high demand" } }, 503));
    vi.stubGlobal("fetch", fetchMock);

    const promise = generateContent("hello", { timeoutMs: 5_000, maxRetries: 2 });
    // Attach the rejection handler before advancing timers so the retry-loop
    // rejection is never observed as unhandled.
    const assertion = expect(promise).rejects.toMatchObject({
      name: "GeminiApiError",
      status: 503,
      message: expect.stringContaining("Gemini API 503"),
    });
    await vi.advanceTimersByTimeAsync(20_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry an invalid-key 400 and fails fast", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: { message: "API key not valid" } }, 400));
    vi.stubGlobal("fetch", fetchMock);

    const promise = generateContent("hello", { timeoutMs: 5_000, maxRetries: 2 });
    const assertion = expect(promise).rejects.toBeInstanceOf(GeminiApiError);
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws immediately when GEMINI_API_KEY is not configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateContent("hello", { maxRetries: 2 })).rejects.toThrow(
      "GEMINI_API_KEY is not configured",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("parseListResponse", () => {
  it("splits comma-separated values and trims whitespace", () => {
    expect(parseListResponse("frontend, ui ,  responsive", 5)).toEqual([
      "frontend",
      "ui",
      "responsive",
    ]);
  });

  it("splits newline-separated values and strips bullet markers", () => {
    expect(parseListResponse("- python\n- sql\n* react", 5)).toEqual([
      "python",
      "sql",
      "react",
    ]);
  });

  it("strips surrounding quotes", () => {
    expect(parseListResponse('"backend", "database"', 5)).toEqual(["backend", "database"]);
  });

  it("deduplicates and caps at the limit", () => {
    expect(parseListResponse("a, b, a, c, d, e, f", 5)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseListResponse("", 5)).toEqual([]);
    expect(parseListResponse("   ", 5)).toEqual([]);
  });
});
