import { Router, type IRouter, type Request, type Response } from "express";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, notFound, serverError } from "../../lib/api-response";

/**
 * GET /api/v1/admin/preview/:entityType/:entityId
 *
 * Returns the raw entity data for any table, bypassing the
 * `is_published` filter. Intended for superadmin preview of
 * draft content before publishing.
 *
 * Unlike the public GET endpoints which filter `.eq("is_published", true)`,
 * this endpoint always returns the row regardless of publish status,
 * but it requires adminAuth middleware (mounted via admin router).
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
  async (req: Request, res: Response) => {
    const entityType = req.params.entityType as string;
    const entityId = req.params.entityId as string;

    if (!VALID_TABLES.has(entityType)) {
      return notFound(res, `Unknown entity type "${entityType}"`);
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(entityType as "hero_content")
        .select("*")
        .eq("id", entityId)
        .maybeSingle();

      if (error) return serverError(res, error.message);
      if (!data) return notFound(res, `No ${entityType} found with id ${entityId}`);

      return ok(res, data);
    } catch (err) {
      req.log?.error({ err }, "Preview endpoint failed");
      return serverError(res, "Preview failed");
    }
  },
);

export default router;
