// Focused modules for pagination, user-scoping, and collection queries, plus
// the small mutation helpers. This file re-exports the split modules so
// existing `import ... from "../lib/route-helpers"` call sites keep working.
export { MAX_LIMIT, DEFAULT_LIMIT, parsePagination } from "./pagination";
export type { PaginationParams } from "./pagination";
export { resolveTargetUserId } from "./user-scope";
export { runCollectionQuery, logSupabaseError } from "./collection-query";
export type { LogContext } from "./collection-query";

import type { Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@workspace/supabase/types";
import type { AuthenticatedRequest } from "../middleware/adminAuth";
import { ok, serverError, notFound, badRequest } from "./api-response";
import { getSupabaseClient } from "./supabase-client";
import { logSupabaseError } from "./collection-query";

/**
 * Update a row by id, optionally scoped to `user_id` (admins who are
 * not superadmins can only mutate their own rows).
 *
 * Sends the response and returns void; the caller should `return` the
 * resolved Promise only if downstream logic depends on the outcome.
 *
 * The patch is a `Record<string, unknown>` because the Supabase generic
 * Update shape is per-table; callers have already validated the patch with
 * a Zod schema (typically `projectSchema.partial()` or equivalent), so the
 * runtime values are safe.
 *
 * `entityName` is the singular display name for 404 messages (e.g. "Project",
 * "Skill"). Defaults to the table name with a trailing "s" stripped.
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
  // Supabase leaves `count` null on `.update().select()`, so the number of
  // matched rows must be read from the returned `data` array — checking
  // `count` made every successful PATCH report a false 404 (the write
  // applied, but the client was told the row didn't exist).
  const { error, data: updated } = await query.select("id");
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
  if (!updated || updated.length === 0) {
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
