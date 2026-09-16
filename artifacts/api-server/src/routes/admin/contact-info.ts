import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getContactInfo } from "@workspace/db/contact-info";
import { singletonUpsert } from "@workspace/db/singleton-upsert";
import { ok, badRequest, serverError } from "../../lib/api-response";
import { respondDbError } from "../../lib/safe-error";
import { resolveActivePortfolioOr400 } from "../../lib/active-portfolio";

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

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
    const data = await getContactInfo(supabase);
    return ok(res, data);
  } catch (err: unknown) {
    return respondDbError(res, err);
  }
});

router.put("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = contactInfoSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
    const activePortfolioId = await resolveActivePortfolioOr400(req, res);
    if (activePortfolioId === null) return res;
    await singletonUpsert(supabase, "contact_info", result.data, { portfolioId: activePortfolioId });
    return ok(res, undefined);
  } catch (err: unknown) {
    req.log.error({ err }, "contact_info upsert failed");
    return respondDbError(res, err);
  }
});

export default router;
