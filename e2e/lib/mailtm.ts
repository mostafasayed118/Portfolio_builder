/**
 * mailtm.ts — minimal mail.tm (disposable inbox) client for the E2E suite.
 *
 * Used by the real-form sign-in flow: Clerk sends the "new device
 * verification" OTP to the test user's mailbox; we poll this inbox and
 * extract the 6-digit code to complete the 2FA step in the browser.
 *
 * mail.tm is a free REST API, no API key required:
 *   POST /accounts  — create a mailbox (address + password)
 *   POST /token     — exchange credentials for a JWT
 *   GET  /messages  — list inbox
 *   GET  /messages/{id} — full message (includes plaintext `text`)
 *
 * Env used:
 *   MAILTM_ADDRESS  — mailbox address (required for the real path)
 *   MAILTM_PASSWORD — mailbox password (required for the real path)
 *
 * In Clerk dev mode the "new device verification" OTP email is delivered
 * to the real inbox (verified against this project's dev instance), unlike
 * standard email-verification codes which test mode replaces with 424242.
 * `fetchClerkOtpFromMailbox` therefore polls the real inbox; callers fall
 * back to the documented dev-mode constant 424242 only when the mailbox is
 * unavailable.
 */

const MAILTM_API = "https://api.mail.tm";

export interface MailtmSession {
  address: string;
  token: string;
}

/** Log into an existing mailbox, or create it if it doesn't exist yet. */
export async function loginOrCreateMailbox(opts: {
  address: string;
  password: string;
}): Promise<MailtmSession> {
  let res = await fetch(`${MAILTM_API}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: opts.address, password: opts.password }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const create = await fetch(`${MAILTM_API}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: opts.address, password: opts.password }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!create.ok) {
      throw new Error(
        `mail.tm: could not log in or create ${opts.address} (login ${res.status}, create ${create.status})`,
      );
    }
    res = await fetch(`${MAILTM_API}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: opts.address, password: opts.password }),
      signal: AbortSignal.timeout(15_000),
    });
  }
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error("mail.tm: login returned no token");
  return { address: opts.address, token: body.token };
}

interface MailtmMessage {
  id: string;
  from?: { address?: string };
  subject?: string;
  text?: string;
  createdAt?: string;
}

/** Fetch every message currently in the inbox, enriched with plaintext bodies. */
async function listMessages(session: MailtmSession): Promise<MailtmMessage[]> {
  const res = await fetch(`${MAILTM_API}/messages`, {
    headers: { Authorization: `Bearer ${session.token}` },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json()) as MailtmMessage[] | { "hydra:member"?: MailtmMessage[] };
  const list = Array.isArray(body) ? body : (body["hydra:member"] ?? []);
  const full: MailtmMessage[] = [];
  for (const m of list) {
    const detail = await fetch(`${MAILTM_API}/messages/${m.id}`, {
      headers: { Authorization: `Bearer ${session.token}` },
      signal: AbortSignal.timeout(15_000),
    });
    const d = (await detail.json()) as MailtmMessage;
    full.push({ ...m, text: d.text ?? m.text });
  }
  return full;
}

/** Delete a message so stale OTPs can't confuse the next run. */
async function deleteMessage(session: MailtmSession, id: string): Promise<void> {
  await fetch(`${MAILTM_API}/messages/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.token}` },
    signal: AbortSignal.timeout(15_000),
  }).catch(() => {});
}

/**
 * Poll the mailbox until a Clerk OTP email arrives and return the code.
 * Returns null on timeout so callers can fall back to the dev-mode code.
 */
export async function fetchClerkOtpFromMailbox(
  session: MailtmSession,
  opts: { timeoutMs?: number; pollMs?: number; fromDomain?: string } = {},
): Promise<string | null> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const pollMs = opts.pollMs ?? 5_000;
  const started = Date.now();
  const fromDomain = opts.fromDomain ?? "accounts.dev";
  while (Date.now() - started < timeoutMs) {
    try {
      const messages = await listMessages(session);
      // Only codes from emails that arrived AFTER the poll started count —
      // the mailbox accumulates stale OTP emails from earlier sign-in
      // attempts, and submitting an old (already consumed/expired) code
      // fails with "Incorrect code".
      const freshClerkMails = messages.filter((m) => {
        const createdAt = m.createdAt ? Date.parse(m.createdAt) : NaN;
        const isFresh = !Number.isNaN(createdAt) && createdAt >= started - 10_000;
        const isClerk =
          (m.from?.address ?? "").toLowerCase().includes(fromDomain.toLowerCase()) ||
          (m.subject ?? "").toLowerCase().includes("verification") ||
          (m.subject ?? "").toLowerCase().includes("otp") ||
          (m.subject ?? "").toLowerCase().includes("code");
        return isFresh && isClerk;
      });
      // Newest first (most likely to be the code for THIS attempt).
      freshClerkMails.sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""));
      const clerkMail = freshClerkMails[0];
      if (clerkMail?.text) {
        // Clerk OTP emails read "614477 is your OTP code for ..." or
        // "Your verification code is 123456".
        const code = clerkMail.text.match(/\b(\d{6})\b/)?.[1] ?? null;
        if (code) {
          await deleteMessage(session, clerkMail.id);
          return code;
        }
      }
    } catch (err) {
      // Transient mailbox error — keep polling until the timeout.
      console.warn(`[mailtm] poll error: ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return null;
}

/** True when the mailbox env vars are present (the real-code path is usable). */
export function hasMailboxCredentials(): boolean {
  return Boolean(process.env.MAILTM_ADDRESS && process.env.MAILTM_PASSWORD);
}
