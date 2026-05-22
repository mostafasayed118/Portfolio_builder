import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";

const router: IRouter = Router();

const supabase = getSupabaseClient();

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

router.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabase.from("theme_settings").select("*").limit(1).maybeSingle();
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, data });
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = themeSettingsSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const existing = await supabase.from("theme_settings").select("id").limit(1).maybeSingle();
  const payload = { ...result.data, updated_at: new Date().toISOString() };

  let dbResult;
  if (existing.data) {
    dbResult = await supabase.from("theme_settings").update(payload).eq("id", existing.data.id);
  } else {
    dbResult = await supabase.from("theme_settings").insert({ ...payload }).select("id").single();
  }

  if (dbResult.error) return res.status(500).json({ success: false, message: dbResult.error.message });
  return res.json({ success: true });
});

export default router;
