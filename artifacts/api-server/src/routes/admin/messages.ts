import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";

const router: IRouter = Router();

const supabase = getSupabaseClient();

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one ID required"),
});

router.get("/", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const isSuperadmin = req.user?.role === "superadmin";
  const targetUserId = isSuperadmin && req.query.userId ? req.query.userId as string : userId;

  const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 200);
  const offset = parseInt(req.query.offset as string ?? "0", 10);

  let query = supabase.from("messages").select("*", { count: "exact" }).is("deleted_at", null);

  if (targetUserId) {
    query = query.eq("user_id", targetUserId);
  } else if (!isSuperadmin) {
    return res.json({ success: true, data: [], pagination: { total: 0, limit, offset, hasMore: false } });
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({
    success: true,
    data,
    pagination: {
      total: count ?? 0,
      limit,
      offset,
      hasMore: (count ?? 0) > offset + limit,
    },
  });
});

router.get("/unread-count", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const isSuperadmin = req.user?.role === "superadmin";
  const targetUserId = isSuperadmin && req.query.userId ? req.query.userId as string : userId;

  let query = supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("status", "unread")
    .is("deleted_at", null);

  if (targetUserId) {
    query = query.eq("user_id", targetUserId);
  }

  const { count, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, data: count ?? 0 });
});

router.patch("/:id/read", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("messages").update({ status: "read" }).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user!.id);
  }
  const { error, count } = await query.select("id");
  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!count || count === 0) return res.status(404).json({ success: false, message: "Message not found" });
  return res.json({ success: true });
});

router.patch("/:id/unread", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("messages").update({ status: "unread" }).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user!.id);
  }
  const { error, count } = await query.select("id");
  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!count || count === 0) return res.status(404).json({ success: false, message: "Message not found" });
  return res.json({ success: true });
});

router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user!.id);
  }
  const { error, count } = await query.select("id");
  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!count || count === 0) return res.status(404).json({ success: false, message: "Message not found" });
  return res.json({ success: true });
});

router.post("/bulk-delete", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = bulkDeleteSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const { ids } = result.data;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("messages").update({ deleted_at: new Date().toISOString() }).in("id", ids);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user!.id);
  }
  const { error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

export default router;
