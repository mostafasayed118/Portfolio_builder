import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { ok, badRequest, serverError } from "../api-response";
import { respondDbError } from "../safe-error";
import { applyViewSpec, viewSpec, type MessagePreset, type MessageStatus } from "./view-spec";
import { scopeMessagesQuery } from "./scope";

export interface BulkActionBody {
  ids?: string[];
  filter?: { status?: MessageStatus; preset?: MessagePreset };
}

/**
 * Structural type every bulk schema satisfies — the real api-zod schemas are
 * passed in verbatim by the route; the shape is spelled out so the handler
 * only depends on `safeParse` + `flatten`.
 */
export interface BulkActionSchema {
  safeParse(input: unknown):
    | { success: true; data: BulkActionBody }
    | {
        success: false;
        error: { flatten(): { fieldErrors: Record<string, string[]>; formErrors: string[] } };
      };
}

/**
 * Shared skeleton for the three bulk endpoints — identical parse → scope →
 * update → respond flows differing only in schema, patch payload, and (for
 * filter-based bulk-archive/unarchive) the view predicates applied.
 */
export function bulkSoftDeleteHandler(
  schema: BulkActionSchema,
  // Factory, not a value: the timestamp must be computed per request, not
  // once at module load when the route is registered.
  getDeletedAt: () => string | null,
) {
  return async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
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
    if (error) return respondDbError(res, error);
    return ok(res, undefined);
  };
}
