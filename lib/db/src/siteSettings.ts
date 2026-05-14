import type { SupabaseClient } from "@supabase/supabase-js";
import type { SiteSettings, InsertSiteSettings } from "@workspace/supabase/types";

export async function getSiteSettings(
  supabase: SupabaseClient,
): Promise<SiteSettings | null> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertSiteSettings(
  supabase: SupabaseClient,
  args: Partial<InsertSiteSettings>,
): Promise<string> {
  const existing = await getSiteSettings(supabase);
  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from("site_settings")
      .update({ ...args, updated_at: now })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase
    .from("site_settings")
    .insert({
      site_name: args.site_name ?? "Mustafa Sayed",
      site_tagline: args.site_tagline ?? "Data Engineer",
      footer_text: args.footer_text ?? "Built with ❤️ and a lot of coffee.",
      copyright_text:
        args.copyright_text ??
        `© ${new Date().getFullYear()} Mustafa Sayed. All rights reserved.`,
      logo_text: args.logo_text ?? "MS",
      default_theme: args.default_theme ?? "dark",
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
