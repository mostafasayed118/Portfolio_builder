import { Router, type IRouter } from "express";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { adminListImagesQuerySchema } from "@workspace/api-zod";
import { listEntityImages } from "@workspace/db/images";
import { ok, badRequest, serverError } from "../../lib/api-response";
import { respondDbError } from "../../lib/safe-error";
import { logSupabaseError } from "../../lib/route-helpers";

const router: IRouter = Router();

/** Private bucket every image upload lands in (see routes/images.ts). */
const IMAGE_BUCKET = "project_images";

/**
 * GET /api/v1/admin/images?entity_type=…&entity_id=… — list the image
 * metadata rows attached to an entity with their proxied delivery URLs.
 * Replaces ProjectEditor's direct anon-key Supabase call; delete/reorder
 * already flow through /api/v1/images.
 *
 * Auth is enforced by the shared `adminAuth` middleware mounted on the
 * /admin router in v1/index.ts. `entity_type` is validated against the same
 * allowlist as the upload route (shared schema in @workspace/api-zod).
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const parsed = adminListImagesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (value) fieldErrors[key] = value;
    }
    return badRequest(res, fieldErrors);
  }
  const { entity_type, entity_id } = parsed.data;

  try {
    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
    const rows = await listEntityImages(supabase, entity_type, entity_id);
    return ok(
      res,
      rows.map((row) => ({
        id: row.id,
        url: `/api/v1/images/serve/${IMAGE_BUCKET}/${row.storage_path.split("/").map(encodeURIComponent).join("/")}`,
      })),
    );
  } catch (err) {
    logSupabaseError(req, {
      route: "GET /admin/images",
      method: "GET",
      targetTable: "image_metadata",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, { message: err instanceof Error ? err.message : String(err) }, { operation: "listAdminImages" });
    return respondDbError(res, err);
  }
});

export default router;
