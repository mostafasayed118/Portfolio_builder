import { getApiUrl } from "./env";

const API_BASE = getApiUrl();
const TOKEN_TTL_MS = 50 * 60 * 1000; // 50 minutes (server cookie TTL is 1 hour)
const FETCH_TIMEOUT_MS = 5000;

let cachedToken: string | null = null;
let cachedAt = 0;

/**
 * Extract the CSRF token from the /csrf-token response body.
 *
 * Accepts the canonical envelope `{ success: true, data: { csrfToken } }`
 * as well as the legacy bare `{ csrfToken }` shape, so a rolling deploy
 * (new frontend against an old server, or vice versa) keeps working.
 * Mirrors artifacts/admin/src/lib/csrf.ts — keep both copies in sync.
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
export async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && Date.now() - cachedAt < TOKEN_TTL_MS) return cachedToken;
  clearCsrfCache();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/v1/csrf-token`, {
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`CSRF fetch failed (${res.status})`);
    const body: unknown = await res.json();
    const token = extractCsrfToken(body);
    if (!token) throw new Error("No CSRF token in response");
    cachedToken = token;
    cachedAt = Date.now();
    return token;
  } catch (err) {
    clearTimeout(timeoutId);
    throw new Error("Unable to establish secure session — please refresh the page", { cause: err });
  }
}

export function clearCsrfCache() {
  cachedToken = null;
  cachedAt = 0;
}
