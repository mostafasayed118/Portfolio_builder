/**
 * orval custom fetch mutator.
 *
 * The generated client functions call `customFetch<T>(url, options)` and
 * return the raw response body — which, for the Portfolio-Fixer API, is the
 * `{ success: true, data } | { success: false, message }` envelope union.
 * Failures are therefore reported as `{ success: false, message }` rather
 * than by throwing, matching the admin app's existing `ApiResult<T>` shape.
 *
 * Transport concerns (origin, auth token, CSRF, 401 auto-refresh, auth-missing
 * handling, navigation abort) are injected at runtime via the `setXxx`
 * functions below so this package stays free of any app-specific (Clerk)
 * dependencies.
 */

export type AuthTokenGetter = (forceRefresh?: boolean) => Promise<string | null>;
export type CsrfTokenGetter = () => Promise<string>;
export type AuthMissingHandler = () => void;

/** orval's error/body helper types (kept for generated-code compatibility). */
// The generated client instantiates `ErrorType<...>` even though the
// envelope shape does not depend on T.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ErrorType<T = unknown> = { success: false; message: string };
export type BodyType<T> = T;

const AUTHORIZATION_HEADER = "Authorization";
const CSRF_HEADER = "x-csrf-token";
const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_401_RETRIES = 1;
const AUTH_MISSING_MESSAGE = "Authentication required — please sign in again.";

let _baseUrl: string | null = null;
let _authTokenGetter: AuthTokenGetter | null = null;
let _csrfTokenGetter: CsrfTokenGetter | null = null;
let _authMissingHandler: AuthMissingHandler | null = null;
let _activeController: AbortController | null = null;

/** Prepend an origin to every relative request URL (e.g. `http://localhost:3001`). */
export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

/** Register a bearer-token supplier (accepts `forceRefresh` for 401 retries). */
export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  _authTokenGetter = getter;
}

/** Register a CSRF double-submit token supplier for state-changing admin requests. */
export function setCsrfTokenGetter(getter: CsrfTokenGetter | null): void {
  _csrfTokenGetter = getter;
}

/** Register the handler invoked when auth is required but genuinely missing. */
export function setAuthMissingHandler(handler: AuthMissingHandler | null): void {
  _authMissingHandler = handler;
}

/** Begin a request group — aborts any in-flight group first. */
export function beginRequestGroup(): void {
  if (_activeController) _activeController.abort();
  _activeController = new AbortController();
}

/** Abort all in-flight requests (navigation cleanup). */
export function abortAllRequests(): void {
  _activeController?.abort();
  _activeController = null;
}

export type CustomFetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  responseType?: string;
};

type ApiError = { success: false; message: string };

function isAdminUrl(url: string): boolean {
  return url.includes("/admin/");
}

async function parseErrorBody(res: Response): Promise<string> {
  let message = `Request failed (${res.status})`;
  try {
    const errData = (await res.json()) as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    if (errData?.message) {
      message = errData.message;
    } else if (errData?.errors) {
      const fieldErrors = Object.entries(errData.errors)
        .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
        .join("; ");
      message = fieldErrors || message;
    }
  } catch {
    // response body wasn't JSON — keep the status-based message
  }
  return message;
}

async function parseSuccessBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.blob();
}

async function doFetch<T>(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
  isAdmin: boolean,
  retryCount = 0,
  signal?: AbortSignal,
): Promise<T> {
  let timedOut = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    // Abort when the app navigates away mid-request.
    const navSignal = _activeController?.signal;
    const onNavAbort = () => controller.abort();
    if (navSignal) navSignal.addEventListener("abort", onNavAbort, { once: true });

    // Abort when the caller (e.g. react-query) cancels via signal.
    const onExternalAbort = () => controller.abort();
    if (signal) signal.addEventListener("abort", onExternalAbort, { once: true });

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body == null ? undefined : (body as BodyInit),
        credentials: "include",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
      if (navSignal) navSignal.removeEventListener("abort", onNavAbort);
      if (signal) signal.removeEventListener("abort", onExternalAbort);
    }

    if (!res.ok) {
      const message = await parseErrorBody(res);

      // ── 401 auto-refresh (max 1 retry) ──────────────────────────────
      if (isAdmin && res.status === 401 && retryCount < MAX_401_RETRIES) {
        const refreshedToken = (await _authTokenGetter?.(true)) ?? null;
        if (refreshedToken) {
          return doFetch<T>(
            url,
            method,
            { ...headers, [AUTHORIZATION_HEADER]: `Bearer ${refreshedToken}` },
            body,
            isAdmin,
            retryCount + 1,
            signal,
          );
        }
        return { success: false, message: AUTH_MISSING_MESSAGE } as T;
      }

      if (isAdmin && res.status === 401) {
        _authMissingHandler?.();
      }

      return { success: false, message } as T;
    }

    return (await parseSuccessBody(res)) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    if (message.includes("aborted")) {
      return (timedOut
        ? { success: false, message: "Request timed out" }
        : { success: false, message: "Request cancelled" }) as T;
    }
    return { success: false, message } as T;
  }
}

export async function customFetch<T = unknown>(
  url: string,
  options: CustomFetchOptions = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const isAdmin = isAdminUrl(url);
  const headers: Record<string, string> = { ...(options.headers ?? {}) };

  if (isAdmin) {
    const token = (await _authTokenGetter?.()) ?? null;
    if (!token) {
      return { success: false, message: AUTH_MISSING_MESSAGE } as T;
    }
    headers[AUTHORIZATION_HEADER] = `Bearer ${token}`;
  }

  if (isAdmin && STATE_CHANGING.has(method) && _csrfTokenGetter) {
    headers[CSRF_HEADER] = await _csrfTokenGetter();
  }

  const fullUrl = _baseUrl ? `${_baseUrl}${url}` : url;

  return doFetch<T>(fullUrl, method, headers, options.body, isAdmin, 0, options.signal);
}

export type { ApiError };
