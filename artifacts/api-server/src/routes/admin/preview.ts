import { Router, type IRouter, type Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { ok, notFound, serverError } from "../../lib/api-response";
import { safeErrorMessage } from "../../lib/safe-error";
import { requireSuperadmin } from "../../middleware/requireSuperadmin";

/**
 * GET /api/v1/admin/preview/:entityType/:entityId
 *
 * Returns the raw entity data for any tenanted table, bypassing the
 * `is_published` filter. Intended for superadmin preview of
 * draft content before publishing. Reads go through the request-scoped
 * client, so Postgres RLS (066) restricts results to the caller's own
 * portfolios.
 *
 * Unlike the public GET endpoints which filter `.eq("is_published", true)`,
 * this endpoint always returns the row regardless of publish status. It is
 * gated behind both adminAuth (mounted via admin router) and requireSuperadmin.
 */
const router: IRouter = Router();

const VALID_TABLES = new Set([
  "hero_content",
  "about_content",
  "skills",
  "projects",
  "experience",
  "certifications",
  "theme_settings",
  "typography_settings",
  "seo_settings",
  "section_settings",
  "site_settings",
  "contact_info",
]);

router.get(
  "/:entityType/:entityId",
  requireSuperadmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const entityType = req.params.entityType as string;
    const entityId = req.params.entityId as string;

    if (!VALID_TABLES.has(entityType)) {
      return notFound(res, `Unknown entity type "${entityType}"`);
    }

    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }

    try {
      const { data, error } = await supabase
        .from(entityType as "hero_content")
        .select("*")
        .eq("id", entityId)
        .maybeSingle();

      if (error) return serverError(res, safeErrorMessage(error));
      if (!data) return notFound(res, `No ${entityType} found with id ${entityId}`);

      return ok(res, data);
    } catch (err) {
      req.log?.error({ err }, "Preview endpoint failed");
      return serverError(res, "Preview failed");
    }
  },
);

export default router;
