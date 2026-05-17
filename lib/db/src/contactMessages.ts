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

export async function insertContactMessage(
  supabase: SupabaseClient,
  data: ContactMessageInput,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("contact_messages").insert({
    name: data.name,
    email: data.email,
    subject: data.subject ?? null,
    message: data.message,
    is_read: false,
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
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function unreadContactMessageCount(
  supabase: SupabaseClient,
): Promise<number> {
  const { count, error } = await supabase
    .from("contact_messages")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}

export async function markContactMessageRead(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("contact_messages")
    .update({ is_read: true })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteContactMessage(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("contact_messages")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function markContactMessageUnread(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("contact_messages")
    .update({ is_read: false })
    .eq("id", id);

  if (error) throw error;
}

export async function bulkDeleteContactMessages(
  supabase: SupabaseClient,
  ids: string[],
): Promise<void> {
  const { error } = await supabase
    .from("contact_messages")
    .delete()
    .in("id", ids);

  if (error) throw error;
}