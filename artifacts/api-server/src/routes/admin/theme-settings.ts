import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getThemeSettings } from "@workspace/db/theme-settings";
import { singletonUpsert } from "@workspace/db/singleton-upsert";
import { ok, badRequest, serverError } from "../../lib/api-response";
import { respondDbError } from "../../lib/safe-error";
import { resolveActivePortfolioOr400 } from "../../lib/active-portfolio";

const router: IRouter = Router();

const themeSettingsSchema = z.object({
  mode: z.enum(["light", "dark"]).optional(),
  light_primary: z.string().max(50).optional(),
  light_accent: z.string().max(50).optional(),
  light_background: z.string().max(50).optional(),
  light_foreground: z.string().max(50).optional(),
  light_card: z.string().max(50).optional(),
  light_border: z.string().max(50).optional(),
  light_muted: z.string().max(50).optional(),
  light_muted_foreground: z.string().max(50).optional(),
  light_ring: z.string().max(50).optional(),
  dark_primary: z.string().max(50).optional(),
  dark_accent: z.string().max(50).optional(),
  dark_background: z.string().max(50).optional(),
  dark_foreground: z.string().max(50).optional(),
  dark_card: z.string().max(50).optional(),
  dark_border: z.string().max(50).optional(),
  dark_muted: z.string().max(50).optional(),
  dark_muted_foreground: z.string().max(50).optional(),
  dark_ring: z.string().max(50).optional(),
  radius: z.string().max(20).optional(),
});

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
    const data = await getThemeSettings(supabase);
    return ok(res, data);
  } catch (err: unknown) {
    return respondDbError(res, err);
  }
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = themeSettingsSchema.safeParse(req.body);
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
    await singletonUpsert(supabase, "theme_settings", result.data, { portfolioId: activePortfolioId });
    return ok(res, undefined);
  } catch (err: unknown) {
    req.log.error({ err }, "theme_settings upsert failed");
    return respondDbError(res, err);
  }
});

export default router;
