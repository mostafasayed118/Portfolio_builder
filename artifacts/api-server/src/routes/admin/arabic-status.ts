import { Router, type IRouter } from "express";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { getArabicTranslationStatus } from "@workspace/db/arabic-status";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, serverError } from "../../lib/api-response";
import { safeErrorMessage } from "../../lib/safe-error";
import { logSupabaseError } from "../../lib/route-helpers";

const router: IRouter = Router();

/**
 * GET /api/v1/admin/arabic-status — Arabic translation coverage per content
 * table, for the admin Site Settings status card. Replaces the component's
 * five direct anon-key Supabase queries with one admin-API aggregate.
 *
 * Auth is enforced by the shared `adminAuth` middleware mounted on the
 * /admin router in v1/index.ts.
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = await getArabicTranslationStatus(getSupabaseClient());
    return ok(res, status);
  } catch (err) {
    logSupabaseError(req, {
      route: "GET /admin/arabic-status",
      method: "GET",
      targetTable: "hero_content|about_content|projects|experience|certifications",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, { message: err instanceof Error ? err.message : String(err) }, { operation: "getArabicTranslationStatus" });
    return serverError(res, safeErrorMessage(err));
  }
});

export default router;
