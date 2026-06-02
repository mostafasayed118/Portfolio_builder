import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { singletonUpsert } from "../../lib/singleton-upsert";
import { ok, badRequest, serverError } from "../../lib/api-response";

const router: IRouter = Router();

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
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("typography_settings").select("*").limit(1).maybeSingle();
  if (error) return serverError(res, error.message);
  return ok(res, data);
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = typographySettingsSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await singletonUpsert(supabase, "typography_settings", result.data);
    return ok(res, undefined);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return serverError(res, message);
  }
});

export default router;
