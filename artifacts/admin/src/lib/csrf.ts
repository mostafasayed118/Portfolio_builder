import { getApiUrl } from "./env";

const apiBase = getApiUrl();

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
    const data = await res.json();
    if (!data.csrfToken) throw new Error("No CSRF token in response");
    return data.csrfToken;
  } catch (err) {
    clearTimeout(timeoutId);
    throw new Error("Unable to establish secure session — please refresh the page", { cause: err });
  }
}
