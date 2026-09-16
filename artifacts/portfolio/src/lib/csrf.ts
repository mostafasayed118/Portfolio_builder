import { fetchCsrfToken } from "@workspace/app-infra/csrf";

import { getApiUrl } from "./env";

const API_BASE = getApiUrl();
const TOKEN_TTL_MS = 50 * 60 * 1000; // 50 minutes (server cookie TTL is 1 hour)

let cachedToken: string | null = null;
let cachedAt = 0;

/**
 * Returns a double-submit CSRF token, cached for its server-side TTL.
 *
 * The wire-level fetch (endpoint URL, envelope parsing, timeout, error
 * wrapping) lives in @workspace/app-infra/csrf — shared with the admin SPA
 * so the two copies cannot drift. Only the caching strategy is local.
 */
export async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && Date.now() - cachedAt < TOKEN_TTL_MS) return cachedToken;
  clearCsrfCache();
  const token = await fetchCsrfToken(API_BASE);
  cachedToken = token;
  cachedAt = Date.now();
  return token;
}

export function clearCsrfCache() {
  cachedToken = null;
  cachedAt = 0;
}
