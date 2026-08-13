import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { singletonUpsert } from "../../lib/singleton-upsert";
import { ok, badRequest, serverError } from "../../lib/api-response";

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
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
  if (error) return serverError(res, error.message);
  return ok(res, data);
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = siteSettingsSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await singletonUpsert(supabase, "site_settings", result.data);
    return ok(res, undefined);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return serverError(res, message);
  }
});

router.patch("/language", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = languageSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await singletonUpsert(supabase, "site_settings", { default_language: result.data.default_language });
    return ok(res, undefined);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return serverError(res, message);
  }
});

export default router;
