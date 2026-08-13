import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import { skillSchema } from "@workspace/api-zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { created, badRequest, serverError } from "../../lib/api-response";
import { runCollectionQuery, updateByIdAndUser, softDeleteByIdAndUser, parseBody } from "../../lib/route-helpers";

const router: IRouter = Router();

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
  const patch = parseBody(res, skillSchema.partial(), req.body);
  if (!patch) return;
  return updateByIdAndUser(req, res, "skills", req.params.id as string, patch, "Skill");
});

router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  return softDeleteByIdAndUser(req, res, "skills", req.params.id as string, "Skill");
});

export default router;
