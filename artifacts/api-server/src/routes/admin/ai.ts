import { Router, type IRouter } from "express";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import { aiGenerateSchema, aiImproveSchema } from "@workspace/api-zod";
import { generateText, isAiConfigured } from "../../lib/ai/client";
import { writingPrompt, type ContentType } from "../../lib/ai/prompts";
import { ok, badRequest, serviceUnavailable } from "../../lib/api-response";
import { env } from "../../lib/env";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

async function write(
  res: Response,
  contentType: ContentType,
  text: string,
  instructions?: string,
  context?: string,
): Promise<Response> {
  if (!isAiConfigured() || !env.AI_WRITING_ENABLED) {
    return serviceUnavailable(res, "AI writing is not configured");
  }
  try {
    const result = await generateText({
      messages: [{ role: "user", content: writingPrompt(contentType, text, instructions, context) }],
      timeoutMs: env.AI_TIMEOUT_MS,
    });
    return ok(res, { text: result });
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "AI WRITING: call failed");
    return serviceUnavailable(res, "AI writing unavailable, please try again");
  }
}

router.post("/generate", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = aiGenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const { contentType, instructions, context } = parsed.data;
  return write(res, contentType, "", instructions, context);
});

router.post("/improve", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = aiImproveSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const { contentType, text, instructions } = parsed.data;
  return write(res, contentType, text, instructions);
});

export default router;
