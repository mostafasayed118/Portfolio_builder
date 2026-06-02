import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { singletonUpsert } from "../../lib/singleton-upsert";
import { ok, badRequest, serverError } from "../../lib/api-response";

const router: IRouter = Router();

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
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("theme_settings").select("*").limit(1).maybeSingle();
  if (error) return serverError(res, error.message);
  return ok(res, data);
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = themeSettingsSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await singletonUpsert(supabase, "theme_settings", result.data);
    return ok(res, undefined);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return serverError(res, message);
  }
});

export default router;
