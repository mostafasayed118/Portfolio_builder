import { fetchCsrfToken } from "@workspace/app-infra/csrf";

import { getApiUrl } from "./env";

/**
 * Fetches a fresh double-submit CSRF token from the API server.
 *
 * Stateless by design (no client cache): every mutating request re-fetches.
 * The wire-level fetch (endpoint URL, envelope parsing, timeout, error
 * wrapping) lives in @workspace/app-infra/csrf — shared with the portfolio
 * SPA so the two copies cannot drift.
 */
export async function getCsrfToken(): Promise<string> {
  return fetchCsrfToken(getApiUrl());
}
