import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import { certificationSchema } from "@workspace/api-zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, created, notFound, badRequest, serverError } from "../../lib/api-response";
import { runCollectionQuery } from "../../lib/route-helpers";

const router: IRouter = Router();

router.get("/", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  return runCollectionQuery(req, res, "certifications", {
    softDelete: true,
    orderBy: "sort_order",
  });
});

router.post("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = certificationSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const insertData = { ...result.data, user_id: req.user?.id, is_published: result.data.is_published ?? true };
  const { error } = await supabase.from("certifications").insert(insertData);
  if (error) return serverError(res, error.message);
  return created(res);
});

router.put("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = certificationSchema.partial().safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("certifications").update(result.data).eq("id", req.params.id as string);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error, count } = await query.select("id");
  if (error) return serverError(res, error.message);
  if (!count || count === 0) return notFound(res, "Certification not found");
  return ok(res, undefined);
});

router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const id = req.params.id as string;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("certifications").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error, count } = await query.select("id");
  if (error) return serverError(res, error.message);
  if (!count || count === 0) return notFound(res, "Certification not found");
  return ok(res, undefined);
});

export default router;
