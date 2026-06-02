import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { singletonUpsert } from "../../lib/singleton-upsert";
import { ok, badRequest, serverError } from "../../lib/api-response";
import { logSupabaseError } from "../../lib/route-helpers";

const router: IRouter = Router();

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

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("about_content").select("*").limit(1).maybeSingle();
  if (error) {
    logSupabaseError(req, {
      route: "GET /about",
      method: "GET",
      targetTable: "about_content",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, error);
    return serverError(res, error.message);
  }
  return ok(res, data);
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = aboutSchema.partial().safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await singletonUpsert(supabase, "about_content", { ...result.data, is_published: true });
    return ok(res, undefined);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logSupabaseError(req, {
      route: "PUT /about",
      method: "PUT",
      targetTable: "about_content",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, { message }, { operation: "singletonUpsert" });
    return serverError(res, message);
  }
});

export default router;
