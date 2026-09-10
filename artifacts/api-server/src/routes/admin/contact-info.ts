import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { singletonUpsert } from "../../lib/singleton-upsert";
import { ok, badRequest, serverError } from "../../lib/api-response";

const router: IRouter = Router();

const contactInfoSchema = z.object({
  email: z.string().email().optional().or(z.literal("")).or(z.null()),
  phone: z.string().max(20).optional().or(z.null()),
  location: z.string().max(100).optional().or(z.null()),
  address: z.string().max(200).optional().or(z.null()),
  github: z.string().url().optional().or(z.literal("")).or(z.null()),
  linkedin: z.string().url().optional().or(z.literal("")).or(z.null()),
  youtube: z.string().url().optional().or(z.literal("")).or(z.null()),
  facebook: z.string().url().optional().or(z.literal("")).or(z.null()),
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
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("contact_info").select("*").limit(1).maybeSingle();
  if (error) return serverError(res, error.message);
  return ok(res, data);
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = contactInfoSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await singletonUpsert(supabase, "contact_info", result.data);
    return ok(res, undefined);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return serverError(res, message);
  }
});

export default router;
