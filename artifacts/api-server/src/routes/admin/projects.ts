import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import { projectSchema } from "@workspace/api-zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { created, badRequest, serverError } from "../../lib/api-response";
import {
  runCollectionQuery,
  updateByIdAndUser,
  softDeleteByIdAndUser,
  parseBody,
} from "../../lib/route-helpers";

const router: IRouter = Router();

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
  const patch = parseBody(res, projectSchema.partial(), req.body);
  if (!patch) return;
  return updateByIdAndUser(req, res, "projects", req.params.id as string, patch, "Project");
});

router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  return softDeleteByIdAndUser(req, res, "projects", req.params.id as string, "Project");
});

export default router;
