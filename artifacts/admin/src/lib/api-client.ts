import type { User } from "@workspace/supabase/types";
import { logDebug, logInfo, logError } from "@workspace/logging";
import { getClerkToken, isTokenLikelyValid } from "./auth-token";
import { getApiUrl } from "./env";

export type { User };

// Re-export the API resource definitions so consumers can import
// `api` from a single location without breaking existing imports.
export { api } from "./api-resources";

const apiBase = getApiUrl();

/**
 * Canonical Authorization header name. HTTP headers are technically
 * case-insensitive, but the backend's `adminAuth.ts` reads the header
 * with a specific casing, and many proxies / loggers are case-sensitive
 * in their output. Keeping the name as a single source of truth here
 * prevents the kind of "looks correct in DevTools but rejected by the
 * server" drift that motivated this whole fix.
 */
const AUTHORIZATION_HEADER = "Authorization" as const;
const CSRF_HEADER = "x-csrf-token" as const;

/** Wire-level failure marker returned when auth is required but missing. */
const AUTH_MISSING_MESSAGE = "Authentication required — please sign in again.";

/**
 * Per-navigation AbortController. When the admin SPA navigates to a
 * different route, `abortAllRequests()` is invoked from
 * `usePrefetchRoutes` so any in-flight mutation is cancelled.
 *
 * Without this, the user clicks "Save", navigates away mid-flight,
 * and React fires `setState` on an unmounted component (or worse,
 * the mutation completes and clobbers state the user just edited on
 * a different page).
 */
let _activeController: AbortController | null = null;

function getActiveSignal(): AbortSignal | undefined {
  return _activeController?.signal;
}

export function beginRequestGroup(): void {
  // Abort any in-flight group first
  if (_activeController) _activeController.abort();
  _activeController = new AbortController();
}

export function abortAllRequests(): void {
  _activeController?.abort();
  _activeController = null;
}

export async function getCsrfToken(): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${apiBase}/api/v1/csrf-token`, {
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`CSRF fetch failed (${res.status})`);
    const data = await res.json();
    if (!data.csrfToken) throw new Error("No CSRF token in response");
    return data.csrfToken;
  } catch (err) {
    clearTimeout(timeoutId);
    throw new Error("Unable to establish secure session — please refresh the page", { cause: err });
  }
}

type ApiResult<T> =
  | { success: true; data?: T; count?: number }
  | { success: false; message: string };

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Internal shared request implementation. The only behavioural
 * difference between `request()` and `publicRequest()` is the URL
 * prefix (`/api/v1/admin` vs `/api/v1`); everything else — header
 * construction, CSRF, abort timeout, error normalisation, debug
 * logging — is identical and lives here.
 *
 * Auth contract (per the strict spec):
 *  - When `withAuth` is true, we MUST have a valid Bearer token before
 *    we send a single byte over the wire. If `getClerkToken()` returns
 *    null/empty/malformed, we short-circuit with `{ success: false,
 *    message: AUTH_MISSING_MESSAGE }` and notify the auth layer
 *    (via the registered handler in `auth-token.ts`) so it can sign
 *    the user out and redirect to `/sign-in`. We never send a request
 *    the server is guaranteed to 401.
 *  - The header is built with `Authorization` (capital A) via the
 *    `AUTHORIZATION_HEADER` constant. Any future change to header
 *    casing must go through that constant.
 *  - The token is also `isTokenLikelyValid()`-checked at construction
 *    time, so a stray whitespace-only or empty string never leaks
 *    into the header object.
 */
/**
 * Maximum number of 401 retry attempts per request. After the first
 * 401, we force-refresh the Clerk token (bypassing the JWT cache)
 * and retry once. A second 401 means the session is genuinely dead.
 */
const MAX_401_RETRIES = 1;

async function doFetch<T>(
  url: string,
  method: string,
  body: unknown,
  withAuth: boolean,
  retryCount = 0,
): Promise<ApiResult<T>> {
  // Fail fast with a clear message instead of issuing a relative fetch that
  // would 404 when VITE_API_URL is missing in a production build.
  if (!apiBase && !import.meta.env.DEV) {
    return { success: false, message: "API server URL not configured — set VITE_API_URL" };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (withAuth) {
    const clerkToken = await getClerkToken();
    if (!isTokenLikelyValid(clerkToken)) {
      if (import.meta.env.DEV) {
        logError(
          "[api-client] ABORTING request — no usable Clerk token.",
          new Error("auth_missing"),
          "api-client",
          { method, url, withAuth, retryCount },
        );
      }
      return { success: false, message: AUTH_MISSING_MESSAGE };
    }
    headers[AUTHORIZATION_HEADER] = `Bearer ${clerkToken}`;
    if (import.meta.env.DEV) {
      logInfo(
        `[api-client] Attaching Authorization header (token length=${clerkToken.length}) for ${method} ${url}`,
        "api-client",
      );
    }
  }

  if (STATE_CHANGING.has(method)) {
    const csrfToken = await getCsrfToken();
    headers[CSRF_HEADER] = csrfToken;
  }

  let timedOut = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    // Link the per-navigation signal so navigation aborts in-flight requests
    const navSignal = getActiveSignal();
    const onAbort = () => controller.abort();
    if (navSignal) {
      navSignal.addEventListener("abort", onAbort, { once: true });
    }

    if (import.meta.env.DEV) {
      const hasAuth = Boolean(headers[AUTHORIZATION_HEADER]);
      logDebug(
        `[api-client] ${withAuth ? "request" : "publicRequest"} — method=${method}, url=${url}, hasAuth=${hasAuth}, hasCsrf=${Boolean(headers[CSRF_HEADER])}, retryCount=${retryCount}`,
        "api-client",
      );
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
      if (navSignal) {
        navSignal.removeEventListener("abort", onAbort);
      }
    }

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const errData = await res.json();
        if (errData.message) message = errData.message;
        else if (errData.errors && withAuth) {
          const fieldErrors = Object.entries(errData.errors)
            .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
            .join("; ");
          message = fieldErrors || message;
        }
      } catch { /* response wasn't JSON */ }

      // ── 401 auto-refresh (max 1 retry) ────────────────────────────────
      // The server returned 401 for an authenticated request. This is
      // the AUTHORITATIVE signal that the JWT has expired or is
      // otherwise rejected. Rather than immediately signing the user
      // out, we attempt to force-refresh the Clerk token (which
      // bypasses the JWT cache) and retry the request once. If the
      // retry also fails, THEN we fire the auth-missing handler.
      if (withAuth && res.status === 401 && retryCount < MAX_401_RETRIES) {
        if (import.meta.env.DEV) {
          logInfo(
            `[api-client] Server returned 401 (attempt ${retryCount + 1}/${MAX_401_RETRIES + 1}) — ` +
              `force-refreshing token and retrying.`,
            "api-client",
            { method, url },
          );
        }
        // Force Clerk to issue a fresh token (bypassing any in-memory
        // cache that might still hold the stale/expired one).
        await getClerkToken(true);
        return doFetch<T>(url, method, body, withAuth, retryCount + 1);
      }

      // ── Auth failure (all retries exhausted) ─────────────────────────
      if (withAuth && res.status === 401) {
        if (import.meta.env.DEV) {
          logError(
            "[api-client] Server returned 401 after refresh attempt — " +
              "token is genuinely expired. Firing auth-missing handler.",
            new Error("server_401_after_refresh"),
            "api-client",
            { method, url, retryCount },
          );
        }
        void import("./auth-token").then(({ fireAuthMissingFromApiClient }) => {
          fireAuthMissingFromApiClient();
        });
      }
      return { success: false, message };
    }
    return await res.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    if (message.includes("aborted")) {
      // Distinguish the request timeout from a navigation-triggered cancel
      // (beginRequestGroup / abortAllRequests). Only the former is an error.
      return timedOut
        ? { success: false, message: "Request timed out" }
        : { success: false, message: "Request cancelled" };
    }
    return { success: false, message };
  }
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  return doFetch<T>(`${apiBase}/api/v1/admin${path}`, method, body, true);
}

export async function publicRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  return doFetch<T>(`${apiBase}/api/v1${path}`, method, body, false);
}

export interface CvSettings {
  objectPath: string | null;
  fileName: string | null;
  updatedAt: string;
}
