import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "@workspace/supabase/types";

export async function listMessages(
  supabase: SupabaseClient,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function unreadCount(
  supabase: SupabaseClient,
): Promise<number> {
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("status", "unread")
    .is("deleted_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function sendMessage(
  supabase: SupabaseClient,
  args: { name: string; email: string; message: string },
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .insert({
      name: args.name,
      email: args.email,
      message: args.message,
      status: "unread",
      created_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function markMessageRead(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ status: "read" })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllMessagesRead(
  supabase: SupabaseClient,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ status: "read" })
    .eq("status", "unread");
  if (error) throw error;
}

export async function deleteMessage(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function replyToMessage(
  email: string,
  subject: string,
  body: string,
): Promise<string> {
  const mailto = new URL(`mailto:${email}`);
  mailto.searchParams.set("subject", subject);
  mailto.searchParams.set("body", body);
  return mailto.toString();
}
