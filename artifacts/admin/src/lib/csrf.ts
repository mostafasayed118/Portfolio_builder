import { getApiUrl } from "./env";

const apiBase = getApiUrl();

/**
 * Extract the CSRF token from the /csrf-token response body.
 *
 * Accepts the canonical envelope `{ success: true, data: { csrfToken } }`
 * as well as the legacy bare `{ csrfToken }` shape, so a rolling deploy
 * (new admin against an old server, or vice versa) keeps working.
 */
function extractCsrfToken(body: unknown): string | null {
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
    const body: unknown = await res.json();
    // Accept the canonical envelope `{ success: true, data: { csrfToken } }`
    // as well as the legacy bare `{ csrfToken }` shape, so a rolling deploy
    // (new admin against an old server, or vice versa) keeps working.
    const token = extractCsrfToken(body);
    if (!token) throw new Error("No CSRF token in response");
    return token;
  } catch (err) {
    clearTimeout(timeoutId);
    throw new Error("Unable to establish secure session — please refresh the page", { cause: err });
  }
}
