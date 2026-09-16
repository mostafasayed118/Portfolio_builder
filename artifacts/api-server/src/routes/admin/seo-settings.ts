import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSeoSettings } from "@workspace/db/seo-settings";
import { singletonUpsert } from "@workspace/db/singleton-upsert";
import { ok, badRequest, serverError } from "../../lib/api-response";
import { respondDbError } from "../../lib/safe-error";
import { resolveActivePortfolioOr400 } from "../../lib/active-portfolio";

const router: IRouter = Router();

const seoSettingsSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  keywords: z.string().max(500).optional(),
  og_title: z.string().max(200).optional(),
  og_description: z.string().max(500).optional(),
  og_image: z.string().url().optional().or(z.literal("")).or(z.null()),
  canonical_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  twitter_card: z.enum(["summary", "summary_large_image"]).optional(),
  twitter_creator: z.string().max(50).optional().or(z.null()),
});

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
    const data = await getSeoSettings(supabase);
    return ok(res, data);
  } catch (err: unknown) {
    return respondDbError(res, err);
  }
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = seoSettingsSchema.safeParse(req.body);
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
    await singletonUpsert(supabase, "seo_settings", result.data, { portfolioId: activePortfolioId });
    return ok(res, undefined);
  } catch (err: unknown) {
    req.log.error({ err }, "seo_settings upsert failed");
    return respondDbError(res, err);
  }
});

export default router;
