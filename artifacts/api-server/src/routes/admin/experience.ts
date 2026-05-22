import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";

const router: IRouter = Router();

const supabase = getSupabaseClient();

const experienceSchema = z.object({
  title: z.string().min(1, "Title is required").max(150),
  company: z.string().min(1, "Company is required").max(150),
  location: z.string().max(150).optional().or(z.null()),
  period: z.string().max(50).optional().or(z.null()),
  description: z.array(z.string()).max(50).optional(),
  technologies: z.array(z.string()).max(30).optional(),
  type: z.enum(["internship", "certification", "volunteer"]),
  sort_order: z.coerce.number().int().optional(),
  is_published: z.boolean().optional(),
  current: z.boolean().optional(),
});

router.get("/", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const isSuperadmin = req.user?.role === "superadmin";
  const targetUserId = isSuperadmin && req.query.userId ? req.query.userId as string : userId;

  const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 200);
  const offset = parseInt(req.query.offset as string ?? "0", 10);

  let query = supabase.from("experience").select("*", { count: "exact" }).is("deleted_at", null);

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
  const result = experienceSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const insertData = { ...result.data, user_id: req.user!.id, is_published: result.data.is_published ?? true };
  const { error } = await supabase.from("experience").insert(insertData);
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.status(201).json({ success: true });
});

router.put("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const result = experienceSchema.partial().safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("experience").update(result.data).eq("id", req.params.id as string);
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
  let query = supabase.from("experience").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user!.id);
  }
  const { error, count } = await query.select("id");
  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!count || count === 0) return res.status(404).json({ success: false, message: "Experience not found" });
  return res.json({ success: true });
});

export default router;
