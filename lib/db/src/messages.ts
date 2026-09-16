import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "@workspace/supabase/types";
import { queryOrThrow, queryOrThrowWithCount } from "./query";

export async function listMessages(
  supabase: SupabaseClient,
  limit = 100,
): Promise<Message[]> {
  return queryOrThrow<Message[]>(
    supabase.from("messages").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(limit),
    { table: "messages", operation: "listMessages" },
  );
}

/** Payload for a new contact-form message. */
export interface CreateMessageInput {
  name: string;
  email: string;
  message: string;
}

export async function createMessage(
  supabase: SupabaseClient,
  input: CreateMessageInput,
): Promise<{ id: string }> {
  return queryOrThrow<{ id: string }>(
    supabase
      .from("messages")
      .insert({ ...input, status: "unread" })
      .select("id")
      .single(),
    { table: "messages", operation: "createMessage" },
  );
}

export async function unreadCount(
  supabase: SupabaseClient,
): Promise<number> {
  const { count } = await queryOrThrowWithCount(
    supabase.from("messages").select("*", { count: "exact", head: true }).eq("status", "unread").is("deleted_at", null),
    { table: "messages", operation: "unreadCount" },
  );
  return count;
}

export async function markMessageRead(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  await queryOrThrow(
    supabase.from("messages").update({ status: "read" }).eq("id", id),
    { table: "messages", operation: "markMessageRead" },
  );
}

export async function markAllMessagesRead(
  supabase: SupabaseClient,
): Promise<void> {
  await queryOrThrow(
    supabase.from("messages").update({ status: "read" }).eq("status", "unread"),
    { table: "messages", operation: "markAllMessagesRead" },
  );
}

export async function deleteMessage(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  await queryOrThrow(
    supabase.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", id),
    { table: "messages", operation: "deleteMessage" },
  );
}
