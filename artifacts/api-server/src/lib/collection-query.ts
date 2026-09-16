import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/adminAuth";
import { serverError, paginated, badRequest } from "./api-response";
import { safeErrorMessage } from "./safe-error";
import { logger } from "./logger";
import { parsePagination } from "./pagination";
import { InvalidTargetUserIdError, resolveTargetUserId } from "./user-scope";

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
 * Run a paginated collection query and send the response.
 *
 * Tenanted collections are scoped by RLS on the JWT-scoped request client
 * (`owner_select_<t>` policies restrict reads to the caller's portfolios),
 * so no `user_id` filter is applied for them — `targetUserId`/`includeOrphans`
 * are ignored. `theme_presets` is the only non-tenanted collection (spec
 * §4.3) and keeps the `user_id` scoping machinery below.
 *
 * Reduces the GET-handler boilerplate from ~25 lines to one call:
 *
 *   const { data, count, error } = await supabase
 *     .from("projects")
 *     .select("*", { count: "exact" })
 *     .is("deleted_at", null)
 *     .order("sort_order");
 *   if (error) return serverError(res, safeErrorMessage(error));
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
export async function runCollectionQuery(
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
    /** Extra filters applied after soft-delete, before user scope and ordering. */
    filters?: {
      /** Applied as `.eq(column, value)` for each entry. */
      eq?: Record<string, string | number | boolean>;
      /** Applied as `.gte(column, value)` for each entry (e.g. `created_at >= today`). */
      gte?: Record<string, string>;
      /** Applied as `.is(column, null)` for each entry (e.g. `replied_at IS NULL`). */
      isNull?: string[];
    };
    /**
     * Raw PostgREST `or()` expression, AND-composed with everything else.
     * Chaining a second `.or()` yields a second `or=` query parameter, which
     * PostgREST combines with AND — so a preset disjunction like
     * `status.eq.unread,deleted_at.not.is.null` correctly ANDs with the user
     * scope's own `.or()` instead of replacing it.
     */
    or?: string;
  } = {},
): Promise<Response> {
  const supabase = req.supabase;
  if (!supabase) {
    return serverError(res, "Request client not initialized");
  }
  const { limit, offset } = parsePagination(req);
  const userColumn = options.userColumn ?? "user_id";

  // Only theme_presets is user-scoped; tenanted tables rely on RLS.
  const isUserScoped = table === "theme_presets" && userColumn === "user_id";

  // Fail closed: a non-UUID ?userId from a superadmin must never reach the
  // PostgREST .or() filter — map it to a 400 before building the query.
  let targetUserId: string | null = null;
  if (isUserScoped) {
    try {
      targetUserId = options.targetUserId ?? resolveTargetUserId(req, req.query.userId as string | undefined);
    } catch (error) {
      if (error instanceof InvalidTargetUserIdError) {
        return badRequest(res, { userId: [error.message] });
      }
      throw error;
    }

    // Non-superadmin with no userId — return an empty paginated result so the
    // response shape matches the normal success path (consumers unwrap `data`
    // and would otherwise receive a bare array).
    if (!targetUserId && req.user?.role !== "superadmin") {
      return paginated(res, [], 0, limit, offset);
    }
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
  if (options.filters?.gte) {
    for (const [column, value] of Object.entries(options.filters.gte)) {
      query = query.gte(column, value);
    }
  }
  if (options.filters?.isNull) {
    for (const column of options.filters.isNull) {
      query = query.is(column, null);
    }
  }
  if (options.or) {
    query = query.or(options.or);
  }

  if (isUserScoped && targetUserId) {
    if (options.includeOrphans) {
      // Also return rows with no owner, in addition to the target user's rows.
      query = query.or(`user_id.eq.${targetUserId},user_id.is.null`);
    } else {
      query = query.eq(userColumn, targetUserId);
    }
  }
  // Tenanted tables: RLS already scoped the query to the caller's portfolios,
  // so no user filter is applied. Superadmin with no explicit target user on
  // theme_presets leaves the query unfiltered ("All users" view).

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
    return serverError(res, safeErrorMessage(error));
  }

  return paginated(res, data ?? [], count ?? 0, limit, offset);
}
