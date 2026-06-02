import { z } from "zod";

const portfolioEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  VITE_SITE_URL: z.string().url().optional(),
  VITE_API_URL: z.string().url().optional(),
  VITE_TWITTER_HANDLE: z.string().optional(),
});

export type PortfolioEnv = z.infer<typeof portfolioEnvSchema>;

let _env: PortfolioEnv | null = null;

export function getPortfolioEnv(): PortfolioEnv {
  if (_env) return _env;
  const result = portfolioEnvSchema.safeParse(import.meta.env);
  if (!result.success) {
    if (import.meta.env.DEV) {
      console.warn(
        "[portfolio] Env validation warnings:",
        result.error.flatten().fieldErrors,
      );
    }
    _env = {} as PortfolioEnv;
  } else {
    _env = result.data;
  }
  return _env!;
}

export const portfolioEnv = getPortfolioEnv();

/**
 * Returns the API server base URL, with explicit dev/prod behavior:
 *  - DEV: falls back to http://localhost:3001 with a one-time console.warn so
 *    local `pnpm dev` still works without a `.env`.
 *  - PROD: returns "" (empty string). Callers MUST handle this — the
 *    previous behavior of silently using localhost:3001 in production
 *    meant a misconfigured deploy would appear to "work" but every
 *    fetch would 404. Empty string forces the calling UI to show a
 *    visible error (or skip the action).
 */
const _apiUrlWarned = new Set<string>();
export function getApiUrl(): string {
  const env = getPortfolioEnv();
  const url = env.VITE_API_URL;
  if (url) return url;
  if (import.meta.env.DEV) {
    if (!_apiUrlWarned.has("dev-fallback")) {
      _apiUrlWarned.add("dev-fallback");
      console.warn(
        "[portfolio] VITE_API_URL not set — falling back to http://localhost:3001 (dev only)",
      );
    }
    return "http://localhost:3001";
  }
  return "";
}
