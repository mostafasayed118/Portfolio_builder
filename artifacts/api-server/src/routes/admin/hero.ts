import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";

const router: IRouter = Router();

const supabase = getSupabaseClient();

const heroSchema = z.object({
  heading: z.string().max(200).optional(),
  heading_ar: z.string().max(200).optional(),
  name: z.string().max(100).optional(),
  name_ar: z.string().max(100).optional(),
  roles: z.array(z.string()).max(20).optional(),
  description: z.string().max(1000).optional(),
  description_ar: z.string().max(1000).optional(),
  github_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  linkedin_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  twitter_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  email: z.string().email().optional().or(z.literal("")).or(z.null()),
  avatar_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  cv_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  site_name: z.string().max(100).optional(),
  logo_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  favicon_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  tagline: z.string().max(200).optional(),
  available: z.boolean().optional(),
  is_published: z.boolean().optional(),
  stats: z.array(z.object({ label: z.string(), value: z.string() })).max(10).optional(),
});

router.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabase.from("hero_content").select("*").limit(1).maybeSingle();
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, data });
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = heroSchema.partial().safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const existing = await supabase.from("hero_content").select("id").limit(1).maybeSingle();
  const payload = { ...result.data, updated_at: new Date().toISOString() };

  let dbResult;
  if (existing.data) {
    dbResult = await supabase.from("hero_content").update(payload).eq("id", existing.data.id);
  } else {
    dbResult = await supabase.from("hero_content").insert({ ...payload, is_published: true }).select("id").single();
  }

  if (dbResult.error) return res.status(500).json({ success: false, message: dbResult.error.message });
  return res.json({ success: true });
});

export default router;
