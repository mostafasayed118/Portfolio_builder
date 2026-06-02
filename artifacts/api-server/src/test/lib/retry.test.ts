import { describe, it, expect, vi } from "vitest";
import { withRetry, isTransientError } from "../../lib/retry";

describe("isTransientError", () => {
  it("returns true for 5xx HTTP status", () => {
    expect(isTransientError({ status: 500 })).toBe(true);
    expect(isTransientError({ status: 502 })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
    expect(isTransientError({ status: 504 })).toBe(true);
  });

  it("returns true for 408 / 429", () => {
    expect(isTransientError({ status: 408 })).toBe(true);
    expect(isTransientError({ status: 429 })).toBe(true);
  });

  it("returns false for 4xx (non-timeout)", () => {
    expect(isTransientError({ status: 400 })).toBe(false);
    expect(isTransientError({ status: 401 })).toBe(false);
    expect(isTransientError({ status: 403 })).toBe(false);
    expect(isTransientError({ status: 404 })).toBe(false);
    expect(isTransientError({ status: 422 })).toBe(false);
  });

  it("returns true for known transient PostgREST codes", () => {
    for (const code of ["502", "503", "504", "57014", "53300", "08006"]) {
      expect(isTransientError({ code })).toBe(true);
    }
  });

  it("returns false for non-transient PostgREST codes (e.g. unique violation)", () => {
    expect(isTransientError({ code: "23505" })).toBe(false);
    expect(isTransientError({ code: "23503" })).toBe(false);
    expect(isTransientError({ code: "42P01" })).toBe(false);
  });

  it("returns true for network-shaped error messages", () => {
    expect(isTransientError({ message: "fetch failed" })).toBe(true);
    expect(isTransientError({ message: "ECONNRESET on socket" })).toBe(true);
    expect(isTransientError({ message: "request ETIMEDOUT" })).toBe(true);
    expect(isTransientError({ message: "getaddrinfo ENOTFOUND api.supabase.co" })).toBe(true);
  });

  it("returns false for null / undefined", () => {
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
  });
});

describe("withRetry", () => {
  it("returns the result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { opName: "test" });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("retries up to maxAttempts on transient errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockRejectedValueOnce({ status: 502 })
      .mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { opName: "test", maxAttempts: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws immediately on non-transient errors (4xx)", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 401, message: "Unauthorized" });
    await expect(withRetry(fn, { opName: "test", maxAttempts: 3 })).rejects.toEqual({
      status: 401,
      message: "Unauthorized",
    });
    expect(fn).toHaveBeenCalledOnce();
  });

  it("throws the last error when retries exhaust", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503, message: "1" })
      .mockRejectedValueOnce({ status: 503, message: "2" })
      .mockRejectedValueOnce({ status: 503, message: "3" });
    await expect(withRetry(fn, { opName: "test", maxAttempts: 3 })).rejects.toEqual({
      status: 503,
      message: "3",
    });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects maxAttempts=1 (no retries)", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 503 });
    await expect(withRetry(fn, { opName: "test", maxAttempts: 1 })).rejects.toEqual({ status: 503 });
    expect(fn).toHaveBeenCalledOnce();
  });

  it("uses exponential backoff (no test on actual sleep, just structural)", async () => {
    const start = Date.now();
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce("ok");
    await withRetry(fn, { opName: "test", maxAttempts: 2, baseDelayMs: 10 });
    const elapsed = Date.now() - start;
    // First delay is baseDelay * 2^0 = 10ms ± 30% jitter → roughly 7-13ms
    expect(elapsed).toBeGreaterThanOrEqual(7);
    expect(elapsed).toBeLessThan(200);
  });

  it("works with thenable query builders (not just Promise)", async () => {
    // Supabase query builders are thenable, not Promise — verify we accept them
    const thenable = {
      then(onFulfilled: (v: string) => unknown, onRejected: (e: unknown) => unknown) {
        return Promise.resolve("ok").then(onFulfilled, onRejected);
      },
    };
    const result = await withRetry(() => thenable);
    expect(result).toBe("ok");
  });
});
