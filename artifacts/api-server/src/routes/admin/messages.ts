import { Router, type IRouter } from "express";
import { z } from "zod";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import { bulkDeleteMessagesSchema } from "@workspace/api-zod";
import type { MsgStatus } from "@workspace/supabase/types";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, badRequest, serverError, notFound } from "../../lib/api-response";
import { sendMessageReply } from "../../lib/mailer";
import {
  runCollectionQuery,
  updateByIdAndUser,
  softDeleteByIdAndUser,
} from "../../lib/route-helpers";

const router: IRouter = Router();

const bulkDeleteSchema = bulkDeleteMessagesSchema;

const replySchema = z.object({
  reply: z.string().trim().min(1, "Reply is required").max(5000, "Reply is too long"),
});

/** Valid values for the list endpoint's `?status=` filter. Omitted = default view. */
const messageStatusSchema = z.enum(["unread", "read", "archived", "all"]).optional();

/**
 * List messages, optionally filtered server-side by status.
 *
 * `?status=unread` / `?status=read` page over exactly those rows — the client
 * must not filter a single fetched page client-side, because once more than
 * the page size of messages exists the unread set silently truncates.
 * `?status=archived` pages over the soft-deleted set (normally hidden by the
 * soft-delete filter). `all` or omitting the param keeps the default view.
 */
router.get("/", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = messageStatusSchema.safeParse(req.query.status);
  if (!parsed.success) {
    return badRequest(res, {
      status: ["status must be one of: unread, read, archived, all"],
    });
  }
  const status = parsed.data;

  return runCollectionQuery(req, res, "messages", {
    softDelete: status === "archived" ? "only" : true,
    orderBy: "created_at",
    orderAsc: false,
    includeOrphans: true,
    filters:
      status === "unread" || status === "read" ? { eq: { status } } : undefined,
  });
});

router.get("/unread-count", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const userId = req.user?.id;
  const isSuperadmin = req.user?.role === "superadmin";
  const targetUserId = isSuperadmin && req.query.userId ? req.query.userId as string : userId;

  let query = supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("status", "unread")
    .is("deleted_at", null);

  if (targetUserId) {
    query = query.or(`user_id.eq.${targetUserId},user_id.is.null`);
  }

  const { count, error } = await query;
  if (error) return serverError(res, error.message);
  return ok(res, count ?? 0);
});

router.patch("/:id/read", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  return updateByIdAndUser(req, res, "messages", req.params.id as string, { status: "read" }, "Message");
});

router.patch("/:id/unread", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  return updateByIdAndUser(req, res, "messages", req.params.id as string, { status: "unread" }, "Message");
});

/**
 * Archive a message — sets `deleted_at` (the soft-delete that hides it from
 * the inbox and the unread count). Reversible via the unarchive endpoint.
 */
router.post("/:id/archive", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  return updateByIdAndUser(
    req,
    res,
    "messages",
    req.params.id as string,
    { deleted_at: new Date().toISOString() },
    "Message",
  );
});

/**
 * Unarchive a message — clears `deleted_at` so it reappears in the inbox.
 */
router.post("/:id/unarchive", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  return updateByIdAndUser(req, res, "messages", req.params.id as string, { deleted_at: null }, "Message");
});

/**
 * Mark every unread message as read in one server-side statement. The list
 * endpoint paginates (50/page), so a client-side loop over the fetched page
 * could never reach all unread rows once more than 50 exist. Same predicate
 * as the unread-count endpoint (status='unread' AND not soft-deleted), with
 * the same user scoping: superadmins mark everything, regular admins only
 * their own rows (or rows with no owner). Returns how many were marked.
 */
router.post("/mark-all-read", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const userId = req.user?.id;
  const isSuperadmin = req.user?.role === "superadmin";

  // User scope matches the unread-count endpoint: superadmins see everything,
  // regular admins only their own rows (or rows with no owner).
  const scope = <T extends { or: (f: string) => T }>(q: T): T =>
    !isSuperadmin && userId ? q.or(`user_id.eq.${userId},user_id.is.null`) : q;

  const { count, error: countError } = await scope(
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "unread")
      .is("deleted_at", null),
  );
  if (countError) return serverError(res, countError.message);

  const { error } = await scope(
    supabase
      .from("messages")
      .update({ status: "read" })
      .eq("status", "unread")
      .is("deleted_at", null),
  );
  if (error) return serverError(res, error.message);
  return ok(res, { marked: count ?? 0 });
});

/**
 * Email predicate for automated test submissions. Shared by the count and
 * update statements so they can never drift apart: any row whose email
 * starts with `e2e-` or `qa.verify.` (the E2E suite and the QA verify
 * fixture), or is exactly `test@test.com` (the generic test inbox), is a
 * test submission — never a real inquiry.
 *
 * One `.or()` expression (not chained `.ilike()`s, which would AND together).
 * All three patterns are ILIKE so matching is case-insensitive; `@` and `.`
 * are literal in ILIKE, so `email.ilike.test@test.com` only ever matches the
 * exact test@test.com address.
 */
const TEST_SUBMISSION_EMAILS =
  "email.ilike.e2e-%,email.ilike.qa.verify.%,email.ilike.test@test.com";

/**
 * One-click cleanup: archive every automated test submission that is still
 * visible. Server-side on purpose — the list endpoint paginates, so the
 * client could never see all rows. Superadmin only: it is a global
 * maintenance action, not a per-user one. Idempotent: re-running only
 * touches rows still visible (deleted_at null).
 */
router.post("/archive-test-submissions", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "superadmin") {
    return res.status(403).json({ success: false, message: "Superadmin required" });
  }
  const supabase = getSupabaseClient();
  // Count the visible test rows first (typed head-count, same as unread-count)
  // so the response can report how many were archived. The update then
  // targets the identical predicate. Any row inserted between the two
  // statements is out of scope for this run — fine for a cleanup tool.
  const { count, error: countError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .or(TEST_SUBMISSION_EMAILS)
    .is("deleted_at", null);
  if (countError) return serverError(res, countError.message);

  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .or(TEST_SUBMISSION_EMAILS)
    .is("deleted_at", null);
  if (error) return serverError(res, error.message);
  return ok(res, { archived: count ?? 0 });
});

router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  return softDeleteByIdAndUser(req, res, "messages", req.params.id as string, "Message");
});

router.post(
  "/:id/reply",
  doubleCsrfProtection,
  validateParamId,
  async (req: AuthenticatedRequest, res: Response) => {
    const supabase = getSupabaseClient();
    const result = replySchema.safeParse(req.body);
    if (!result.success) {
      return badRequest(res, result.error.flatten().fieldErrors);
    }
    const messageId = req.params.id as string;
    const isSuperadmin = req.user?.role === "superadmin";

    let fetchQuery = supabase
      .from("messages")
      .select("id, name, email, message, subject")
      .eq("id", messageId);
    if (!isSuperadmin) {
      fetchQuery = fetchQuery.eq("user_id", req.user?.id ?? "");
    }
    const { data, error } = await fetchQuery.single();
    if (error) {
      return error.code === "PGRST116" ? notFound(res, "Message not found") : serverError(res, error.message);
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
      return serverError(res, update.error.message);
    }

    // Send a branded reply to the original sender (opt-in via Gmail SMTP).
    const sent = await sendMessageReply({
      to: data.email,
      recipientName: data.name,
      reply,
      originalSubject: data.subject,
      quoted: data.message,
    });

    return ok(res, { id: messageId, sent });
  },
);

router.post("/bulk-delete", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = bulkDeleteSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const { ids } = result.data;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("messages").update({ deleted_at: new Date().toISOString() }).in("id", ids);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error } = await query;
  if (error) return serverError(res, error.message);
  return ok(res, undefined);
});

/**
 * Bulk archive — same soft-delete semantics as bulk-delete, named to match
 * the archive/unarchive terminology so inbox cleanup (e.g. E2E test rows)
 * can be done from the UI without direct database access.
 */
router.post("/bulk-archive", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = bulkDeleteSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const { ids } = result.data;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("messages").update({ deleted_at: new Date().toISOString() }).in("id", ids);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error } = await query;
  if (error) return serverError(res, error.message);
  return ok(res, undefined);
});

/**
 * Bulk unarchive — clears `deleted_at` back to null for the whole batch,
 * restoring every row to the inbox in one statement. The inverse of
 * bulk-archive, with the same `{ ids }` contract and user scoping.
 */
router.post("/bulk-unarchive", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = bulkDeleteSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const { ids } = result.data;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("messages").update({ deleted_at: null }).in("id", ids);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error } = await query;
  if (error) return serverError(res, error.message);
  return ok(res, undefined);
});

export default router;
