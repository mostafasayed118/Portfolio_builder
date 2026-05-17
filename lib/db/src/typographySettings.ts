import type { SupabaseClient } from "@supabase/supabase-js";
import type { TypographySettings, InsertTypographySettings } from "@workspace/supabase/types";

export async function getTypographySettings(
  supabase: SupabaseClient,
): Promise<TypographySettings | null> {
  const { data, error } = await supabase
    .from("typography_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertTypographySettings(
  supabase: SupabaseClient,
  args: Omit<Partial<InsertTypographySettings>, 'id' | 'created_at'>,
): Promise<string> {
  const existing = await getTypographySettings(supabase);
  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from("typography_settings")
      .update({ ...args, updated_at: now })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase
    .from("typography_settings")
    .insert({
      body_font: args.body_font ?? "Spline Sans",
      display_font: args.display_font ?? "Unbounded",
      body_font_url: args.body_font_url ?? null,
      display_font_url: args.display_font_url ?? null,
      base_font_size: args.base_font_size ?? "16px",
      line_height: args.line_height ?? "1.6",
      letter_spacing: args.letter_spacing ?? "0em",
      heading_scale: args.heading_scale ?? "1.25",
      font_weight_body: args.font_weight_body ?? "400",
      font_weight_heading: args.font_weight_heading ?? "700",
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
