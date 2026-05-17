const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

let cachedToken: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const res = await fetch(`${API_BASE}/api/v1/csrf-token`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch CSRF token");
  const data: { csrfToken: string } = await res.json();
  cachedToken = data.csrfToken;
  return cachedToken;
}

export function clearCsrfCache() {
  cachedToken = null;
}
