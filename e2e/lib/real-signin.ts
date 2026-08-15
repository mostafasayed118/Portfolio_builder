/**
 * real-signin.ts — complete a GENUINE browser sign-in against the admin SPA.
 *
 * Drives Clerk's real sign-in form (identifier → password → "new device"
 * verification code) and finishes the 2FA step with the OTP delivered to
 * the mail.tm mailbox. This replaces the minted-session cookie injection so
 * CI exercises the exact path a human admin uses.
 *
 * Flow:
 *   1. `ensureSigninUser` — make sure the Clerk user exists with the sign-in
 *      password (the mailbox address is the account email).
 *   2. Browser: /sign-in → identifier → password.
 *   3. Clerk shows the factor-two screen ("Check your email", "You're
 *      signing in from a new device") — dev instances DO deliver this OTP
 *      to the real inbox.
 *   4. Poll mail.tm for the Clerk OTP and submit it; if no mailbox is
 *      configured, fall back to Clerk's documented dev-mode code 424242.
 *   5. Wait for the post-sign-in redirect to /overview.
 *
 * Env used:
 *   CLERK_SECRET_KEY   — Backend API (user provisioning)
 *   MAILTM_ADDRESS     — mailbox address (the sign-in email)
 *   MAILTM_PASSWORD    — mailbox password
 *   CLERK_TEST_PASSWORD— the sign-in password (CLERK_TEST_EMAIL = mailbox)
 */

import type { Page } from "@playwright/test";
import {
  loginOrCreateMailbox,
  fetchClerkOtpFromMailbox,
} from "./mailtm";

const CLERK_API = "https://api.clerk.com/v1";

function clerkHeaders(secretKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${secretKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

/** Ensure the sign-in user exists with a real password. Idempotent. */
export async function ensureSigninUser(opts: {
  secretKey: string;
  email: string;
  password: string;
}): Promise<{ userId: string; existed: boolean }> {
  const headers = clerkHeaders(opts.secretKey);
  const email = opts.email.toLowerCase();

  const list = await fetch(
    `${CLERK_API}/users?email_address[]=${encodeURIComponent(email)}&limit=100`,
    { headers, signal: AbortSignal.timeout(15_000) },
  );
  if (!list.ok) throw new Error(`Clerk: cannot list users (${list.status})`);
  const body = (await list.json()) as { data?: { id: string; email_addresses: { email_address: string }[] }[] };
  const users = Array.isArray(body) ? body : (body.data ?? []);
  const existing = users.find((u) =>
    (u.email_addresses ?? []).some((e) => e.email_address.toLowerCase() === email),
  );

  if (existing) {
    // Make sure the sign-in password is the one the flow will use.
    const patch = await fetch(`${CLERK_API}/users/${existing.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ password: opts.password }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!patch.ok) {
      throw new Error(`Clerk: could not update password for ${email} (${patch.status})`);
    }
    return { userId: existing.id, existed: true };
  }

  const create = await fetch(`${CLERK_API}/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email_address: [email],
      first_name: "E2E",
      last_name: "Mailbox",
      password: opts.password,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const created = (await create.json()) as { id?: string; errors?: { message: string }[] };
  if (!create.ok || !created.id) {
    throw new Error(
      `Clerk: could not create ${email} (${create.status}: ${created.errors?.[0]?.message ?? "unknown"})`,
    );
  }
  return { userId: created.id, existed: false };
}

export interface SignInResult {
  signedIn: boolean;
  codeSource: "mailbox" | "dev-code" | "none";
}

/**
 * Drive the real sign-in form and complete the 2FA step.
 * Throws on hard failures; returns signedIn:false if a step was skipped
 * (e.g. no credentials configured) so callers can fall back.
 */
export async function completeBrowserSignIn(opts: {
  page: Page;
  baseURL: string;
  email: string;
  password: string;
  mailtmAddress?: string;
  mailtmPassword?: string;
  pollTimeoutMs?: number;
}): Promise<SignInResult> {
  const { page, baseURL } = opts;
  const signInUrl = `${baseURL.replace(/\/+$/, "")}/sign-in`;

  await page.goto(signInUrl, { waitUntil: "domcontentloaded" });

  // Step 1 — identifier.
  const identifier = page.locator('input[name="identifier"]').first();
  await identifier.waitFor({ state: "visible", timeout: 20_000 });
  await identifier.fill(opts.email);
  await identifier.press("Enter");

  // Step 2 — password.
  const password = page.locator('input[name="password"]').first();
  await password.waitFor({ state: "visible", timeout: 15_000 });
  await password.fill(opts.password);
  await password.press("Enter");

  // Step 3 — either we're already redirecting (no 2FA) or a code step shows.
  const codeInput = page.locator(
    'input[autocomplete="one-time-code"], input[name="code"], input[inputmode="numeric"]',
  ).first();

  const codeVisible = await codeInput
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);

  let codeSource: SignInResult["codeSource"] = "none";
  if (codeVisible) {
    // Get the OTP from the real mailbox, falling back to Clerk's documented
    // dev-mode constant when no mailbox is configured.
    let code: string | null = null;
    if (opts.mailtmAddress && opts.mailtmPassword) {
      const session = await loginOrCreateMailbox({
        address: opts.mailtmAddress,
        password: opts.mailtmPassword,
      });
      code = await fetchClerkOtpFromMailbox(session, {
        timeoutMs: opts.pollTimeoutMs ?? 90_000,
      });
      codeSource = code ? "mailbox" : "none";
    }
    if (!code) {
      // Clerk dev test mode: verification codes are always 424242.
      code = "424242";
      codeSource = "dev-code";
    }
    await codeInput.fill(code);
    await codeInput.press("Enter");
  }

  // Step 4 — the app redirects to /overview (forceRedirectUrl).
  await page.waitForURL((u) => u.pathname.includes("/overview"), { timeout: 25_000 });
  return { signedIn: true, codeSource };
}
