import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { aboutSchema } from "@workspace/api-zod";
import { getAboutContent } from "@workspace/db/about-content";
import { singletonUpsert } from "@workspace/db/singleton-upsert";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, badRequest, serverError } from "../../lib/api-response";
import { safeErrorMessage, serverErrorSafe } from "../../lib/safe-error";
import { logSupabaseError } from "../../lib/route-helpers";

const router: IRouter = Router();

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getAboutContent(getSupabaseClient());
    return ok(res, data);
  } catch (err: unknown) {
    logSupabaseError(req, {
      route: "GET /about",
      method: "GET",
      targetTable: "about_content",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, err instanceof Error ? err : { message: String(err) });
    return serverError(res, safeErrorMessage(err));
  }
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = aboutSchema.partial().safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await singletonUpsert(getSupabaseClient(), "about_content", { ...result.data, is_published: true });
    return ok(res, undefined);
  } catch (err: unknown) {
    logSupabaseError(req, {
      route: "PUT /about",
      method: "PUT",
      targetTable: "about_content",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, { message: err instanceof Error ? err.message : String(err) }, { operation: "singletonUpsert" });
    return serverErrorSafe(res, err);
  }
});

export default router;
