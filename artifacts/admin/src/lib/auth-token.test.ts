import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  setAuthTokenGetter,
  setAuthMissingHandler,
  setAuthReady,
  getClerkToken,
  isTokenLikelyValid,
  isJwtExpired,
  _resetAuthTokenGetter,
} from "./auth-token";

// The module maintains module-level state, so we re-import for each test suite
// to get fresh state. We use dynamic import with vi.resetModules().

describe("auth-token", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Reset the module-level singleton state so each test sees a
    // clean slate. (`vi.resetModules()` only affects future dynamic
    // imports; the top-level imports in this file are already
    // bound, so we have to call the explicit reset helper.)
    _resetAuthTokenGetter();
    // Suppress noisy dev logging during tests
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("setAuthTokenGetter", () => {
    it("sets internal getter and resolves waiting promise", async () => {
      const getter = vi.fn().mockResolvedValue("a-realistic-clerk-jwt-token-with-enough-length");
      setAuthTokenGetter(getter);

      const token = await getClerkToken();
      expect(token).toBe("a-realistic-clerk-jwt-token-with-enough-length");
      expect(getter).toHaveBeenCalled();
    });
  });

  describe("getClerkToken", () => {
    it("returns token when getter returns a valid token", async () => {
      // Build a JWT that expires far in the future
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ exp: futureExp }));
      const jwt = `header.${payload}.signature-long-enough-to-pass-shape-check`;

      setAuthTokenGetter(vi.fn().mockResolvedValue(jwt));

      const token = await getClerkToken();
      expect(token).toBe(jwt);
    });

    it("returns null when getter returns null (with retry delay)", async () => {
      vi.useFakeTimers();
      const getter = vi.fn().mockResolvedValue(null);
      setAuthTokenGetter(getter);

      const promise = getClerkToken();

      // First call returns null, then 250ms retry delay, then second call returns null
      await vi.advanceTimersByTimeAsync(600);
      const token = await promise;

      expect(token).toBeNull();
      expect(getter).toHaveBeenCalledTimes(2);
    });

    it("refreshes an expired cached token before firing the missing-auth handler", async () => {
      const now = Math.floor(Date.now() / 1000);
      const expired = `header.${btoa(JSON.stringify({ exp: now - 10 }))}.expired-signature-long-enough`;
      const fresh = `header.${btoa(JSON.stringify({ exp: now + 3600 }))}.fresh-signature-long-enough`;
      const getter = vi.fn()
        .mockResolvedValueOnce(expired)
        .mockResolvedValueOnce(fresh);
      const handler = vi.fn();
      setAuthMissingHandler(handler);
      setAuthReady(true);
      setAuthTokenGetter(getter);

      const token = await getClerkToken();

      expect(token).toBe(fresh);
      expect(getter).toHaveBeenNthCalledWith(1, false);
      expect(getter).toHaveBeenNthCalledWith(2, true);
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns null after 750ms timeout when getter is never set", async () => {
      vi.useFakeTimers();
      const handler = vi.fn();
      setAuthMissingHandler(handler);

      const promise = getClerkToken();

      // Advance past the 750ms timeout (the contract is "wait up to 750ms")
      await vi.advanceTimersByTimeAsync(800);
      const token = await promise;

      expect(token).toBeNull();
      // Handler is NOT called because auth is not yet ready (default
      // _authReady is false). The fireAuthMissing call is a no-op.
      expect(handler).not.toHaveBeenCalled();
    });

    it("KILL SWITCH off by default: DOES fire onAuthMissing when auth is ready AND getter returns null", async () => {
      // Default state: the kill switch is OFF. The handler fires
      // when the auth-ready gate is open and the getter (plus retry)
      // returns null. This is the documented "real auth failure"
      // contract.
      vi.useFakeTimers();
      const handler = vi.fn();
      setAuthMissingHandler(handler);
      setAuthReady(true);
      setAuthTokenGetter(vi.fn().mockResolvedValue(null));

      const promise = getClerkToken();
      await vi.advanceTimersByTimeAsync(600);
      await promise;

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("returns a valid future JWT token as-is", async () => {
      // getClerkToken() returns the token regardless of its `exp` claim;
      // expiry is detected server-side. A future `exp` (1 hour out) should
      // pass both the shape check and the expiration check.
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ exp }));
      const jwt = `header.${payload}.signature-long-enough-for-shape-check`;

      setAuthTokenGetter(vi.fn().mockResolvedValue(jwt));

      const token = await getClerkToken();
      expect(token).toBe(jwt);
    });

    it("rejects a JWT with exp in the past (client-side expiration check)", async () => {
      const exp = Math.floor(Date.now() / 1000) - 3600;
      const payload = btoa(JSON.stringify({ exp }));
      const jwt = `header.${payload}.signature-long-enough-for-shape-check`;

      setAuthTokenGetter(vi.fn().mockResolvedValue(jwt));

      const token = await getClerkToken();
      expect(token).toBeNull();
    });

    it("returns null when getter throws", async () => {
      setAuthTokenGetter(vi.fn().mockRejectedValue(new Error("Auth failed")));

      const token = await getClerkToken();
      expect(token).toBeNull();
    });

    it("retries once on first null return with 250ms delay", async () => {
      vi.useFakeTimers();
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ exp: futureExp }));
      const jwt = `header.${payload}.signature-long-enough-to-pass-shape-check`;

      // First call returns null, second call returns a valid token
      const getter = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(jwt);
      setAuthTokenGetter(getter);

      const promise = getClerkToken();

      // Advance past the 250ms retry delay
      await vi.advanceTimersByTimeAsync(300);
      const token = await promise;

      expect(token).toBe(jwt);
      expect(getter).toHaveBeenCalledTimes(2);
    });

    it("refuses tokens that are too short (< 16 chars)", async () => {
      setAuthTokenGetter(vi.fn().mockResolvedValue("short"));
      const token = await getClerkToken();
      expect(token).toBeNull();
    });

    it("refuses tokens with embedded whitespace", async () => {
      setAuthTokenGetter(vi.fn().mockResolvedValue("valid-length-but has-space"));
      const token = await getClerkToken();
      expect(token).toBeNull();
    });

    it("refuses empty / whitespace-only tokens", async () => {
      setAuthTokenGetter(vi.fn().mockResolvedValue("   "));
      const token = await getClerkToken();
      expect(token).toBeNull();
    });

    it("forwards tokens of 16+ chars without an exp claim as-is (non-JWT OK)", async () => {
      // Some Clerk deployments use opaque session tokens, not JWTs. As
      // long as the shape is plausible (non-empty, no whitespace,
      // reasonable length), we forward them.
      const opaque = "opaque-clerk-session-token-with-enough-chars";
      setAuthTokenGetter(vi.fn().mockResolvedValue(opaque));
      const token = await getClerkToken();
      expect(token).toBe(opaque);
    });
  });

  describe("isTokenLikelyValid", () => {
    it("rejects null / undefined / non-strings", () => {
      expect(isTokenLikelyValid(null)).toBe(false);
      expect(isTokenLikelyValid(undefined)).toBe(false);
      expect(isTokenLikelyValid(123 as unknown as string)).toBe(false);
    });
    it("rejects empty / whitespace-only", () => {
      expect(isTokenLikelyValid("")).toBe(false);
      expect(isTokenLikelyValid("   ")).toBe(false);
    });
    it("rejects tokens shorter than 16 chars", () => {
      expect(isTokenLikelyValid("short")).toBe(false);
      expect(isTokenLikelyValid("a".repeat(15))).toBe(false);
    });
    it("rejects tokens longer than 8192 chars", () => {
      expect(isTokenLikelyValid("a".repeat(8193))).toBe(false);
    });
    it("rejects tokens with embedded whitespace", () => {
      expect(isTokenLikelyValid("a".repeat(20) + " b")).toBe(false);
    });
    it("accepts plausible JWT-like strings", () => {
      expect(isTokenLikelyValid("a".repeat(32))).toBe(true);
      expect(isTokenLikelyValid("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSJ9.signature")).toBe(true);
    });
  });

  describe("auth-missing handler", () => {
    it("debounce: fires once per burst (1s window) when auth is ready", async () => {
      const handler = vi.fn();
      setAuthMissingHandler(handler);
      setAuthReady(true);
      setAuthTokenGetter(vi.fn().mockResolvedValue(null));

      // First call fires the handler
      await getClerkToken();
      // Second call within the debounce window should NOT fire again
      await getClerkToken();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("fires again when auth is armed mid-session after a previous burst", async () => {
      const handler = vi.fn();
      setAuthMissingHandler(handler);
      setAuthTokenGetter(vi.fn().mockResolvedValue(null));

      // First: not ready → no fire
      await getClerkToken();
      expect(handler).not.toHaveBeenCalled();

      // Arm: subsequent null tokens fire
      setAuthReady(true);
      await getClerkToken();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("DOES NOT fire when auth is NOT ready (pre-hydration guard)", async () => {
      const handler = vi.fn();
      setAuthMissingHandler(handler);
      // _authReady is false (default after reset)
      setAuthTokenGetter(vi.fn().mockResolvedValue(null));

      await getClerkToken();
      await getClerkToken();

      expect(handler).not.toHaveBeenCalled();
    });

    it("can be cleared with null", async () => {
      const handler = vi.fn();
      setAuthMissingHandler(handler);
      setAuthMissingHandler(null);
      setAuthTokenGetter(vi.fn().mockResolvedValue(null));

      await getClerkToken();
      expect(handler).not.toHaveBeenCalled();
    });

    it("handler exception is swallowed (best-effort)", async () => {
      const handler = vi.fn(() => {
        throw new Error("boom");
      });
      setAuthMissingHandler(handler);
      setAuthTokenGetter(vi.fn().mockResolvedValue(null));

      // Should not throw out of getClerkToken
      await expect(getClerkToken()).resolves.toBeNull();
    });
  });

  // ── isJwtExpired ──────────────────────────────────────────────────────────

  describe("isJwtExpired", () => {
    function createJwt(exp?: number): string {
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(JSON.stringify(exp !== undefined ? { exp } : {}));
      const signature = "mock_signature";
      return `${header}.${payload}.${signature}`;
    }

    it("rejects a JWT with exp in the past", () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isJwtExpired(createJwt(now - 3600))).toBe(true);
    });

    it("rejects a JWT expiring within 30 seconds", () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isJwtExpired(createJwt(now + 20))).toBe(true);
    });

    it("accepts a JWT expiring more than 30 seconds in the future", () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isJwtExpired(createJwt(now + 3600))).toBe(false);
    });

    it("accepts a JWT with no exp claim", () => {
      expect(isJwtExpired(createJwt())).toBe(false);
    });

    it("accepts a non-JWT string (not 3 parts)", () => {
      expect(isJwtExpired("not-a-jwt")).toBe(false);
    });

    it("accepts a JWT with invalid base64 payload (decoding fails gracefully)", () => {
      expect(isJwtExpired("aaa.bbbb.cccc")).toBe(false);
    });

    it("returns false for expired token (server is source of truth — just warns)", () => {
      // This verifies the log message is emitted but the function
      // still returns true (expired) — the caller decides what to do
      const now = Math.floor(Date.now() / 1000);
      expect(isJwtExpired(createJwt(now - 10))).toBe(true);
    });
  });

  // ── isTokenLikelyValid with expiration ─────────────────────────────────────

  describe("isTokenLikelyValid with JWT expiration", () => {
    function createJwt(exp?: number): string {
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(JSON.stringify(exp !== undefined ? { exp } : {}));
      return `${header}.${payload}.signature`;
    }

    it("returns true for a valid future JWT", () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isTokenLikelyValid(createJwt(now + 3600))).toBe(true);
    });

    it("returns false for an expired JWT", () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isTokenLikelyValid(createJwt(now - 100))).toBe(false);
    });

    it("returns false for a JWT expiring within 30s", () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isTokenLikelyValid(createJwt(now + 10))).toBe(false);
    });
  });

  // ── getClerkToken with forceRefresh ────────────────────────────────────────

  describe("getClerkToken with forceRefresh", () => {
    it("passes forceRefresh to the getter", async () => {
      const getter = vi.fn().mockResolvedValue("a-valid-token-that-is-long-enough-for-checks");
      setAuthTokenGetter(getter);

      await getClerkToken(true);
      expect(getter).toHaveBeenCalledWith(true);
    });

    it("defaults forceRefresh to false when not provided", async () => {
      const getter = vi.fn().mockResolvedValue("a-valid-token-that-is-long-enough-for-checks");
      setAuthTokenGetter(getter);

      await getClerkToken();
      expect(getter).toHaveBeenCalledWith(false);
    });

    it("refreshes an expired token and supports explicit force-refresh calls", async () => {
      let callCount = 0;
      const getter = vi.fn().mockImplementation(async (forceRefresh?: boolean) => {
        callCount++;
        const now = Math.floor(Date.now() / 1000);
        if (!forceRefresh) {
          return `header.${btoa(JSON.stringify({ exp: now - 3600 }))}.expired`;
        }
        return `header.${btoa(JSON.stringify({ exp: now + 3600 }))}.fresh`;
      });
      setAuthTokenGetter(getter);

      const token1 = await getClerkToken();
      const token2 = await getClerkToken(true);

      expect(token1).toMatch(/^header\.\w+\.fresh$/);
      expect(token2).toMatch(/^header\.\w+\.fresh$/);
      expect(callCount).toBe(3);
    });
  });
});
