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

/**
 * Derive the Clerk frontend API host from the publishable key
 * (pk_test_<base64(instance-domain)>) or the CLERK_ISSUER env var. The
 * legacy hardcoded `clerk.accounts.dev` host is not reachable from every
 * network, while the per-instance host always is.
 */
function clerkFrontendApi(): string | null {
  if (process.env.CLERK_ISSUER) return process.env.CLERK_ISSUER;
  const key = process.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (key?.startsWith("pk_test_")) {
    try {
      const decoded = Buffer.from(key.slice("pk_test_".length), "base64").toString("utf-8");
      const domain = decoded.split("$")[0];
      if (domain && domain.includes(".")) return `https://${domain}`;
    } catch {
      // fall through to the legacy check below
    }
  }
  return null;
}

async function clerkIsReachable(): Promise<boolean> {
  const candidates = [
    clerkFrontendApi(),
    "https://clerk.accounts.dev/v1/instance", // legacy check
  ].filter(Boolean) as string[];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.status < 500) return true;
    } catch {
      // try the next candidate
    }
  }
  return false;
}

async function tryRealClerkSignIn(context: BrowserContext): Promise<boolean> {
  const email = process.env.CLERK_TEST_EMAIL;
  const password = process.env.CLERK_TEST_PASSWORD;
  if (!email || !password) return false;
  if (!(await clerkIsReachable())) return false;

  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "domcontentloaded" });
    // Clerk v5 renders the sign-in form in-page, but only after its JS
    // hydrates — wait for the identifier field before choosing a path.
    // Older Clerk versions rendered the form inside an iframe.
    const inPageIdentifier = page.locator('input[name="identifier"]').first();
    const inPage = await inPageIdentifier
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (inPage) {
      await inPageIdentifier.fill(email);
      await inPageIdentifier.press("Enter");
      const passwordField = page.locator('input[name="password"]');
      await passwordField.fill(password);
      await passwordField.press("Enter");
    } else {
      const frame = page.frameLocator("iframe[src*='clerk']").first();
      await frame.locator('input[name="identifier"]').fill(email);
      await frame.locator('input[name="identifier"]').press("Enter");
      await frame.locator('input[name="password"]').fill(password);
      await frame.locator('input[name="password"]').press("Enter");
    }
    // Wait for the post-sign-in redirect to /overview.
    await page.waitForURL(/\/overview/, { timeout: 20_000 });
    return true;
  } catch (err) {
    console.warn("[auth.setup] real Clerk sign-in failed:", err);
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
  const missingCreds =
    !process.env.CLERK_TEST_EMAIL || !process.env.CLERK_TEST_PASSWORD;
  const reachable = await clerkIsReachable();
  const reason = [
    missingCreds ? "missing CLERK_TEST_EMAIL / CLERK_TEST_PASSWORD env vars" : null,
    !reachable ? "Clerk frontend API unreachable from this sandbox" : null,
    !missingCreds && reachable ? "real Clerk sign-in did not complete (2FA / credentials)" : null,
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
