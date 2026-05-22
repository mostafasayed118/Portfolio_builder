import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";

const router: IRouter = Router();

const supabase = getSupabaseClient();

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
  const { data, error } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, data });
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = siteSettingsSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const existing = await supabase.from("site_settings").select("id").limit(1).maybeSingle();
  const payload = { ...result.data, updated_at: new Date().toISOString() };

  let dbResult;
  if (existing.data) {
    dbResult = await supabase.from("site_settings").update(payload).eq("id", existing.data.id);
  } else {
    dbResult = await supabase.from("site_settings").insert({ ...payload }).select("id").single();
  }

  if (dbResult.error) return res.status(500).json({ success: false, message: dbResult.error.message });
  return res.json({ success: true });
});

router.patch("/language", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = languageSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const existing = await supabase.from("site_settings").select("id").limit(1).maybeSingle();
  const payload = { default_language: result.data.default_language, updated_at: new Date().toISOString() };

  let dbResult;
  if (existing.data) {
    dbResult = await supabase.from("site_settings").update(payload).eq("id", existing.data.id);
  } else {
    dbResult = await supabase.from("site_settings").insert({ ...payload }).select("id").single();
  }

  if (dbResult.error) return res.status(500).json({ success: false, message: dbResult.error.message });
  return res.json({ success: true });
});

export default router;
