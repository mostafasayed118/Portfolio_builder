import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { heroSchema } from "@workspace/api-zod";
import { getHeroContent } from "@workspace/db/hero-content";
import { singletonUpsert } from "@workspace/db/singleton-upsert";
import { ok, badRequest, serverError } from "../../lib/api-response";
import { respondDbError } from "../../lib/safe-error";
import { resolveActivePortfolioOr400 } from "../../lib/active-portfolio";
import { logSupabaseError } from "../../lib/route-helpers";

const router: IRouter = Router();

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
    const data = await getHeroContent(supabase);
    return ok(res, data);
  } catch (err: unknown) {
    logSupabaseError(req, {
      route: "GET /hero",
      method: "GET",
      targetTable: "hero_content",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, err instanceof Error ? err : { message: String(err) });
    return respondDbError(res, err);
  }
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = heroSchema.partial().safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
    const activePortfolioId = await resolveActivePortfolioOr400(req, res);
    if (activePortfolioId === null) return res;
    await singletonUpsert(supabase, "hero_content", { ...result.data, is_published: true }, { portfolioId: activePortfolioId });
    return ok(res, undefined);
  } catch (err: unknown) {
    logSupabaseError(req, {
      route: "PUT /hero",
      method: "PUT",
      targetTable: "hero_content",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, { message: err instanceof Error ? err.message : String(err) }, { operation: "singletonUpsert" });
    return respondDbError(res, err);
  }
});

export default router;
