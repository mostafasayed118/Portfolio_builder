import { Router, type IRouter } from "express";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { requireSuperadmin } from "../../middleware/requireSuperadmin";
import type { Response } from "express";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, serverError } from "../../lib/api-response";

const router: IRouter = Router();

/**
 * GET /api/v1/admin/audit
 *
 * Returns content_snapshots (audit trail) ordered by most recent first.
 * Only superadmins can view the audit log.
 * Optional query params:
 *   ?entityType=skills|projects|...
 *   ?entityId=<uuid>
 *   ?limit=<number> (default 50)
 */
router.get("/", requireSuperadmin, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const rawLimit = Number.parseInt(req.query.limit as string, 10);
  const rawOffset = Number.parseInt(req.query.offset as string, 10);
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 200);
  const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);
  const entityType = req.query.entityType as string | undefined;
  const entityId = req.query.entityId as string | undefined;

  let query = supabase
    .from("content_snapshots")
    .select("id, entity_type, entity_id, version, data, changed_by, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (entityType) query = query.eq("entity_type", entityType);
  if (entityId) query = query.eq("entity_id", entityId);

  const { data, error, count } = await query;
  if (error) return serverError(res, error.message);

  return ok(res, {
    data: data ?? [],
    pagination: {
      total: count ?? 0,
      limit,
      offset,
      hasMore: (count ?? 0) > offset + limit,
    },
  });
});

export default router;
