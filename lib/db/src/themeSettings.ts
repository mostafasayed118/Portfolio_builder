import type { SupabaseClient } from "@supabase/supabase-js";
import type { ThemeSettings, InsertThemeSettings } from "@workspace/supabase/types";

export async function getThemeSettings(
  supabase: SupabaseClient,
): Promise<ThemeSettings | null> {
  const { data, error } = await supabase
    .from("theme_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertThemeSettings(
  supabase: SupabaseClient,
  args: Omit<Partial<InsertThemeSettings>, 'id' | 'created_at'>,
): Promise<string> {
  const existing = await getThemeSettings(supabase);
  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from("theme_settings")
      .update({ ...args, updated_at: now })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase
    .from("theme_settings")
    .insert({
      mode: args.mode ?? "light",
      light_primary: args.light_primary ?? "204 92% 42%",
      light_accent: args.light_accent ?? "189 90% 38%",
      light_background: args.light_background ?? "220 30% 97%",
      light_foreground: args.light_foreground ?? "222 40% 10%",
      light_card: args.light_card ?? "0 0% 100%",
      light_border: args.light_border ?? "220 18% 84%",
      light_muted: args.light_muted ?? "220 20% 91%",
      light_muted_foreground: args.light_muted_foreground ?? "220 15% 42%",
      light_ring: args.light_ring ?? "204 92% 45%",
      dark_primary: args.dark_primary ?? "204 92% 62%",
      dark_accent: args.dark_accent ?? "189 95% 53%",
      dark_background: args.dark_background ?? "222 48% 6%",
      dark_foreground: args.dark_foreground ?? "210 30% 96%",
      dark_card: args.dark_card ?? "222 40% 9%",
      dark_border: args.dark_border ?? "220 22% 18%",
      dark_muted: args.dark_muted ?? "222 32% 12%",
      dark_muted_foreground: args.dark_muted_foreground ?? "215 18% 72%",
      dark_ring: args.dark_ring ?? "204 92% 62%",
      radius: args.radius ?? "0.9rem",
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
