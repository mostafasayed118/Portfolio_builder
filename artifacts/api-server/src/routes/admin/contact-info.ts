import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";

const router: IRouter = Router();

const supabase = getSupabaseClient();

const contactInfoSchema = z.object({
  email: z.string().email().optional().or(z.literal("")).or(z.null()),
  phone: z.string().max(20).optional().or(z.null()),
  location: z.string().max(100).optional().or(z.null()),
  address: z.string().max(200).optional().or(z.null()),
  github: z.string().url().optional().or(z.literal("")).or(z.null()),
  linkedin: z.string().url().optional().or(z.literal("")).or(z.null()),
  whatsapp: z.string().max(20).optional().or(z.null()),
  map_embed_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  availability_status: z.string().max(100).optional().or(z.null()),
  working_hours: z.string().max(100).optional().or(z.null()),
  social_links: z.array(z.object({
    platform: z.string(),
    url: z.string(),
  })).max(20).optional(),
});

router.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabase.from("contact_info").select("*").limit(1).maybeSingle();
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, data });
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = contactInfoSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const existing = await supabase.from("contact_info").select("id").limit(1).maybeSingle();
  const payload = { ...result.data, updated_at: new Date().toISOString() };

  let dbResult;
  if (existing.data) {
    dbResult = await supabase.from("contact_info").update(payload).eq("id", existing.data.id);
  } else {
    dbResult = await supabase.from("contact_info").insert({ ...payload }).select("id").single();
  }

  if (dbResult.error) return res.status(500).json({ success: false, message: dbResult.error.message });
  return res.json({ success: true });
});

export default router;
