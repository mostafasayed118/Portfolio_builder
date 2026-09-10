import { z } from "zod";
import { env } from "../env";
import { getSupabaseClient } from "../supabase-client";
import { generateJson } from "./client";
import { spamPrompt } from "./prompts";
import { logger } from "../logger";

export const spamScoreSchema = z.object({
  spam: z.boolean(),
  score: z.number().min(0).max(100),
  reason: z.string(),
});

export type SpamScore = z.infer<typeof spamScoreSchema>;

export async function classifyMessage(name: string, email: string, message: string): Promise<SpamScore> {
  return generateJson<SpamScore>({
    messages: [{ role: "user", content: spamPrompt(name, email, message) }],
    model: env.AI_SPAM_MODEL,
    schema: spamScoreSchema,
    timeoutMs: env.AI_SPAM_TIMEOUT_MS,
  });
}

export async function flagSpamIfNeeded(input: {
  id: string;
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  try {
    const score = await classifyMessage(input.name, input.email, input.message);
    if (score.score >= env.AI_SPAM_THRESHOLD) {
      await getSupabaseClient()
        .from("messages")
        .update({ is_spam: true, spam_score: score.score, spam_reason: score.reason })
        .eq("id", input.id);
    }
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), email_domain: input.email.split("@")[1] ?? null },
      "SPAM: AI scoring failed — message left as unread",
    );
  }
}
