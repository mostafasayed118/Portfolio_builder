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

const projectSchema = z.object({
  title: z.string().min(1, "Title is required").max(150, "Title must be under 150 characters"),
  slug: z.string().max(150).optional(),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  full_description: z.string().optional(),
  challenges: z.string().optional(),
  outcome: z.string().optional(),
  category: z.string().optional(),
  tech_stack: z.array(z.string()).max(30).optional(),
  tags: z.array(z.string()).max(20).optional(),
  featured: z.boolean().optional(),
  github_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  live_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  image_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  metrics: z.array(z.string()).max(20).optional(),
  sort_order: z.coerce.number().int().optional(),
  is_published: z.boolean().optional(),
});

router.get("/", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  return runCollectionQuery(req, res, "projects", {
    softDelete: true,
    orderBy: "sort_order",
  });
});

router.post("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = projectSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const insertData = { ...result.data, user_id: req.user?.id, is_published: result.data.is_published ?? true };
  const { error } = await supabase.from("projects").insert(insertData);
  if (error) return serverError(res, error.message);
  return created(res);
});

router.put("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = projectSchema.partial().safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("projects").update(result.data).eq("id", req.params.id as string);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error, count } = await query.select("id");
  if (error) return serverError(res, error.message);
  if (!count || count === 0) return notFound(res, "Project not found");
  return ok(res, null);
});

router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const id = req.params.id as string;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error, count } = await query.select("id");
  if (error) return serverError(res, error.message);
  if (!count || count === 0) return notFound(res, "Project not found");
  return ok(res, null);
});

export default router;
