import type { SupabaseClient } from "@supabase/supabase-js";
import type { SectionSetting, InsertSectionSetting } from "@workspace/supabase/types";

export async function listSectionSettings(
  supabase: SupabaseClient,
): Promise<SectionSetting[]> {
  const { data, error } = await supabase
    .from("section_settings")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function updateSectionSetting(
  supabase: SupabaseClient,
  id: string,
  args: Partial<InsertSectionSetting>,
): Promise<void> {
  const { error } = await supabase
    .from("section_settings")
    .update({ ...args, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function reorderSectionSettings(
  supabase: SupabaseClient,
  items: { id: string; sort_order: number }[],
): Promise<void> {
  const now = new Date().toISOString();
  for (const { id, sort_order } of items) {
    const { error } = await supabase
      .from("section_settings")
      .update({ sort_order, updated_at: now })
      .eq("id", id);
    if (error) throw error;
  }
}
