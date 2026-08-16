import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { chatMessagesSchema } from "@workspace/api-zod";
import { chatLimiter } from "../../middleware/rateLimiter";
import { generateText, isAiConfigured } from "../../lib/ai/client";
import { chatSystemPrompt } from "../../lib/ai/prompts";
import { buildSiteContext } from "../../lib/ai/context";
import { ok, badRequest, serviceUnavailable } from "../../lib/api-response";
import { env } from "../../lib/env";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.get("/config", (_req: Request, res: Response) => {
  return ok(res, { enabled: isAiConfigured() && env.AI_CHAT_ENABLED });
});

router.post("/", chatLimiter, async (req: Request, res: Response) => {
  if (!isAiConfigured() || !env.AI_CHAT_ENABLED) {
    return serviceUnavailable(res, "AI assistant is not configured");
  }
  const parsed = chatMessagesSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const history = parsed.data.messages.slice(-env.AI_CHAT_MAX_TURNS);
  const context = await buildSiteContext();
  const name = env.SITE_NAME || "the site owner";
  try {
    const reply = await generateText({
      messages: [{ role: "system", content: chatSystemPrompt(context, name) }, ...history],
      timeoutMs: env.AI_TIMEOUT_MS,
    });
    return ok(res, { reply });
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "CHAT: AI call failed");
    return serviceUnavailable(res, "Assistant unavailable, please try again");
  }
});

export default router;
