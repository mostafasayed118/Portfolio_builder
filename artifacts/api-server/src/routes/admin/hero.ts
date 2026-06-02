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

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("hero_content").select("*").limit(1).maybeSingle();
  if (error) {
    logSupabaseError(req, {
      route: "GET /hero",
      method: "GET",
      targetTable: "hero_content",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, error);
    return serverError(res, error.message);
  }
  return ok(res, data);
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = heroSchema.partial().safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await singletonUpsert(supabase, "hero_content", { ...result.data, is_published: true });
    return ok(res, undefined);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logSupabaseError(req, {
      route: "PUT /hero",
      method: "PUT",
      targetTable: "hero_content",
      userId: req.user?.id,
      adminEmail: req.adminEmail,
    }, { message }, { operation: "singletonUpsert" });
    return serverError(res, message);
  }
});

export default router;
