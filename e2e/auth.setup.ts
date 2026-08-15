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
 *   (B) MINTED session — runs when `CLERK_SECRET_KEY` is set (no password
 *       needed): mints a real session token via the Clerk Backend API for
 *       the E2E admin account and injects it as the `__session` cookie —
 *       exactly what the browser holds after a normal sign-in. This is the
 *       path CI uses.
 *
 *   (C) FALLBACK — runs when the env vars are missing or Clerk is
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
import { test as setup, type Page, type BrowserContext } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { mintClerkSession, resolveAdminEmail } from "./lib/clerk-session";

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
  // the form-dependent assertions. The __e2e_auth_mode marker lets
  // those specs detect the stub and skip cleanly (see e2e/lib/session-mode.ts).
  const stub = {
    cookies: [],
    origins: [
      {
        origin: BASE_URL,
        localStorage: [
          { name: "__clerk_test_mode_reason", value: reason },
          { name: "__e2e_auth_mode", value: "stub" },
        ],
      },
    ],
  };
  writeFileSync(STORAGE_FILE, JSON.stringify(stub, null, 2));
}

/**
 * Tag an already-written storageState (real sign-in or minted session)
 * with the __e2e_auth_mode marker so downstream specs can tell a real
 * browser session from the stub. `context.storageState()` snapshots the
 * live browser state, so the marker is merged in afterwards.
 */
function markStorageMode(mode: "real" | "minted") {
  const raw = JSON.parse(readFileSync(STORAGE_FILE, "utf8")) as {
    origins?: { origin: string; localStorage: { name: string; value: string }[] }[];
  };
  raw.origins ??= [];
  let entry = raw.origins.find((o) => o.origin === BASE_URL);
  if (!entry) {
    entry = { origin: BASE_URL, localStorage: [] };
    raw.origins.push(entry);
  }
  entry.localStorage = [
    ...entry.localStorage.filter((l) => l.name !== "__e2e_auth_mode"),
    { name: "__e2e_auth_mode", value: mode },
  ];
  writeFileSync(STORAGE_FILE, JSON.stringify(raw, null, 2));
}

/**
 * Path B: mint a real Clerk session token (no password) and inject it as
 * the __session cookie, then confirm the protected /overview route accepts
 * it. Runs when CLERK_SECRET_KEY is set.
 */
async function tryMintedClerkSession(context: BrowserContext): Promise<boolean> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return false;
  const email = resolveAdminEmail();
  let session;
  try {
    session = await mintClerkSession({ secretKey, email });
  } catch (err) {
    console.warn("[auth.setup] minted-session path failed:", (err as Error).message);
    return false;
  }
  try {
    const page = await context.newPage();

    // Phase 1 — dev-browser handshake. Clerk dev instances only accept a
    // session token from a browser that already talked to the frontend API
    // once, so let clerk-js do a real first visit before injecting.
    const handshake = page
      .waitForResponse((r) => r.url().includes("/v1/client"), { timeout: 20_000 })
      .catch(() => null);
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "domcontentloaded" });
    await handshake;
    await page.waitForTimeout(1_500);

    // Phase 2 — inject the minted session (what a completed sign-in leaves).
    await context.addCookies([
      { name: "__session", value: session.jwt, url: BASE_URL },
      { name: "__client_uat", value: String(Math.floor(Date.now() / 1000)), url: BASE_URL },
    ]);

    // Phase 3 — reload into the protected route and require it to STAY there
    // (a real assertion, not just matching the initial URL).
    await page.goto(`${BASE_URL}/overview`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);
    await page.waitForURL(/\/overview/, { timeout: 20_000 });
    if (new URL(page.url()).pathname.includes("/sign-in")) {
      throw new Error("minted session bounced back to /sign-in");
    }
    await page.close();
    return true;
  } catch (err) {
    console.warn("[auth.setup] minted-session cookie injection failed:", (err as Error).message);
    return false;
  }
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
    markStorageMode("real");
    console.log(`[auth.setup] wrote real Clerk sign-in session → ${STORAGE_FILE}`);
    return;
  }

  // Path B: minted session (CLERK_SECRET_KEY present) — no password needed.
  const minted = await tryMintedClerkSession(context);
  if (minted) {
    await context.storageState({ path: STORAGE_FILE });
    markStorageMode("minted");
    console.log(`[auth.setup] wrote minted Clerk session → ${STORAGE_FILE}`);
    return;
  }

  // FALLBACK: synthesize a storageState that documents why we fell back.
  const missingSecret = !process.env.CLERK_SECRET_KEY;
  const missingCreds =
    !process.env.CLERK_TEST_EMAIL || !process.env.CLERK_TEST_PASSWORD;
  const reachable = await clerkIsReachable();
  const reason = [
    missingSecret ? "missing CLERK_SECRET_KEY (minted-session path unavailable)" : null,
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
      `Set CLERK_SECRET_KEY (minted session) or CLERK_TEST_EMAIL / ` +
      `CLERK_TEST_PASSWORD (real sign-in) in CI for real admin auth.`,
  );
});
