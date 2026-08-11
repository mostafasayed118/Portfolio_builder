import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { aboutSchema } from "@workspace/api-zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { singletonUpsert } from "../../lib/singleton-upsert";
import { ok, badRequest, serverError } from "../../lib/api-response";
import { logSupabaseError } from "../../lib/route-helpers";

const router: IRouter = Router();

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("about_content").select("*").limit(1).maybeSingle();
  if (error) {
    logSupabaseError(req, {
      route: "GET /about",
      method: "GET",
      targetTable: "about_content",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, error);
    return serverError(res, error.message);
  }
  return ok(res, data);
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = aboutSchema.partial().safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await singletonUpsert(supabase, "about_content", { ...result.data, is_published: true });
    return ok(res, undefined);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logSupabaseError(req, {
      route: "PUT /about",
      method: "PUT",
      targetTable: "about_content",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, { message }, { operation: "singletonUpsert" });
    return serverError(res, message);
  }
});

export default router;
