/**
 * Centralised environment variable validation for the API server.
 *
 * Replaces the ad-hoc `process.env.X` reads scattered across the codebase
 * with a single source of truth: typed accessors, validated at startup.
 *
 * Rules:
 *   - Required variables: missing → process.exit(1) at startup
 *     (skipped when NODE_ENV=test or VITEST=true, so tests can use stubs)
 *   - Optional variables: undefined is fine, accessors return `string | undefined`
 *   - Enum variables: validated against an allowed list at startup
 *   - Booleans/numbers: parsed with a fallback for missing values
 *
 * Importers should use the named exports (`env.SUPABASE_URL`) rather than
 * reaching into `process.env` directly. Tests can override the
 * `_setOverrides` helper to inject specific values without touching
 * `process.env` (and causing cross-test leakage).
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- .env loading (preserved from preload-env.ts) ----------

const envPaths = [
  resolve(__dirname, "../.env"),
  resolve(__dirname, "../../../.env"),
];

for (const envPath of envPaths) {
  if (!existsSync(envPath)) continue;
  try {
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env file unreadable — not fatal, env vars may be set via platform
  }
}

// ---------- Override hook for tests ----------

const overrides = new Map<string, string | undefined>();

export function _setOverride(key: string, value: string | undefined): void {
  if (value === undefined) {
    overrides.delete(key);
  } else {
    overrides.set(key, value);
  }
}

export function _resetOverrides(): void {
  overrides.clear();
}

function get(key: string): string | undefined {
  if (overrides.has(key)) return overrides.get(key);
  return process.env[key];
}

// ---------- Type-safe accessors ----------

function require_(key: string): string {
  const value = get(key);
  if (value === undefined || value === "") {
    if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
      return ""; // tests will set via _setOverride
    }
    console.error(`[env] Missing required environment variable: ${key}`);
    console.error("[env] Copy .env.example to .env and fill in your values.");
    process.exit(1);
  }
  return value;
}

function optional(key: string): string | undefined {
  const value = get(key);
  if (value === undefined || value === "") return undefined;
  return value;
}

function bool(key: string, fallback: boolean): boolean {
  const raw = get(key);
  if (raw === undefined || raw === "") return fallback;
  return /^(1|true|yes|on)$/i.test(raw);
}

function int(key: string, fallback: number): number {
  const raw = get(key);
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function oneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const raw = get(key);
  if (raw === undefined || raw === "") return fallback;
  if ((allowed as readonly string[]).includes(raw)) return raw as T;
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
    return fallback; // tests can set whatever
  }
  console.error(
    `[env] Invalid value for ${key}: "${raw}". Allowed: ${allowed.join(", ")}. Falling back to "${fallback}".`,
  );
  return fallback;
}

// ---------- Public typed env object ----------

/**
 * Typed access to every environment variable used by the API server.
 * Always import this object; never reach into `process.env` directly.
 */
export const env = {
  // Supabase
  get SUPABASE_URL() { return require_("SUPABASE_URL"); },
  get SUPABASE_SERVICE_ROLE_KEY() { return require_("SUPABASE_SERVICE_ROLE_KEY"); },
  get SUPABASE_ANON_KEY() { return optional("SUPABASE_ANON_KEY"); },

  // Auth
  get CLERK_SECRET_KEY() { return optional("CLERK_SECRET_KEY"); },
  get CLERK_ISSUER() { return optional("CLERK_ISSUER"); },
  get ADMIN_API_KEY() { return optional("ADMIN_API_KEY"); },
  get VITE_ADMIN_EMAILS() { return optional("VITE_ADMIN_EMAILS") ?? ""; },

  // CSRF / sessions
  get CSRF_SECRET() { return require_("CSRF_SECRET"); },

  // CORS / allowed origins
  get VITE_SITE_URL() { return optional("VITE_SITE_URL"); },
  get VITE_ADMIN_URL() { return optional("VITE_ADMIN_URL"); },
  get VERCEL_URL() { return optional("VERCEL_URL"); },

  // Public-facing rate limit overrides (optional)
  get CONTACT_RATE_LIMIT_MAX() { return int("CONTACT_RATE_LIMIT_MAX", 5); },
  get CONTACT_RATE_LIMIT_WINDOW_MS() { return int("CONTACT_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000); },

  // Dev / debug
  get NODE_ENV() { return oneOf("NODE_ENV", ["development", "test", "production"] as const, "development"); },
  get DISABLE_RATE_LIMIT() { return bool("DISABLE_RATE_LIMIT", false); },
  get PORT() { return int("PORT", 3001); },
  get LOG_LEVEL() { return oneOf("LOG_LEVEL", ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const, "info"); },
  get VISUALIZER_OPEN() { return bool("VISUALIZER_OPEN", false); },

  // Convenience flags
  get IS_PRODUCTION() { return process.env.NODE_ENV === "production"; },
  get IS_TEST() { return process.env.NODE_ENV === "test" || process.env.VITEST === "true"; },

  /** Verify all required env vars are present. Call at startup. */
  validate(): { ok: true; missing: string[] } {
    const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CSRF_SECRET"];
    const missing = required.filter((k) => !get(k));
    if (missing.length > 0 && !this.IS_TEST) {
      console.error(`[env] Missing required environment variables: ${missing.join(", ")}`);
      console.error("[env] Copy .env.example to .env and fill in your values.");
      process.exit(1);
    }
    return { ok: true, missing };
  },
};

// Re-export the raw getter for rare cases that need an arbitrary key
// without going through the typed accessors. Avoid using this.
export function getRawEnv(key: string): string | undefined {
  return get(key);
}
