import { Router, type IRouter } from "express";
import type { Response } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { requireSuperadmin } from "../../middleware/requireSuperadmin";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import {
  bulkDeleteMessagesSchema,
  bulkArchiveMessagesSchema,
  bulkUnarchiveMessagesSchema,
} from "@workspace/api-zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, badRequest, serverError, notFound } from "../../lib/api-response";
import { safeErrorMessage } from "../../lib/safe-error";
import {
  runCollectionQuery,
  updateByIdAndUser,
  softDeleteByIdAndUser,
} from "../../lib/route-helpers";
import { messagePresetSchema, messageStatusSchema, viewSpec } from "../../lib/messages/view-spec";
import { scopeMessagesQuery } from "../../lib/messages/scope";
import { bulkSoftDeleteHandler } from "../../lib/messages/bulk";
import { archiveTestSubmissions, restoreAllArchived } from "../../lib/messages/maintenance";
import { replyToMessage } from "../../lib/messages/reply";

const router: IRouter = Router();

const bulkDeleteSchema = bulkDeleteMessagesSchema;

/**
 * List messages, optionally filtered server-side by status or a saved preset.
 *
 * `?status=unread` / `?status=read` page over exactly those rows — the client
 * must not filter a single fetched page client-side, because once more than
 * the page size of messages exists the unread set silently truncates.
 * `?status=archived` pages over the soft-deleted set (normally hidden by the
 * soft-delete filter). `all` or omitting the param keeps the default view.
 * `?preset=` applies one of the compound saved views (mutually exclusive
 * with `status`).
 */
router.get("/", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  const statusResult = messageStatusSchema.safeParse(req.query.status);
  if (!statusResult.success) {
    return badRequest(res, {
      status: ["status must be one of: unread, read, archived, all"],
    });
  }
  const presetResult = messagePresetSchema.safeParse(req.query.preset);
  if (!presetResult.success) {
    return badRequest(res, {
      preset: ["preset must be one of: unread_today, unread_or_archived, needs_reply"],
    });
  }
  const status = statusResult.data;
  const preset = presetResult.data;

  if (status && preset) {
    return badRequest(res, {
      preset: ["preset cannot be combined with status"],
    });
  }

  const spec = viewSpec(status, preset);
  return runCollectionQuery(req, res, "messages", {
    softDelete: spec.softDelete,
    orderBy: "created_at",
    orderAsc: false,
    includeOrphans: true,
    filters: { eq: spec.eq, gte: spec.gte, isNull: spec.isNull },
    or: spec.or,
  });
});

router.get("/unread-count", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();

  // Same scoping as the list endpoint (includeOrphans): a superadmin without
  // an explicit ?userId counts ALL rows — matching what "/" returns — so the
  // badge can never disagree with the inbox it points at.
  const query = scopeMessagesQuery(
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("status", "unread")
      .is("deleted_at", null),
    req,
    { includeOrphans: true },
  );

  const { count, error } = await query;
  if (error) return serverError(res, safeErrorMessage(error));
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
  const scope = <T extends { or(f: string): T; eq(c: string, v: unknown): T }>(q: T): T =>
    scopeMessagesQuery(q, req, { includeOrphans: true });

  const { count, error: countError } = await scope(
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "unread")
      .is("deleted_at", null),
  );
  if (countError) return serverError(res, safeErrorMessage(countError));

  const { error } = await scope(
    supabase
      .from("messages")
      .update({ status: "read" })
      .eq("status", "unread")
      .is("deleted_at", null),
  );
  if (error) return serverError(res, safeErrorMessage(error));
  return ok(res, { marked: count ?? 0 });
});

/**
 * One-click cleanup: archive every automated test submission that is still
 * visible. Server-side on purpose — the list endpoint paginates, so the
 * client could never see all rows. Superadmin only (declarative middleware):
 * it is a global maintenance action, not a per-user one. Idempotent:
 * re-running only touches rows still visible (deleted_at null).
 */
router.post("/archive-test-submissions", requireSuperadmin, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = await archiveTestSubmissions();
  if (!result.ok) return serverError(res, result.message);
  return ok(res, { archived: result.count });
});

/**
 * One-click restore: bring every archived (soft-deleted) message back to the
 * inbox in one server-side statement — the inverse of archive-test-submissions,
 * so the whole Archived tab can be emptied in one call. Superadmin only
 * (declarative middleware): it is a global maintenance action. Idempotent:
 * re-running only touches rows still archived (deleted_at NOT NULL).
 */
router.post("/restore-all-archived", requireSuperadmin, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = await restoreAllArchived();
  if (!result.ok) return serverError(res, result.message);
  return ok(res, { restored: result.count });
});

router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  return softDeleteByIdAndUser(req, res, "messages", req.params.id as string, "Message");
});

router.post(
  "/:id/reply",
  doubleCsrfProtection,
  validateParamId,
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await replyToMessage(req, req.params.id as string, req.body);
    if (!result.ok) {
      if (result.kind === "invalid_body") return badRequest(res, result.fieldErrors);
      if (result.kind === "not_found") return notFound(res, result.message);
      return serverError(res, result.message);
    }
    return ok(res, { id: req.params.id as string, sent: result.sent });
  },
);

router.post("/bulk-delete", doubleCsrfProtection, bulkSoftDeleteHandler(bulkDeleteSchema, () => new Date().toISOString()));

/**
 * Bulk archive — same soft-delete semantics as bulk-delete, named to match
 * the archive/unarchive terminology so inbox cleanup (e.g. E2E test rows)
 * can be done from the UI without direct database access.
 */
router.post("/bulk-archive", doubleCsrfProtection, bulkSoftDeleteHandler(bulkArchiveMessagesSchema, () => new Date().toISOString()));

/**
 * Bulk unarchive — clears `deleted_at` back to null, restoring every row to
 * the inbox in one statement. The inverse of bulk-archive, with the same
 * `{ ids }` OR `{ filter }` contract and user scoping.
 */
router.post("/bulk-unarchive", doubleCsrfProtection, bulkSoftDeleteHandler(bulkUnarchiveMessagesSchema, () => null));

export default router;
