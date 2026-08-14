import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@workspace/supabase/types";
import type { AuthenticatedRequest } from "../middleware/adminAuth";
import { ok, serverError, notFound, badRequest } from "./api-response";
import { getSupabaseClient } from "./supabase-client";
import { logger } from "./logger";

/**
 * Shared route helpers for collection endpoints.
 *
 * Centralises the pagination + user-scoping pattern that was previously
 * duplicated across every admin collection route (skills, projects,
 * experience, certifications, messages).
 */

export const MAX_LIMIT = 200;
export const DEFAULT_LIMIT = 50;

/** Parsed pagination params with safe defaults and a hard cap. */
export interface PaginationParams {
  limit: number;
  offset: number;
  page: number; // 1-indexed for convenience
}

/**
 * Parse `limit` / `offset` from the query string.
 * Clamps limit to [1, MAX_LIMIT] and offset to >= 0.
 */
export function parsePagination(req: Request): PaginationParams {
  const rawLimit = parseInt((req.query.limit as string) ?? `${DEFAULT_LIMIT}`, 10);
  const rawOffset = parseInt((req.query.offset as string) ?? "0", 10);

  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);
  const page = Math.floor(offset / limit) + 1;

  return { limit, offset, page };
}

/**
 * Compute the target user ID for a scoped collection query.
 *
 *  - Superadmins may pass `?userId=…` to query on behalf of another user.
 *  - Non-superadmins always see their own rows.
 *  - Returns `null` when a non-superadmin has no `req.user.id` — callers
 *    should short-circuit to an empty result.
 */
export function resolveTargetUserId(
  req: AuthenticatedRequest,
  queryUserId?: string,
): string | null {
  const isSuperadmin = req.user?.role === "superadmin";
  const requesterId = req.user?.id ?? null;

  if (isSuperadmin && queryUserId) return queryUserId;
  return requesterId;
}

/** Build a Supabase query scoped to a user (when one is resolved). */
export function scopeToUser<T extends { eq: (col: string, val: string) => T; is: (col: string, val: null) => T }>(
  query: T,
  tableColumn: string,
  userId: string | null,
): T {
  if (!userId) return query;
  return query.eq(tableColumn, userId);
}

export interface LogContext {
  route: string;
  method: string;
  userId?: string;
  adminEmail?: string;
  targetTable?: string;
  targetId?: string;
  queryUserId?: string;
}

/**
 * Log a Supabase error with route context, never leaking the raw
 * `error.message` to the client. The caller decides the HTTP status.
 */
export function logSupabaseError(
  req: Request,
  ctx: LogContext,
  err: { message?: string; code?: string; details?: string; hint?: string },
  extra: Record<string, unknown> = {},
): void {
  logger.error(
    {
      route: ctx.route,
      method: ctx.method,
      userId: ctx.userId,
      adminEmail: ctx.adminEmail,
      targetTable: ctx.targetTable,
      targetId: ctx.targetId,
      queryUserId: ctx.queryUserId,
      err: err.message,
      errCode: err.code,
      errDetails: err.details,
      errHint: err.hint,
      path: req.path,
      ip: req.ip,
      ...extra,
    },
    "DB operation failed",
  );
}

/**
 * Run a paginated, user-scoped collection query and send the response.
 *
 * Reduces the GET-handler boilerplate from ~25 lines to one call:
 *
 *   const { data, count, error } = await supabase
 *     .from("projects")
 *     .select("*", { count: "exact" })
 *     .is("deleted_at", null)
 *     .order("sort_order");
 *   if (error) return serverError(res, error.message);
 *   return paginated(res, data ?? [], count ?? 0, limit, offset);
 *
 * becomes:
 *
 *   return runCollectionQuery(req, res, "projects", {
 *     softDelete: true,
 *     orderBy: "sort_order",
 *   });
 *
 * Returns Response with paginated payload, or an error response on failure.
 */
export async function runCollectionQuery<T = unknown>(
  req: AuthenticatedRequest,
  res: Response,
  table: string,
  options: {
    select?: string;
    softDelete?: boolean;
    orderBy?: string;
    orderAsc?: boolean;
    userColumn?: string; // default: "user_id"
    targetUserId?: string | null;
    includeOrphans?: boolean; // also return rows with user_id IS NULL
  } = {},
): Promise<Response> {
  const supabase = getSupabaseClient();
  const { limit, offset } = parsePagination(req);
  const userColumn = options.userColumn ?? "user_id";
  const targetUserId = options.targetUserId ?? resolveTargetUserId(req, req.query.userId as string | undefined);

  // Non-superadmin with no userId — return an empty paginated result so the
  // response shape matches the normal success path (consumers unwrap `data`
  // and would otherwise receive a bare array).
  if (!targetUserId && req.user?.role !== "superadmin") {
    return ok(res, {
      data: [],
      pagination: { total: 0, limit, offset, hasMore: false },
    }) as Response;
  }

  let query = supabase
    .from(table)
    .select(options.select ?? "*", { count: "exact" });

  if (options.softDelete) {
    query = query.is("deleted_at", null);
  }

  if (targetUserId) {
    if (options.includeOrphans) {
      // Public contact-form messages carry no user_id; admins must see them
      // in addition to rows explicitly assigned to themselves.
      query = query.or(`user_id.eq.${targetUserId},user_id.is.null`);
    } else {
      query = query.eq(userColumn, targetUserId);
    }
  } else if (options.includeOrphans) {
    // Superadmin resolving no explicit target user — show only unowned rows.
    query = query.is(userColumn, null);
  }

  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.orderAsc ?? true });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    logSupabaseError(req, {
      route: `${req.method} /${table}`,
      method: req.method,
      userId: req.user?.id,
      adminEmail: req.adminEmail,
      targetTable: table,
      queryUserId: targetUserId ?? undefined,
    }, error);
    return serverError(res, error.message);
  }

  return ok(res, {
    data: data ?? [],
    pagination: {
      total: count ?? 0,
      limit,
      offset,
      hasMore: (count ?? 0) > offset + limit,
    },
  }) as Response;
}

/**
 * Update a row by id, optionally scoped to `user_id` (admins who are
 * not superadmins can only mutate their own rows).
 *
 * Sends the response and returns void; the caller should `return` the
 * resolved Promise only if downstream logic depends on the outcome.
 *
 * The patch is a `Record<string, unknown>` because the Supabase
 * generic Update shape is per-table; callers have already validated
 * the patch with a Zod schema (typically `projectSchema.partial()`
 * or equivalent), so the runtime values are safe.
 *
 * `entityName` is the singular display name for 404 messages
 * (e.g. "Project", "Skill"). Defaults to the table name with a
 * trailing "s" stripped.
 */
export async function updateByIdAndUser(
  req: AuthenticatedRequest,
  res: Response,
  table: string,
  id: string,
  patch: Record<string, unknown>,
  entityName?: string,
): Promise<void> {
  const supabase = getSupabaseClient() as SupabaseClient<Database>;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from(table).update(patch as never).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error, count } = await query.select("id");
  if (error) {
    logSupabaseError(req, {
      route: `${req.method} /${table}/${id}`,
      method: req.method,
      userId: req.user?.id,
      adminEmail: req.adminEmail,
      targetTable: table,
      targetId: id,
    }, error);
    serverError(res, error.message);
    return;
  }
  if (!count || count === 0) {
    const name = entityName ?? table.replace(/s$/, "");
    notFound(res, `${name.charAt(0).toUpperCase() + name.slice(1)} not found`);
    return;
  }
  ok(res, null);
}

/**
 * Soft-delete a row by id (sets `deleted_at = now()`), optionally scoped
 * to `user_id`. Sends 404 when no row matched.
 */
export async function softDeleteByIdAndUser(
  req: AuthenticatedRequest,
  res: Response,
  table: string,
  id: string,
  entityName?: string,
): Promise<void> {
  await updateByIdAndUser(
    req,
    res,
    table,
    id,
    { deleted_at: new Date().toISOString() },
    entityName,
  );
}

/** Convenience: Zod-parse `req.body` against a schema; sends 400 + returns null on failure. */
export function parseBody<T>(
  res: Response,
  schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: { flatten: () => { fieldErrors: Record<string, string[]> } } } },
  body: unknown,
): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
    return null;
  }
  return result.data;
}

/** Convenience for a Supabase client — exported for tests. */
export function _getSupabase(): SupabaseClient {
  return getSupabaseClient();
}
