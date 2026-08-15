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

router.get("/", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  return runCollectionQuery(req, res, "messages", {
    softDelete: true,
    orderBy: "created_at",
    orderAsc: false,
    includeOrphans: true,
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

export default router;
