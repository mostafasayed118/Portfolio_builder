import { z } from "zod";
import type { MsgStatus } from "@workspace/supabase/types";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { safeErrorMessage } from "../safe-error";
import { sendMessageReply } from "../mailer";
import { scopeMessagesQuery } from "./scope";

export const replySchema = z.object({
  reply: z.string().trim().min(1, "Reply is required").max(5000, "Reply is too long"),
});

/**
 * Outcome of the reply flow — the route maps each variant to the exact same
 * envelope/status the inline handler used to produce:
 *   - `invalid_body` → 400 `{ success: false, errors: fieldErrors }`
 *   - `not_found`    → 404 `{ success: false, message }`
 *   - `db_error`     → 500 `{ success: false, message }` (already sanitized)
 *   - `ok`           → 200 `{ success: true, data: { id, sent } }`
 */
export type ReplyOutcome =
  | { ok: true; sent: boolean }
  | { ok: false; kind: "invalid_body"; fieldErrors: Record<string, string[]> }
  | { ok: false; kind: "not_found"; message: string }
  | { ok: false; kind: "db_error"; message: string };

type ReplySender = typeof sendMessageReply;

/**
 * Reply to a message by id: validate the reply body, fetch the message
 * scoped to the requesting admin, persist the reply draft + `replied_at` +
 * `status: "read"`, then email the original sender (opt-in via Gmail SMTP).
 *
 * `sendReply` is injectable so tests can observe the mail call without
 * mocking first-party modules; production always uses `sendMessageReply`.
 */
export async function replyToMessage(
  req: AuthenticatedRequest,
  messageId: string,
  body: unknown,
  sendReply: ReplySender = sendMessageReply,
): Promise<ReplyOutcome> {
  const supabase = req.supabase;
  if (!supabase) {
    return { ok: false, kind: "db_error", message: "Request client not initialized" };
  }
  const result = replySchema.safeParse(body);
  if (!result.success) {
    return { ok: false, kind: "invalid_body", fieldErrors: result.error.flatten().fieldErrors };
  }

  const fetchQuery = scopeMessagesQuery(
    supabase.from("messages").select("id, name, email, message, subject").eq("id", messageId),
    req,
  );
  const { data, error } = await fetchQuery.maybeSingle();
  if (error) {
    return { ok: false, kind: "db_error", message: safeErrorMessage(error) };
  }
  if (!data) {
    return { ok: false, kind: "not_found", message: "Message not found" };
  }

  const reply = result.data.reply;
  const updated: {
    reply_email_draft: string;
    replied_at: string;
    status: MsgStatus;
  } = {
    reply_email_draft: reply,
    replied_at: new Date().toISOString(),
    status: "read",
  };

  const update = await supabase.from("messages").update(updated).eq("id", messageId);
  if (update.error) {
    return { ok: false, kind: "db_error", message: safeErrorMessage(update.error) };
  }

  // Send a branded reply to the original sender (opt-in via Gmail SMTP).
  const sent = await sendReply({
    to: data.email,
    recipientName: data.name,
    reply,
    originalSubject: data.subject,
    quoted: data.message,
  });

  return { ok: true, sent };
}
