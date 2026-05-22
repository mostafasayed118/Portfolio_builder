let _getToken: (() => Promise<string | null>) | null = null;
let _setPromise: Promise<void> | null = null;
let _resolve: (() => void) | null = null;

// Track when we last saw an expired token to avoid repeated log spam
let _lastExpiredWarn = 0;

// Create a promise that resolves when the getter is set
function ensurePromise() {
  if (!_setPromise) {
    _setPromise = new Promise<void>((r) => { _resolve = r; });
  }
}

ensurePromise();

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  _getToken = getter;
  if (_resolve) {
    _resolve();
    _resolve = null;
  }
}

/** Decode JWT payload without external dependencies. Returns null on failure. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

/** Check if a JWT is expired (with a small buffer for clock skew). */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  // Treat as expired if within 30 seconds of expiry (clock skew buffer)
  return payload.exp * 1000 < Date.now() + 30_000;
}

export async function getClerkToken(): Promise<string | null> {
  // If getter isn't set yet, wait up to 3s for it
  if (!_getToken && _setPromise) {
    await Promise.race([
      _setPromise,
      new Promise<void>((r) => setTimeout(r, 3000)),
    ]);
  }
  if (!_getToken) {
    console.warn("[auth] Clerk token getter not available — API calls will fail with 401");
    return null;
  }
  try {
    const token = await _getToken();
    if (!token) {
      console.warn("[auth] Clerk getToken() returned null — session may not have a JWT configured");
      // Retry once after a short delay (session hydration race condition)
      await new Promise((r) => setTimeout(r, 500));
      const retryToken = await _getToken();
      if (!retryToken) {
        console.warn("[auth] Clerk getToken() returned null on retry — API calls will be unauthenticated");
      }
      return retryToken;
    }

    // Check if token is expired — Clerk sometimes returns stale tokens
    if (isTokenExpired(token)) {
      const now = Date.now();
      if (now - _lastExpiredWarn > 10_000) {
        console.warn("[auth] Clerk token is expired — returning null so API key fallback can be used");
        _lastExpiredWarn = now;
      }
      return null;
    }

    return token;
  } catch (err) {
    console.warn("[auth] Clerk getToken() threw:", err);
    return null;
  }
}
