/**
 * clerk-session.ts — mint a real Clerk session token for the browser-level
 * admin auth smoke test, without needing the user's password.
 *
 * Flow (Clerk Backend API, raw fetch — no extra dependency):
 *   1. Find the user by email (create it if missing — idempotent).
 *   2. Create a session for that user (this also attaches a client).
 *   3. Mint the default session token (the same 60s-TTL JWT the browser
 *      receives after a normal sign-in, carrying the `sid` claim).
 *   4. `revokeClerkSession` cleans the session up in teardown.
 *
 * Env used:
 *   CLERK_SECRET_KEY  — required; Backend API auth (server-only).
 *   CLERK_TEST_EMAIL  — preferred target email (falls back to the first
 *                       entry of ADMIN_EMAILS, then a hard default).
 */

const CLERK_API = "https://api.clerk.com/v1";

export interface ClerkSession {
  jwt: string;
  sid: string;
  userId: string;
  email: string;
}

function headers(secretKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${secretKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function clerkFetch(
  secretKey: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(`${CLERK_API}${path}`, { ...init, headers: headers(secretKey) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Clerk API ${init?.method ?? "GET"} ${path} → ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}

/** Resolve the email the smoke test signs in as. */
export function resolveAdminEmail(): string {
  const explicit = process.env.CLERK_TEST_EMAIL;
  if (explicit) return explicit;
  const first = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean)[0];
  return first ?? "e2e-admin-tester@example.com";
}

/** Find a Clerk user by email, or create one (idempotent). */
async function findOrCreateUser(secretKey: string, email: string): Promise<string> {
  const list = await clerkFetch(secretKey, `/users?email_address[]=${encodeURIComponent(email)}`);
  // The list endpoint returns a bare array; the SDK wraps it in { data }.
  // Accept both shapes so the helper is robust to either.
  const body = (await list.json()) as { id: string }[] | { data?: { id: string }[] };
  const users = Array.isArray(body) ? body : (body.data ?? []);
  const existing = users.find((u) => u.id);
  if (existing) return existing.id;

  // Create — no real password is needed; the session token is minted
  // server-side, and this account exists purely for E2E.
  const create = await clerkFetch(secretKey, "/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [email],
      first_name: "E2E",
      last_name: "Tester",
      skip_password_requirement: true,
    }),
  }).catch(async () => {
    // Some instances reject skip_password_requirement — fall back to a
    // throwaway password (never used by the test).
    const fallback = await clerkFetch(secretKey, "/users", {
      method: "POST",
      body: JSON.stringify({
        email_address: [email],
        first_name: "E2E",
        last_name: "Tester",
        password: `E2e!${Date.now()}x`,
      }),
    });
    return fallback;
  });
  const created = (await create.json()) as { id: string };
  return created.id;
}

/** Mint a default session token for the given email. */
export async function mintClerkSession(opts: { secretKey: string; email?: string }): Promise<ClerkSession> {
  const email = (opts.email ?? resolveAdminEmail()).toLowerCase();
  const userId = await findOrCreateUser(opts.secretKey, email);

  const session = await clerkFetch(opts.secretKey, "/sessions", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
  const { id: sid } = (await session.json()) as { id: string };

  const token = await clerkFetch(opts.secretKey, `/sessions/${sid}/tokens`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  const { jwt } = (await token.json()) as { jwt: string };

  return { jwt, sid, userId, email };
}

/** Revoke a session (teardown hygiene — the test must not leave sessions behind). */
export async function revokeClerkSession(opts: { secretKey: string; sid: string }): Promise<void> {
  await clerkFetch(opts.secretKey, `/sessions/${opts.sid}/revoke`, { method: "POST" });
}
