/**
 * Shared CSRF token transport for the SPAs (admin + portfolio).
 *
 * Both apps fetch the same `/api/v1/csrf-token` endpoint and must accept the
 * same response envelope(s); only the caching strategy differs per app:
 *  - portfolio caches the token for its 50-minute TTL with a forceRefresh
 *    escape hatch (artifacts/portfolio/src/lib/csrf.ts),
 *  - admin fetches per call (artifacts/admin/src/lib/csrf.ts).
 * This module owns the wire-level part so the two copies cannot drift again.
 */

/** How long to wait for the CSRF endpoint before giving up (ms). */
const FETCH_TIMEOUT_MS = 5000;

/**
 * Extract the CSRF token from the /csrf-token response body.
 *
 * Accepts the canonical envelope `{ success: true, data: { csrfToken } }`
 * as well as the legacy bare `{ csrfToken }` shape, so a rolling deploy
 * (new frontend against an old server, or vice versa) keeps working.
 */
export function extractCsrfToken(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  if ("csrfToken" in body && typeof body.csrfToken === "string") return body.csrfToken;
  if ("data" in body) return extractCsrfToken(body.data);
  return null;
}

/**
 * Fetches a fresh double-submit CSRF token from the API server.
 * Throws when a secure session can't be established (network / non-200 /
 * missing token) so callers can surface a clear "refresh the page" error.
 */
export async function fetchCsrfToken(apiBase: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${apiBase}/api/v1/csrf-token`, {
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`CSRF fetch failed (${res.status})`);
    const body: unknown = await res.json();
    const token = extractCsrfToken(body);
    if (!token) throw new Error("No CSRF token in response");
    return token;
  } catch (err) {
    clearTimeout(timeoutId);
    throw new Error("Unable to establish secure session — please refresh the page", { cause: err });
  }
}
