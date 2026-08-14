import { z } from "zod";
import { logWarn } from "@workspace/logging";

const adminEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  VITE_API_URL: z.string().url().optional(),
  VITE_SITE_URL: z.string().url().optional(),
  VITE_ADMIN_URL: z.string().url().optional(),
  VITE_PORTFOLIO_URL: z.string().url().optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
});

export type AdminEnv = z.infer<typeof adminEnvSchema>;

let _env: AdminEnv | null = null;

export function getAdminEnv(): AdminEnv {
  if (_env) return _env;
  const result = adminEnvSchema.safeParse(import.meta.env);
  if (!result.success) {
    if (import.meta.env.DEV) {
      logWarn("[admin] Env validation warnings:", JSON.stringify(result.error.flatten().fieldErrors));
    }
    _env = {} as AdminEnv;
  } else {
    _env = result.data;
  }
  return _env!;
}

export const adminEnv = getAdminEnv();

/**
 * Returns the API server base URL, with explicit dev/prod behavior:
 *  - DEV: falls back to http://localhost:3001 with a one-time logWarn so
 *    local `pnpm dev` still works without a `.env`.
 *  - PROD: returns "" (empty string). Callers MUST handle this — the
 *    previous behavior of silently using localhost:3001 in production
 *    meant a misconfigured deploy would appear to "work" but every
 *    fetch would 404. Empty string forces the calling UI to show a
 *    visible error (or skip the action).
 */
const _apiUrlWarned = new Set<string>();
export function getApiUrl(): string {
  const env = getAdminEnv();
  const url = env.VITE_API_URL;
  if (url) return url;
  if (import.meta.env.DEV) {
    if (!_apiUrlWarned.has("dev-fallback")) {
      _apiUrlWarned.add("dev-fallback");
      logWarn("[admin] VITE_API_URL not set — falling back to http://localhost:3001 (dev only)");
    }
    return "http://localhost:3001";
  }
  return "";
}
