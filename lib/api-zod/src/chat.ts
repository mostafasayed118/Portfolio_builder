import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1, "Message is required").max(4000, "Message is too long"),
});

export const chatMessagesSchema = z.object({
  messages: z.array(chatMessageSchema).min(1, "At least one message is required").max(20, "Too many messages"),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ChatMessagesInput = z.infer<typeof chatMessagesSchema>;
