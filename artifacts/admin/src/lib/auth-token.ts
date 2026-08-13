import { logError, logWarn, logInfo, logDebug } from "@workspace/logging";

let _getToken: ((forceRefresh?: boolean) => Promise<string | null>) | null = null;
let _setPromise: Promise<void> | null = null;
let _resolve: (() => void) | null = null;

// ── Missing-auth callback ────────────────────────────────────────────────────
let _onAuthMissing: (() => void) | null = null;
let _lastAuthMissingFire = 0;
const AUTH_MISSING_DEBOUNCE_MS = 1_000;

// ── Auth-ready gate ─────────────────────────────────────────────────────────
let _authReady = false;

export function setAuthReady(ready: boolean): void {
  if (_authReady === ready) return;
  const was = _authReady;
  _authReady = ready;
  if (import.meta.env.DEV) {
    logInfo(
      `[auth-token] setAuthReady(${ready}) — was=${was}. ` +
        (ready
          ? "Auth-missing handler is now ARMED (will sign out on next null token)."
          : "Auth-missing handler is now DISARMED (null tokens will be silently ignored)."),
      "auth-token",
    );
  }
}

export function isAuthReady(): boolean {
  return _authReady;
}

export function setAuthMissingHandler(handler: (() => void) | null): void {
  _onAuthMissing = handler;
  if (import.meta.env.DEV) {
    logInfo(
      `[auth-token] setAuthMissingHandler(${handler ? "registered" : "cleared"})`,
      "auth-token",
    );
  }
}

export function fireAuthMissingFromApiClient(): void {
  fireAuthMissing("server_returned_401");
}

const AUTH_MISSING_KILL_SWITCH = false;

function fireAuthMissing(reason: string): void {
  if (import.meta.env.DEV) {
    logInfo(
      `[auth-token] fireAuthMissing(reason="${reason}") — authReady=${_authReady}, handlerSet=${!!_onAuthMissing}, killSwitch=${AUTH_MISSING_KILL_SWITCH}`,
      "auth-token",
    );
  }

  if (!_authReady) {
    if (import.meta.env.DEV) {
      logDebug(
        `[auth-token] fireAuthMissing(reason="${reason}") — SUPPRESSED (auth not ready)`,
        "auth-token",
      );
    }
    return;
  }

  if (AUTH_MISSING_KILL_SWITCH) {
    if (import.meta.env.DEV) {
      logWarn(
        `[auth-token] fireAuthMissing(reason="${reason}") — KILLED by kill switch`,
        "auth-token",
        { reason, authReady: _authReady },
      );
    }
    return;
  }

  const now = Date.now();
  if (now - _lastAuthMissingFire < AUTH_MISSING_DEBOUNCE_MS) {
    if (import.meta.env.DEV) {
      logDebug(
        `[auth-token] fireAuthMissing(reason="${reason}") — DEBOUNCED (last fire was ${now - _lastAuthMissingFire}ms ago)`,
        "auth-token",
      );
    }
    return;
  }
  _lastAuthMissingFire = now;
  if (import.meta.env.DEV) {
    logError(
      `[auth-token] fireAuthMissing(reason="${reason}") — FIRING handler. This causes sign-out + redirect to /sign-in.`,
      new Error("auth_missing"),
      "auth-token",
      { reason },
    );
  }
  try {
    _onAuthMissing?.();
  } catch {
    if (import.meta.env.DEV) logWarn("[auth-token] onAuthMissing handler threw — swallowing (best-effort)", "auth-token");
  }
}

// Create a promise that resolves when the getter is set
function ensurePromise() {
  if (!_setPromise) {
    _setPromise = new Promise<void>((r) => { _resolve = r; });
  }
}

ensurePromise();

export function setAuthTokenGetter(getter: (forceRefresh?: boolean) => Promise<string | null>) {
  const wasUnset = !_getToken;
  _getToken = getter;
  if (import.meta.env.DEV) {
    logInfo(
      `[auth-token] setAuthTokenGetter(${wasUnset ? "first registration" : "re-registration"})`,
      "auth-token",
    );
  }
  if (_resolve) {
    _resolve();
    _resolve = null;
  }
}

export function _resetAuthTokenGetter(): void {
  _getToken = null;
  _setPromise = null;
  _resolve = null;
  _onAuthMissing = null;
  _lastAuthMissingFire = 0;
  _authReady = false;
  _setPromise = new Promise<void>((r) => { _resolve = r; });
}

/**
 * Decode JWT payload (base64url) and check expiration.
 * Returns true if the token is structurally valid AND its `exp` claim
 * (Unix seconds) is still in the future (with a 30-second buffer for
 * clock skew and in-flight retries).
 *
 * Returns true (assume valid) when:
 *   - The token is not a standard 3-part JWT
 *   - The payload is not decodable JSON
 *   - The payload has no `exp` claim
 *   - The token is safely in the future
 *
 * Returns false (expired) when:
 *   - The `exp` claim is <= now + 30s
 *   - Decoding fails with an exception
 */
export function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false; // Not a JWT — let shape check handle it

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );

    if (!payload || typeof payload.exp !== "number") return false; // No exp — assume valid

    const now = Math.floor(Date.now() / 1000);
    const BUFFER_SECONDS = 30;

    return payload.exp <= now + BUFFER_SECONDS;
  } catch {
    // Decoding failed — treat as "not expired" rather than
    // blocking a potentially valid token. The server will catch
    // truly malformed tokens.
    return false;
  }
}

/**
 * Defensive shape check on a token string.
 *
 * Checks:
 *   - Non-null string
 *   - Non-empty, non-whitespace
 *   - Length between 16 and 8192
 *   - No embedded whitespace
 *   - JWT expiration: token's `exp` claim is in the future (with 30s buffer)
 *
 * The expiration check was added after the server logs showed expired
 * JWTs (59 minutes after login — Clerk's default) being sent to the
 * backend without detection. The client must detect expiration so the
 * auth-missing handler fires BEFORE the 401 arrives, enabling a
 * proactive redirect to /sign-in instead of a failed API call.
 */
export function isTokenLikelyValid(token: string | null | undefined): token is string {
  if (typeof token !== "string") return false;
  const trimmed = token.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length < 16) return false;
  if (trimmed.length > 8192) return false;
  if (/\s/.test(trimmed)) return false;

  // JWT expiration check (30-second buffer before actual expiry)
  if (isJwtExpired(trimmed)) {
    if (import.meta.env.DEV) {
      logWarn(
        "[auth-token] isTokenLikelyValid — token JWT is expired or expiring within 30s. " +
          "The server WILL reject this with 401. The auth-missing handler will fire.",
        "auth-token",
        { tokenPrefix: trimmed.slice(0, 12) },
      );
    }
    return false;
  }

  return true;
}

export async function getClerkToken(forceRefresh = false): Promise<string | null> {
  if (import.meta.env.DEV) {
    logDebug(
      `[auth-token] getClerkToken(forceRefresh=${forceRefresh}) — getterSet=${!!_getToken}, authReady=${_authReady}, promiseSet=${!!_setPromise}`,
      "auth-token",
    );
  }

  // If getter isn't set yet, wait up to 750ms for it
  if (!_getToken && _setPromise) {
    await Promise.race([
      _setPromise,
      new Promise<void>((r) => setTimeout(r, 750)),
    ]);
  }
  if (!_getToken) {
    if (import.meta.env.DEV) {
      logWarn(
        "[auth-token] Clerk token getter not available yet — setAuthTokenGetter() hasn't fired.",
        "auth-token",
      );
    }
    fireAuthMissing("getter_not_set");
    return null;
  }
  try {
    const token = await _getToken(forceRefresh);
    if (import.meta.env.DEV) {
      const preview = token ? `${token.slice(0, 12)}…(${token.length})` : "null";
      logDebug(`[auth-token] _getToken(forceRefresh=${forceRefresh}) returned: ${preview}`, "auth-token");
    }
    if (!token) {
      if (import.meta.env.DEV) {
        logWarn(
          "[auth-token] Clerk getToken() returned null — session may not be signed in, or no JWT template is configured.",
          "auth-token",
        );
      }
      // Retry once after a short delay (session hydration race condition)
      await new Promise((r) => setTimeout(r, 250));
      const retryToken = await _getToken();
      if (import.meta.env.DEV) {
        const preview = retryToken ? `${retryToken.slice(0, 12)}…(${retryToken.length})` : "null";
        logDebug(`[auth-token] _getToken() retry returned: ${preview}`, "auth-token");
      }
      if (!retryToken) {
        fireAuthMissing("getter_returned_null");
      }
      return retryToken;
    }

    const observedLength = token.length;
    if (!isTokenLikelyValid(token)) {
      fireAuthMissing("token_invalid");
      if (import.meta.env.DEV) {
        logError(
          "[auth-token] Clerk getToken() returned a token that failed validation. Refusing to attach to request.",
          new Error("token_invalid"),
          "auth-token",
          { length: observedLength },
        );
      }
      return null;
    }

    if (import.meta.env.DEV) {
      logDebug(`[auth-token] Returning valid token (length=${token.length})`, "auth-token");
    }
    return token;
  } catch {
    if (import.meta.env.DEV) {
      logWarn("[auth-token] Clerk getToken() threw — auth-missing handler will be notified.", "auth-token");
    }
    fireAuthMissing("getter_threw");
    return null;
  }
}
