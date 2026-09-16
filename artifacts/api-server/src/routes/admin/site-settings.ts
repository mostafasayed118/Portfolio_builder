import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSiteSettings } from "@workspace/db/site-settings";
import { singletonUpsert } from "@workspace/db/singleton-upsert";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, badRequest, serverError } from "../../lib/api-response";
import { safeErrorMessage, serverErrorSafe } from "../../lib/safe-error";

const router: IRouter = Router();

const siteSettingsSchema = z.object({
  site_name: z.string().max(100).optional(),
  site_tagline: z.string().max(200).optional(),
  footer_text: z.string().max(500).optional(),
  copyright_text: z.string().max(200).optional(),
  logo_text: z.string().max(20).optional(),
  default_theme: z.enum(["light", "dark"]).optional(),
  language_mode: z.enum(["en_only", "ar_only", "both"]).optional(),
  default_language: z.enum(["en", "ar"]).optional(),
  show_language_toggle: z.boolean().optional(),
  rtl_enabled: z.boolean().optional(),
});

const languageSchema = z.object({
  default_language: z.enum(["en", "ar"]),
});

router.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getSiteSettings(getSupabaseClient());
    return ok(res, data);
  } catch (err: unknown) {
    return serverError(res, safeErrorMessage(err));
  }
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = siteSettingsSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await singletonUpsert(getSupabaseClient(), "site_settings", result.data);
    return ok(res, undefined);
  } catch (err: unknown) {
    req.log.error({ err }, "site_settings upsert failed");
    return serverErrorSafe(res, err);
  }
});

router.patch("/language", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = languageSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await singletonUpsert(getSupabaseClient(), "site_settings", { default_language: result.data.default_language });
    return ok(res, undefined);
  } catch (err: unknown) {
    req.log.error({ err }, "site_settings upsert failed");
    return serverErrorSafe(res, err);
  }
});

export default router;
