import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";

const router: IRouter = Router();

const supabase = getSupabaseClient();

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

router.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabase.from("typography_settings").select("*").limit(1).maybeSingle();
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, data });
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = typographySettingsSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const existing = await supabase.from("typography_settings").select("id").limit(1).maybeSingle();
  const payload = { ...result.data, updated_at: new Date().toISOString() };

  let dbResult;
  if (existing.data) {
    dbResult = await supabase.from("typography_settings").update(payload).eq("id", existing.data.id);
  } else {
    dbResult = await supabase.from("typography_settings").insert({ ...payload }).select("id").single();
  }

  if (dbResult.error) return res.status(500).json({ success: false, message: dbResult.error.message });
  return res.json({ success: true });
});

export default router;
