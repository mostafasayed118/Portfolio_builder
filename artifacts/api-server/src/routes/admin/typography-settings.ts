import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getTypographySettings } from "@workspace/db/typography-settings";
import { singletonUpsert } from "@workspace/db/singleton-upsert";
import { ok, badRequest, serverError } from "../../lib/api-response";
import { respondDbError } from "../../lib/safe-error";
import { resolveActivePortfolioOr400 } from "../../lib/active-portfolio";

const router: IRouter = Router();

const typographySettingsSchema = z.object({
  body_font: z.string().max(100).optional(),
  display_font: z.string().max(100).optional(),
  body_font_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  display_font_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  base_font_size: z.string().max(20).optional(),
  line_height: z.string().max(10).optional(),
  letter_spacing: z.string().max(10).optional(),
  heading_scale: z.string().max(10).optional(),
  font_weight_body: z.string().max(10).optional(),
  font_weight_heading: z.string().max(10).optional(),
});

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
    const data = await getTypographySettings(supabase);
    return ok(res, data);
  } catch (err: unknown) {
    return respondDbError(res, err);
  }
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = typographySettingsSchema.safeParse(req.body);
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
    await singletonUpsert(supabase, "typography_settings", result.data, { portfolioId: activePortfolioId });
    return ok(res, undefined);
  } catch (err: unknown) {
    req.log.error({ err }, "typography_settings upsert failed");
    return respondDbError(res, err);
  }
});

export default router;
