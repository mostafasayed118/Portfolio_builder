import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, created, notFound, badRequest, serverError } from "../../lib/api-response";
import { runCollectionQuery } from "../../lib/route-helpers";

const router: IRouter = Router();

const skillSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be under 100 characters"),
  category: z.string().min(1, "Category is required"),
  proficiency: z.coerce.number().int().min(0, "Proficiency must be at least 0").max(100, "Proficiency must be at most 100"),
  icon: z.string().optional().or(z.null()),
  sort_order: z.coerce.number().int().optional(),
  is_visible: z.boolean().optional(),
});

router.get("/", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  return runCollectionQuery(req, res, "skills", {
    softDelete: true,
    orderBy: "sort_order",
  });
});

router.post("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = skillSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const insertData = { ...result.data, user_id: req.user?.id };
  const { error } = await supabase.from("skills").insert(insertData);
  if (error) return serverError(res, error.message);
  return created(res);
});

router.put("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = skillSchema.partial().safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("skills").update(result.data).eq("id", req.params.id as string);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error, count } = await query.select("id");
  if (error) return serverError(res, error.message);
  if (!count || count === 0) return notFound(res, "Skill not found");
  return ok(res, null);
});

router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const id = req.params.id as string;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("skills").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error, count } = await query.select("id");
  if (error) return serverError(res, error.message);
  if (!count || count === 0) return notFound(res, "Skill not found");
  return ok(res, null);
});

export default router;
