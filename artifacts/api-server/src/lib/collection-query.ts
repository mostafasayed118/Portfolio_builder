import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/adminAuth";
import { ok, serverError } from "./api-response";
import { getSupabaseClient } from "./supabase-client";
import { logger } from "./logger";
import { parsePagination } from "./pagination";
import { resolveTargetUserId } from "./user-scope";

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
    /**
     * `true` → only rows where deleted_at IS NULL (not soft-deleted).
     * `"only"` → only rows where deleted_at IS NOT NULL (soft-deleted only),
     * for views that page through the trash/archived set.
     */
    softDelete?: boolean | "only";
    orderBy?: string;
    orderAsc?: boolean;
    userColumn?: string; // default: "user_id"
    targetUserId?: string | null;
    includeOrphans?: boolean; // also return rows with user_id IS NULL
    /** Extra equality filters applied after soft-delete and user scope, before ordering. */
    filters?: {
      /** Applied as `.eq(column, value)` for each entry. */
      eq?: Record<string, string | number | boolean>;
    };
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

  if (options.softDelete === "only") {
    query = query.not("deleted_at", "is", null);
  } else if (options.softDelete) {
    query = query.is("deleted_at", null);
  }

  if (options.filters?.eq) {
    for (const [column, value] of Object.entries(options.filters.eq)) {
      query = query.eq(column, value);
    }
  }

  if (targetUserId) {
    if (options.includeOrphans) {
      // Public contact-form messages carry no user_id; admins must see them
      // in addition to rows explicitly assigned to themselves.
      query = query.or(`user_id.eq.${targetUserId},user_id.is.null`);
    } else {
      query = query.eq(userColumn, targetUserId);
    }
  }
  // Superadmin with no explicit target user — leave the query unfiltered so
  // “All users” returns every row (owned and unowned alike).

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
