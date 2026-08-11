import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "@workspace/supabase/types";
import { queryOrThrow, queryOrThrowWithCount } from "./query";

export async function listMessages(
  supabase: SupabaseClient,
): Promise<Message[]> {
  return queryOrThrow<Message[]>(
    supabase.from("messages").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
    { table: "messages", operation: "listMessages" },
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

export async function sendMessage(
  supabase: SupabaseClient,
  args: { name: string; email: string; message: string },
): Promise<void> {
  await queryOrThrow(
    supabase.from("messages").insert({
      name: args.name, email: args.email, message: args.message,
      status: "unread", created_at: new Date().toISOString(),
    }),
    { table: "messages", operation: "sendMessage" },
  );
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

export function replyToMessage(
  email: string,
  subject: string,
  body: string,
): string {
  const mailto = new URL(`mailto:${email}`);
  mailto.searchParams.set("subject", subject);
  mailto.searchParams.set("body", body);
  return mailto.toString();
}
