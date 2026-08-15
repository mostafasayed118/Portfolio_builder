import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Session-mode detection for the admin E2E specs.
 *
 * `e2e/auth.setup.ts` writes `playwright/.auth/admin.json` and tags it with
 * a `__e2e_auth_mode` localStorage marker:
 *
 *   - "real"   — a genuine Clerk sign-in completed in the browser (requires
 *                CLERK_TEST_EMAIL / CLERK_TEST_PASSWORD and Clerk reachable).
 *   - "minted" — a Backend-API-minted session was injected AND verified to
 *                authenticate in the browser (requires CLERK_SECRET_KEY).
 *   - "stub"   — no real session could be established (default in CI, where
 *                credentials / 2FA mailbox access are unavailable).
 *
 * Admin UI specs that assert on the authenticated app shell should
 * `test.skip(!hasRealAdminSession(), …)` so CI stays green without
 * credentials while local runs (with credentials set) execute the full
 * suite. API-contract and auth-agnostic tests must NOT gate on this.
 */

export type SessionMode = "real" | "minted" | "stub";

const STORAGE_FILE = resolve(process.cwd(), "playwright/.auth/admin.json");

let cached: SessionMode | undefined;

export function getSessionMode(): SessionMode {
  if (cached) return cached;
  try {
    const raw = JSON.parse(readFileSync(STORAGE_FILE, "utf8")) as {
      origins?: { origin: string; localStorage: { name: string; value: string }[] }[];
    };
    const marker = raw.origins
      ?.flatMap((o) => o.localStorage)
      .find((l) => l.name === "__e2e_auth_mode")?.value;
    cached = marker === "real" || marker === "minted" ? marker : "stub";
  } catch {
    cached = "stub";
  }
  return cached;
}

/** True when a real browser session exists (real sign-in or verified minted). */
export function hasRealAdminSession(): boolean {
  return getSessionMode() !== "stub";
}
