import { getApiUrl } from "./env";

const API_BASE = getApiUrl();
const TOKEN_TTL_MS = 50 * 60 * 1000; // 50 minutes (server cookie TTL is 1 hour)

let cachedToken: string | null = null;
let cachedAt = 0;

export async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && Date.now() - cachedAt < TOKEN_TTL_MS) return cachedToken;
  clearCsrfCache();
  const res = await fetch(`${API_BASE}/api/v1/csrf-token`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch CSRF token");
  const data: { csrfToken: string } = await res.json();
  cachedToken = data.csrfToken;
  cachedAt = Date.now();
  return cachedToken;
}

export function clearCsrfCache() {
  cachedToken = null;
  cachedAt = 0;
}
