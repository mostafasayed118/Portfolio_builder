import type { SupabaseClient } from "@supabase/supabase-js";
import type { Certification, InsertCertification } from "@workspace/supabase/types";

export async function listCertifications(
  supabase: SupabaseClient,
): Promise<Certification[]> {
  const { data, error } = await supabase
    .from("certifications")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCertification(
  supabase: SupabaseClient,
  args: {
    title: string;
    issuer: string;
    issuer_logo: string;
    date: string;
    date_sort: string;
    category: string;
    credential_url: string;
    sort_order: number;
    is_published: boolean;
  },
): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("certifications")
    .insert({
      title: args.title,
      issuer: args.issuer,
      issuer_logo: args.issuer_logo,
      date: args.date,
      date_sort: args.date_sort,
      category: args.category,
      credential_url: args.credential_url,
      sort_order: args.sort_order,
      is_published: args.is_published,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateCertification(
  supabase: SupabaseClient,
  id: string,
  args: Partial<InsertCertification>,
): Promise<void> {
  const { error } = await supabase
    .from("certifications")
    .update({ ...args, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCertification(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("certifications").delete().eq("id", id);
  if (error) throw error;
}
