import type { SupabaseClient } from "@supabase/supabase-js";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ContactMessageInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

function mapRow(row: any): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject ?? null,
    message: row.message,
    is_read: row.status !== "unread",
    created_at: row.created_at,
  };
}

export async function insertContactMessage(
  supabase: SupabaseClient,
  data: ContactMessageInput,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("messages").insert({
    name: data.name,
    email: data.email,
    subject: data.subject ?? null,
    message: data.message,
    status: "unread",
    created_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function listContactMessages(
  supabase: SupabaseClient,
): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function unreadContactMessageCount(
  supabase: SupabaseClient,
): Promise<number> {
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("status", "unread");

  if (error) throw error;
  return count ?? 0;
}

export async function markContactMessageRead(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ status: "read" })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteContactMessage(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function markContactMessageUnread(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ status: "unread" })
    .eq("id", id);

  if (error) throw error;
}

export async function bulkDeleteContactMessages(
  supabase: SupabaseClient,
  ids: string[],
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .delete()
    .in("id", ids);

  if (error) throw error;
}