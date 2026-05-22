import { describe, it, expect, vi, beforeEach } from "vitest";

// The module maintains module-level state, so we re-import for each test suite
// to get fresh state. We use dynamic import with vi.resetModules().

describe("auth-token", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("setAuthTokenGetter", () => {
    it("sets internal getter and resolves waiting promise", async () => {
      const { setAuthTokenGetter, getClerkToken } = await import("./auth-token");

      const getter = vi.fn().mockResolvedValue("my-token");
      setAuthTokenGetter(getter);

      const token = await getClerkToken();
      expect(token).toBe("my-token");
      expect(getter).toHaveBeenCalled();
    });
  });

  describe("getClerkToken", () => {
    it("returns token when getter returns a valid token", async () => {
      const { setAuthTokenGetter, getClerkToken } = await import("./auth-token");

      // Build a JWT that expires far in the future
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ exp: futureExp }));
      const jwt = `header.${payload}.signature`;

      setAuthTokenGetter(vi.fn().mockResolvedValue(jwt));

      const token = await getClerkToken();
      expect(token).toBe(jwt);
    });

    it("returns null when getter returns null (with retry delay)", async () => {
      vi.useFakeTimers();
      const { setAuthTokenGetter, getClerkToken } = await import("./auth-token");

      const getter = vi.fn().mockResolvedValue(null);
      setAuthTokenGetter(getter);

      const promise = getClerkToken();

      // First call returns null, then 500ms retry delay, then second call returns null
      await vi.advanceTimersByTimeAsync(600);
      const token = await promise;

      expect(token).toBeNull();
      expect(getter).toHaveBeenCalledTimes(2);
    });

    it("returns null after 3s timeout when getter is never set", async () => {
      vi.useFakeTimers();
      const { getClerkToken } = await import("./auth-token");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const promise = getClerkToken();

      // Advance past the 3s timeout
      await vi.advanceTimersByTimeAsync(3100);
      const token = await promise;

      expect(token).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Clerk token getter not available")
      );
    });

    it("returns null for expired JWT token (exp < now + 30s)", async () => {
      const { setAuthTokenGetter, getClerkToken } = await import("./auth-token");

      vi.spyOn(console, "warn").mockImplementation(() => {});

      // Token that expires in 10 seconds (within the 30s buffer)
      const exp = Math.floor(Date.now() / 1000) + 10;
      const payload = btoa(JSON.stringify({ exp }));
      const jwt = `header.${payload}.signature`;

      setAuthTokenGetter(vi.fn().mockResolvedValue(jwt));

      const token = await getClerkToken();
      expect(token).toBeNull();
    });

    it("returns null when getter throws", async () => {
      const { setAuthTokenGetter, getClerkToken } = await import("./auth-token");

      vi.spyOn(console, "warn").mockImplementation(() => {});

      setAuthTokenGetter(vi.fn().mockRejectedValue(new Error("Auth failed")));

      const token = await getClerkToken();
      expect(token).toBeNull();
    });

    it("retries once on first null return with 500ms delay", async () => {
      vi.useFakeTimers();
      const { setAuthTokenGetter, getClerkToken } = await import("./auth-token");

      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ exp: futureExp }));
      const jwt = `header.${payload}.signature`;

      // First call returns null, second call returns a valid token
      const getter = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(jwt);
      setAuthTokenGetter(getter);

      const promise = getClerkToken();

      // Advance past the 500ms retry delay
      await vi.advanceTimersByTimeAsync(600);
      const token = await promise;

      expect(token).toBe(jwt);
      expect(getter).toHaveBeenCalledTimes(2);
    });

    it("handles invalid JWT format gracefully", async () => {
      const { setAuthTokenGetter, getClerkToken } = await import("./auth-token");

      vi.spyOn(console, "warn").mockImplementation(() => {});

      // Not a valid JWT (no dots)
      setAuthTokenGetter(vi.fn().mockResolvedValue("not-a-jwt"));

      const token = await getClerkToken();
      // Invalid JWT returns null (no exp, but isTokenExpired returns false for missing exp)
      // Actually isTokenExpired returns false when payload is null or exp is not a number
      // So it should return the token as-is
      expect(token).toBe("not-a-jwt");
    });
  });
});
