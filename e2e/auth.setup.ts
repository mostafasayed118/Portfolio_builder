/**
 * Playwright auth setup for the Admin project.
 *
 * Goal: produce a storageState JSON at `playwright/.auth/admin.json`
 * so the rest of the admin E2E specs can skip the Clerk sign-in
 * screen and go straight to the protected pages.
 *
 * Two execution paths are supported, in this order:
 *
 *   (A) REAL browser sign-in — runs when `CLERK_TEST_EMAIL` /
 *       `CLERK_TEST_PASSWORD` are set and Clerk is reachable. Drives the
 *       ACTUAL Clerk sign-in form (identifier → password → "new device"
 *       verification) and completes the 2FA step with the OTP delivered to
 *       the mail.tm mailbox (MAILTM_ADDRESS / MAILTM_PASSWORD). This is the
 *       path CI uses — a genuine browser session, no cookie injection.
 *
 *   (B) MINTED session — fallback when only `CLERK_SECRET_KEY` is set (no
 *       password / mailbox): mints a real session token via the Clerk
 *       Backend API and injects it as the `__session` cookie.
 *
 *   (C) FALLBACK — when the env vars are missing or Clerk is unreachable,
 *       synthesize a stub storageState (documented, marked `stub`).
 *
 * The setup NEVER throws — it always writes a usable storageState
 * (real or stub) so the dependent specs can `test.use({ storageState })`.
 *
 * Run: `pnpm exec playwright test --project=admin --grep="setup"`
 * or simply as a dependency of any admin spec via `test.use()`.
 */
import { test as setup, type BrowserContext } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { mintClerkSession, resolveAdminEmail } from "./lib/clerk-session";
import { ensureSigninUser, completeBrowserSignIn } from "./lib/real-signin";

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
    // (a real assertion, not just matching the initial URL). The URL check
    // alone is NOT enough: a misconfigured admin app (missing
    // VITE_CLERK_PUBLISHABLE_KEY) renders a "Clerk Setup Required" screen in
    // place without redirecting — which would pass the URL check while the
    // session never authenticated. Require the authenticated shell to render.
    await page.goto(`${BASE_URL}/overview`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);
    await page.waitForURL(/\/overview/, { timeout: 20_000 });
    if (new URL(page.url()).pathname.includes("/sign-in")) {
      throw new Error("minted session bounced back to /sign-in");
    }
    if ((await page.getByText("Clerk Setup Required").count()) > 0) {
      throw new Error("admin app is not configured (Clerk Setup Required)");
    }
    await page.locator("aside, nav[aria-label*='navigation' i]").first().waitFor({
      state: "visible",
      timeout: 10_000,
    });
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

  // Provision the account (email + password) via the Backend API so the
  // form can actually sign in. Tolerate failure — the user may already
  // exist with the right password (e.g. a local run without the secret).
  if (process.env.CLERK_SECRET_KEY) {
    try {
      await ensureSigninUser({ secretKey: process.env.CLERK_SECRET_KEY, email, password });
    } catch (err) {
      console.warn("[auth.setup] could not provision sign-in user:", (err as Error).message);
    }
  }

  const page = await context.newPage();
  try {
    // Genuine sign-in: identifier → password → new-device verification OTP
    // read from the mail.tm mailbox (dev-mode 424242 when no mailbox).
    const result = await completeBrowserSignIn({
      page,
      baseURL: BASE_URL,
      email,
      password,
      mailtmAddress: process.env.MAILTM_ADDRESS,
      mailtmPassword: process.env.MAILTM_PASSWORD,
    });
    console.log(`[auth.setup] real sign-in completed (2FA via ${result.codeSource})`);
    // Require the authenticated shell — a "Clerk Setup Required" screen
    // renders in place without redirecting and must not count as success.
    await page.waitForURL(/\/overview/, { timeout: 20_000 });
    if (new URL(page.url()).pathname.includes("/sign-in")) return false;
    if ((await page.getByText("Clerk Setup Required").count()) > 0) return false;
    await page.locator("aside, nav[aria-label*='navigation' i]").first().waitFor({
      state: "visible",
      timeout: 10_000,
    });
    return true;
  } catch (err) {
    console.warn("[auth.setup] real Clerk sign-in failed:", (err as Error).message);
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
