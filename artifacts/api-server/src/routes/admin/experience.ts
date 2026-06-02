import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import type { Database } from "@workspace/supabase/types";
import { ok, created, notFound, badRequest, serverError } from "../../lib/api-response";
import { runCollectionQuery } from "../../lib/route-helpers";

const router: IRouter = Router();

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
  return runCollectionQuery(req, res, "experience", {
    softDelete: true,
    orderBy: "sort_order",
  });
});

router.post("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = experienceSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const insertData = { ...result.data, user_id: req.user?.id, is_published: result.data.is_published ?? true };
  const { error } = await supabase.from("experience").insert(insertData as Database["public"]["Tables"]["experience"]["Insert"]);
  if (error) return serverError(res, error.message);
  return created(res);
});

router.put("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = experienceSchema.partial().safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("experience").update(result.data as Database["public"]["Tables"]["experience"]["Update"]).eq("id", req.params.id as string);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error, count } = await query.select("id");
  if (error) return serverError(res, error.message);
  if (!count || count === 0) return notFound(res, "Experience not found");
  return ok(res, null);
});

router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const id = req.params.id as string;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("experience").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error, count } = await query.select("id");
  if (error) return serverError(res, error.message);
  if (!count || count === 0) return notFound(res, "Experience not found");
  return ok(res, null);
});

export default router;
