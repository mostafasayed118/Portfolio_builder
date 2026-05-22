import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";

const router: IRouter = Router();

const supabase = getSupabaseClient();

const skillSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be under 100 characters"),
  category: z.string().min(1, "Category is required"),
  proficiency: z.coerce.number().int().min(0, "Proficiency must be at least 0").max(100, "Proficiency must be at most 100"),
  icon: z.string().optional().or(z.null()),
  sort_order: z.coerce.number().int().optional(),
  is_visible: z.boolean().optional(),
});

router.get("/", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const isSuperadmin = req.user?.role === "superadmin";
  const targetUserId = isSuperadmin && req.query.userId ? req.query.userId as string : userId;

  const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 200);
  const offset = parseInt(req.query.offset as string ?? "0", 10);

  let query = supabase.from("skills").select("*", { count: "exact" }).is("deleted_at", null);

  // Scope by user_id: regular users see only their own, superadmin can view any user's data
  if (targetUserId) {
    query = query.eq("user_id", targetUserId);
  } else if (!isSuperadmin) {
    // If no user context and not superadmin, return empty
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
  const result = skillSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const insertData = { ...result.data, user_id: req.user?.id };
  const { error } = await supabase.from("skills").insert(insertData);
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.status(201).json({ success: true });
});

router.put("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const result = skillSchema.partial().safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("skills").update(result.data).eq("id", req.params.id as string);
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
  let query = supabase.from("skills").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user!.id);
  }
  const { error, count } = await query.select("id");
  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!count || count === 0) return res.status(404).json({ success: false, message: "Skill not found" });
  return res.json({ success: true });
});

export default router;
