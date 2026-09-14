import { Router, type IRouter } from "express";
import { z } from "zod";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { requireSuperadmin } from "../../middleware/requireSuperadmin";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import {
  bulkDeleteMessagesSchema,
  bulkArchiveMessagesSchema,
  bulkUnarchiveMessagesSchema,
} from "@workspace/api-zod";
import type { MsgStatus } from "@workspace/supabase/types";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, badRequest, serverError, notFound } from "../../lib/api-response";
import { safeErrorMessage } from "../../lib/safe-error";
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
const messageStatusSchema = z.enum(["unread", "read", "archived", "spam", "all"]).optional();

/** Valid values for the list endpoint's `?preset=` compound views. */
const messagePresetSchema = z.enum(["unread_today", "unread_or_archived", "needs_reply"]).optional();

/**
 * Declarative predicate spec defining a messages view — the SINGLE source of
 * truth shared by the list endpoint and the bulk-archive filter, so the two
 * can never drift apart (list shows a view, bulk-archive archives exactly
 * that view in one statement).
 *
 * - `unread_today` — active unread messages created since UTC midnight.
 * - `needs_reply` — read but never replied to (actionable: the sender is
 *   waiting). `replied_at IS NULL` excludes messages the admin answered.
 * - `unread_or_archived` — every row that is unread OR archived: visible
 *   unread messages plus anything soft-deleted, regardless of its status.
 *   Read-and-visible rows are excluded. One `.or()` disjunction (soft-delete
 *   off, since the clause already covers deleted rows).
 * - `archived` — the soft-deleted set (softDelete: "only").
 * - `unread` / `read` — the active rows with that status.
 * - omitted — every visible row (softDelete: true).
 */
interface ViewSpec {
  softDelete?: boolean | "only";
  eq?: Record<string, string | number | boolean>;
  gte?: Record<string, string>;
  isNull?: string[];
  or?: string;
}

function viewSpec(
  status?: NonNullable<z.infer<typeof messageStatusSchema>>,
  preset?: NonNullable<z.infer<typeof messagePresetSchema>>,
): ViewSpec {
  switch (preset) {
    case "unread_today": {
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      return {
        softDelete: true,
        eq: { status: "unread" },
        gte: { created_at: startOfToday.toISOString() },
      };
    }
    case "needs_reply":
      return { softDelete: true, eq: { status: "read" }, isNull: ["replied_at"] };
    case "unread_or_archived":
      return { or: "status.eq.unread,deleted_at.not.is.null" };
  }
  if (status === "archived") return { softDelete: "only" };
  if (status === "unread" || status === "read") return { softDelete: true, eq: { status } };
  if (status === "spam") return { softDelete: true, eq: { is_spam: true } };
  return { softDelete: true };
}

/**
 * Apply a ViewSpec's predicates to a supabase query chain (list or update).
 * The concrete builder type is preserved through the generic — the internal
 * structural access is only for chaining the filter methods.
 */
function applyViewSpec<Q>(q: Q, spec: ViewSpec): Q {
  const chain = q as unknown as {
    eq(c: string, v: unknown): unknown;
    gte(c: string, v: string): unknown;
    is(c: string, v: null): unknown;
    not(c: string, op: string, v: unknown): unknown;
    or(f: string): unknown;
  };
  let cur: unknown = chain;
  if (spec.softDelete === "only") cur = (cur as typeof chain).not("deleted_at", "is", null);
  else if (spec.softDelete) cur = (cur as typeof chain).is("deleted_at", null);
  for (const [column, value] of Object.entries(spec.eq ?? {})) {
    cur = (cur as typeof chain).eq(column, value);
  }
  for (const [column, value] of Object.entries(spec.gte ?? {})) {
    cur = (cur as typeof chain).gte(column, value);
  }
  for (const column of spec.isNull ?? []) {
    cur = (cur as typeof chain).is(column, null);
  }
  if (spec.or) cur = (cur as typeof chain).or(spec.or);
  return cur as Q;
}

/**
 * User scoping for messages queries — the SINGLE implementation shared by
 * every endpoint in this file (previously re-implemented six times inline).
 * Mirrors `runCollectionQuery`'s semantics:
 *   - Superadmin with `?userId=` → that user's rows (plus orphans when
 *     `includeOrphans`, i.e. public contact-form rows with no owner).
 *   - Superadmin without `?userId=` → every row.
 *   - Regular admin → own rows (plus orphans when `includeOrphans`); a
 *     `?userId` they pass is ignored (no privilege escalation). A missing
 *     identity fails closed to `""` (matches nothing).
 */
function scopeMessagesQuery<
  T extends { or(f: string): T; eq(c: string, v: unknown): T },
>(query: T, req: AuthenticatedRequest, opts: { includeOrphans?: boolean } = {}): T {
  const includeOrphans = opts.includeOrphans ?? false;
  const isSuperadmin = req.user?.role === "superadmin";
  const requestedUserId =
    typeof req.query.userId === "string" && req.query.userId.length > 0
      ? req.query.userId
      : undefined;

  if (isSuperadmin) {
    if (requestedUserId) {
      return includeOrphans
        ? query.or(`user_id.eq.${requestedUserId},user_id.is.null`)
        : query.eq("user_id", requestedUserId);
    }
    return query;
  }
  const ownId = req.user?.id ?? "";
  return includeOrphans
    ? query.or(`user_id.eq.${ownId},user_id.is.null`)
    : query.eq("user_id", ownId);
}

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
 * client could never see all rows. Superadmin only (declarative middleware):
 * it is a global maintenance action, not a per-user one. Idempotent:
 * re-running only touches rows still visible (deleted_at null).
 */
router.post("/archive-test-submissions", requireSuperadmin, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
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
  if (countError) return serverError(res, safeErrorMessage(countError));

  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .or(TEST_SUBMISSION_EMAILS)
    .is("deleted_at", null);
  if (error) return serverError(res, safeErrorMessage(error));
  return ok(res, { archived: count ?? 0 });
});

/**
 * Predicate selecting every soft-deleted (archived) row: `deleted_at IS NOT
 * NULL`. Shared by the count and update statements of restore-all-archived so
 * they can never drift apart.
 */
const ARCHIVED_ROWS = ["deleted_at", "is", null] as const;

/**
 * One-click restore: bring every archived (soft-deleted) message back to the
 * inbox in one server-side statement — the inverse of archive-test-submissions,
 * so the whole Archived tab can be emptied in one call. Superadmin only
 * (declarative middleware): it is a global maintenance action. Idempotent:
 * re-running only touches rows still archived (deleted_at NOT NULL).
 */
router.post("/restore-all-archived", requireSuperadmin, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  // Count the archived rows first (typed head-count) so the response can
  // report how many were restored. The update then targets the identical
  // predicate. Any row archived between the two statements is out of scope
  // for this run — fine for a bulk restore tool.
  const { count, error: countError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .not(...ARCHIVED_ROWS);
  if (countError) return serverError(res, safeErrorMessage(countError));

  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: null })
    .not(...ARCHIVED_ROWS);
  if (error) return serverError(res, safeErrorMessage(error));
  return ok(res, { restored: count ?? 0 });
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

    const fetchQuery = scopeMessagesQuery(
      supabase.from("messages").select("id, name, email, message, subject").eq("id", messageId),
      req,
    );
    const { data, error } = await fetchQuery.maybeSingle();
    if (error) {
      return serverError(res, safeErrorMessage(error));
    }
    if (!data) {
      return notFound(res, "Message not found");
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
      return serverError(res, safeErrorMessage(update.error));
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

/**
 * Shared skeleton for the three bulk endpoints — identical parse → scope →
 * update → respond flows differing only in schema, patch payload, and (for
 * filter-based bulk-archive/unarchive) the view predicates applied.
 */
interface BulkActionBody {
  ids?: string[];
  filter?: { status?: z.infer<typeof messageStatusSchema>; preset?: z.infer<typeof messagePresetSchema> };
}

function bulkSoftDeleteHandler(
  schema: { safeParse(input: unknown): { success: true; data: BulkActionBody } | { success: false; error: { flatten(): { fieldErrors: Record<string, string[]>; formErrors: string[] } } } },
  // Factory, not a value: the timestamp must be computed per request, not
  // once at module load when the route is registered.
  getDeletedAt: () => string | null,
) {
  return async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    const supabase = getSupabaseClient();
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const flat = result.error.flatten();
      return badRequest(res, {
        ...flat.fieldErrors,
        ...(flat.formErrors.length ? { form: flat.formErrors } : {}),
      });
    }
    const { ids, filter } = result.data;
    let query = supabase.from("messages").update({ deleted_at: getDeletedAt() });
    if (ids) {
      query = query.in("id", ids);
    } else if (filter) {
      // Filter-based action: apply the SAME view predicates the list endpoint
      // uses (shared viewSpec), so "archive/restore all matching" is ONE
      // server-side statement regardless of how many rows match — no giant
      // id payload.
      query = applyViewSpec(query, viewSpec(filter.status, filter.preset));
    }
    query = scopeMessagesQuery(query, req);
    const { error } = await query;
    if (error) return serverError(res, safeErrorMessage(error));
    return ok(res, undefined);
  };
}

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
