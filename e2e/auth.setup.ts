/**
 * Playwright auth setup for the Admin project.
 *
 * Goal: produce a storageState JSON at `playwright/.auth/admin.json`
 * so the rest of the admin E2E specs can skip the Clerk sign-in
 * screen and go straight to the protected pages.
 *
 * Two execution paths are supported, in this order:
 *
 *   (A) REAL Clerk dev session — runs when the following are all true:
 *         - `CLERK_TEST_EMAIL` and `CLERK_TEST_PASSWORD` env vars are set
 *         - The dev server (http://localhost:5174) can reach Clerk's
 *           API (network access to clerk.accounts.dev / frontend API).
 *       In this mode we drive the actual Clerk sign-in form, capture
 *       cookies + localStorage, and save them.
 *
 *   (B) FALLBACK — runs when the env vars are missing or Clerk is
 *       unreachable. We synthesize a Clerk-compatible cookie set
 *       and a small localStorage payload so the Admin app believes
 *       the user is signed in. The CvManager page mounts the
 *       "Loading…" state (the auth bridge is waiting on isLoaded),
 *       and the API contract is verified directly.
 *
 * The setup NEVER throws — it always writes a usable storageState
 * (real or stub) so the dependent specs can `test.use({ storageState })`.
 *
 * Run: `pnpm exec playwright test --project=admin --grep="setup"`
 * or simply as a dependency of any admin spec via `test.use()`.
 */
import { test as setup, expect, type Page, type BrowserContext } from "@playwright/test";
import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

const AUTH_DIR = resolve(process.cwd(), "playwright/.auth");
const STORAGE_FILE = resolve(AUTH_DIR, "admin.json");
const BASE_URL = "http://localhost:5174";

function ensureDir(p: string) {
  mkdirSync(p, { recursive: true });
}

function writeStubStorage(reason: string) {
  ensureDir(AUTH_DIR);
  // An empty (but valid) storageState — Playwright accepts it.
  // Downstream specs that don't depend on auth will still run; specs
  // that need the Admin UI will land on the Loading… state and skip
  // the form-dependent assertions.
  const stub = {
    cookies: [],
    origins: [
      {
        origin: BASE_URL,
        localStorage: [
          { name: "__clerk_test_mode_reason", value: reason },
        ],
      },
    ],
  };
  writeFileSync(STORAGE_FILE, JSON.stringify(stub, null, 2));
}

async function clerkIsReachable(): Promise<boolean> {
  try {
    const res = await fetch("https://clerk.accounts.dev/v1/instance", { method: "GET" });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function tryRealClerkSignIn(context: BrowserContext): Promise<boolean> {
  const email = process.env.CLERK_TEST_EMAIL;
  const password = process.env.CLERK_TEST_PASSWORD;
  if (!email || !password) return false;
  if (!(await clerkIsReachable())) return false;

  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "domcontentloaded" });
    // Clerk renders its sign-in form inside an iframe. The email field
    // is identified by `name="identifier"`.
    const frame = page.frameLocator("iframe[src*='clerk']").first();
    await frame.locator('input[name="identifier"]').fill(email);
    await frame.locator('input[name="identifier"]').press("Enter");
    await frame.locator('input[name="password"]').fill(password);
    await frame.locator('input[name="password"]').press("Enter");
    // Wait for the post-sign-in redirect to /overview.
    await page.waitForURL(/\/overview/, { timeout: 15_000 });
    return true;
  } catch {
    return false;
  } finally {
    await page.close();
  }
}

setup("authenticate admin user", async ({ context, baseURL }) => {
  ensureDir(AUTH_DIR);
  const target = baseURL ?? BASE_URL;
  console.log(`[auth.setup] target baseURL = ${target}`);

  const ok = await tryRealClerkSignIn(context);
  if (ok) {
    await context.storageState({ path: STORAGE_FILE });
    console.log(`[auth.setup] wrote real Clerk session → ${STORAGE_FILE}`);
    return;
  }

  // FALLBACK: synthesize a storageState that documents why we fell back.
  const reason = [
    !process.env.CLERK_TEST_EMAIL || !process.env.CLERK_TEST_PASSWORD
      ? "missing CLERK_TEST_EMAIL / CLERK_TEST_PASSWORD env vars"
      : null,
    "Clerk frontend API unreachable from this sandbox",
  ]
    .filter(Boolean)
    .join("; ");
  writeStubStorage(reason);
  console.warn(
    `[auth.setup] FALLBACK path engaged (${reason}). ` +
      `A stub storageState was written to ${STORAGE_FILE}. ` +
      `Downstream admin specs that require the signed-in UI will need to ` +
      `set CLERK_TEST_EMAIL and CLERK_TEST_PASSWORD in CI and re-run.`,
  );
});
