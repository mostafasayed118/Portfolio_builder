import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { sectionSettingSchema, sectionReorderSchema } from "@workspace/api-zod";
import {
  listSectionSettings,
  updateSectionSetting,
  reorderSectionSettings,
} from "@workspace/db/section-settings";
import { getSupabaseClient } from "../../lib/supabase-client";
import { validateParamId } from "../../middleware/validateUuid";
import { ok, badRequest, serverError, notFound } from "../../lib/api-response";
import { safeErrorMessage, serverErrorSafe } from "../../lib/safe-error";
import { logSupabaseError } from "../../lib/route-helpers";

const router: IRouter = Router();

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await listSectionSettings(getSupabaseClient());
    return ok(res, data);
  } catch (err: unknown) {
    logSupabaseError(req, {
      route: "GET /section-settings",
      method: "GET",
      targetTable: "section_settings",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, err instanceof Error ? err : { message: String(err) });
    return serverError(res, safeErrorMessage(err));
  }
});

router.put("/:id", validateParamId, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = sectionSettingSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const matched = await updateSectionSetting(getSupabaseClient(), id, result.data);
    if (matched === 0) return notFound(res, "Section setting not found");
    return ok(res, undefined);
  } catch (err: unknown) {
    logSupabaseError(req, {
      route: "PUT /section-settings/:id",
      method: "PUT",
      targetTable: "section_settings",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, { message: err instanceof Error ? err.message : String(err) }, { operation: "updateSectionSetting" });
    return serverErrorSafe(res, err);
  }
});

router.post("/reorder", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = sectionReorderSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await reorderSectionSettings(getSupabaseClient(), result.data);
    return ok(res, undefined);
  } catch (err: unknown) {
    logSupabaseError(req, {
      route: "POST /section-settings/reorder",
      method: "POST",
      targetTable: "section_settings",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, { message: err instanceof Error ? err.message : String(err) }, { operation: "reorderSectionSettings" });
    return serverErrorSafe(res, err);
  }
});

export default router;
