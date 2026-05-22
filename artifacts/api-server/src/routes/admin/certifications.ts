import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import { certificationSchema } from "@workspace/api-zod";
import { getSupabaseClient } from "../../lib/supabase-client";

const router: IRouter = Router();

const supabase = getSupabaseClient();

router.get("/", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const isSuperadmin = req.user?.role === "superadmin";
  const targetUserId = isSuperadmin && req.query.userId ? req.query.userId as string : userId;

  const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 200);
  const offset = parseInt(req.query.offset as string ?? "0", 10);

  let query = supabase.from("certifications").select("*", { count: "exact" }).is("deleted_at", null);

  if (targetUserId) {
    query = query.eq("user_id", targetUserId);
  } else if (!isSuperadmin) {
    return res.json({ success: true, data: [], pagination: { total: 0, limit, offset, hasMore: false } });
  }

  const { data, error, count } = await query
    .order("sort_order")
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

router.post("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = certificationSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const insertData = { ...result.data, user_id: req.user?.id, is_published: result.data.is_published ?? true };
  const { error } = await supabase.from("certifications").insert(insertData);
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.status(201).json({ success: true });
});

router.put("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const result = certificationSchema.partial().safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("certifications").update(result.data).eq("id", req.params.id as string);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user!.id);
  }
  const { error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("certifications").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user!.id);
  }
  const { error, count } = await query.select("id");
  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!count || count === 0) return res.status(404).json({ success: false, message: "Certification not found" });
  return res.json({ success: true });
});

export default router;
