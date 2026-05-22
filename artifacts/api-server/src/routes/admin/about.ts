import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";

const router: IRouter = Router();

const supabase = getSupabaseClient();

const aboutSchema = z.object({
  bio1: z.string().max(2000).optional(),
  bio2: z.string().max(2000).optional(),
  bio: z.string().max(2000).optional(),
  bio1_ar: z.string().max(2000).optional(),
  bio2_ar: z.string().max(2000).optional(),
  bio_ar: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  years_of_experience: z.coerce.number().int().min(0).optional(),
  degree: z.string().max(200).optional(),
  school: z.string().max(200).optional(),
  grade: z.string().max(100).optional(),
  education_years: z.string().max(50).optional(),
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string(),
    year: z.string(),
    description: z.string().optional()
  })).max(20).optional(),
  languages: z.array(z.object({
    name: z.string(),
    level: z.coerce.number().int().min(0).max(100)
  })).max(30).optional(),
  languages_ar: z.array(z.object({
    name: z.string(),
    level: z.coerce.number().int().min(0).max(100)
  })).max(30).optional(),
  interests: z.array(z.string()).max(20).optional(),
  interests_ar: z.array(z.string()).max(20).optional(),
  is_published: z.boolean().optional(),
});

router.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabase.from("about_content").select("*").limit(1).maybeSingle();
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, data });
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = aboutSchema.partial().safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const existing = await supabase.from("about_content").select("id").limit(1).maybeSingle();
  const payload = { ...result.data, updated_at: new Date().toISOString() };

  let dbResult;
  if (existing.data) {
    dbResult = await supabase.from("about_content").update(payload).eq("id", existing.data.id);
  } else {
    dbResult = await supabase.from("about_content").insert({ ...payload, is_published: true }).select("id").single();
  }

  if (dbResult.error) return res.status(500).json({ success: false, message: dbResult.error.message });
  return res.json({ success: true });
});

export default router;
