import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactInfo, InsertContactInfo } from "@workspace/supabase/types";
import { sanitizeUrl } from "./utils";

export async function getContactInfo(
  supabase: SupabaseClient,
): Promise<ContactInfo | null> {
  const { data, error } = await supabase
    .from("contact_info")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertContactInfo(
  supabase: SupabaseClient,
  args: Omit<Partial<InsertContactInfo>, 'id' | 'created_at'>,
): Promise<string> {
  const existing = await getContactInfo(supabase);
  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from("contact_info")
      .update({ ...args, updated_at: now })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase
    .from("contact_info")
    .insert({
      email: args.email ?? "mustafasayedsaeed@outlook.com",
      phone: args.phone ?? "+20 100 000 0000",
      location: args.location ?? "Cairo, Egypt",
      github: sanitizeUrl(args.github) ?? "https://github.com/mustafasayed",
      linkedin: sanitizeUrl(args.linkedin) ?? "https://linkedin.com/in/mustafasayed",
      whatsapp: args.whatsapp ?? null,
      map_embed_url: sanitizeUrl(args.map_embed_url),
      availability_status: args.availability_status ?? "Open to opportunities",
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
