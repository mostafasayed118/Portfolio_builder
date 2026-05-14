import type { SupabaseClient } from "@supabase/supabase-js";
import type { CvSettings, InsertCvSettings } from "@workspace/supabase/types";

export async function getLatestCvSettings(
  supabase: SupabaseClient,
): Promise<CvSettings | null> {
  const { data, error } = await supabase
    .from("cv_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertCvSettings(
  supabase: SupabaseClient,
  args: { object_path: string; file_name: string },
): Promise<string> {
  const existing = await getLatestCvSettings(supabase);
  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from("cv_settings")
      .update({
        object_path: args.object_path,
        file_name: args.file_name,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase
    .from("cv_settings")
    .insert({
      object_path: args.object_path,
      file_name: args.file_name,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
