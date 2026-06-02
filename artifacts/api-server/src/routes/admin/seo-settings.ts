import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { singletonUpsert } from "../../lib/singleton-upsert";
import { ok, badRequest, serverError } from "../../lib/api-response";

const router: IRouter = Router();

const seoSettingsSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  keywords: z.string().max(500).optional(),
  og_title: z.string().max(200).optional(),
  og_description: z.string().max(500).optional(),
  og_image: z.string().url().optional().or(z.literal("")).or(z.null()),
  canonical_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  twitter_card: z.enum(["summary", "summary_large_image"]).optional(),
  twitter_creator: z.string().max(50).optional().or(z.null()),
});

router.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("seo_settings").select("*").limit(1).maybeSingle();
  if (error) return serverError(res, error.message);
  return ok(res, data);
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = seoSettingsSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await singletonUpsert(supabase, "seo_settings", result.data);
    return ok(res, undefined);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return serverError(res, message);
  }
});

export default router;
