import type { SupabaseClient } from "@supabase/supabase-js";
import type { SiteSettings, InsertSiteSettings } from "@workspace/supabase/types";

export type LanguageMode = "en_only" | "ar_only" | "both";

export type LanguageSettings = {
  language_mode: LanguageMode;
  default_language: "en" | "ar";
  show_language_toggle: boolean;
  rtl_enabled: boolean;
};

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

export async function fetchLanguageSettings(
  supabase: SupabaseClient,
): Promise<LanguageSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("language_mode, default_language, show_language_toggle, rtl_enabled")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      language_mode: "en_only",
      default_language: "en",
      show_language_toggle: false,
      rtl_enabled: false,
    };
  }

  return {
    language_mode: (data.language_mode as LanguageMode) ?? "en_only",
    default_language: (data.default_language as "en" | "ar") ?? "en",
    show_language_toggle: data.show_language_toggle ?? false,
    rtl_enabled: data.rtl_enabled ?? false,
  };
}

export async function updateLanguageSettings(
  supabase: SupabaseClient,
  settings: Partial<LanguageSettings>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await getSiteSettings(supabase);
    const now = new Date().toISOString();
    if (existing) {
      const { error } = await supabase
        .from("site_settings")
        .update({ ...settings, updated_at: now })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("site_settings")
        .insert({
          site_name: "Mustafa Sayed",
          site_tagline: "Data Engineer",
          footer_text: "Built with passion and a lot of coffee.",
          copyright_text: `© ${new Date().getFullYear()} Mustafa Sayed. All rights reserved.`,
          logo_text: "MS",
          default_theme: "dark",
          ...settings,
          updated_at: now,
        });
      if (error) throw error;
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function upsertSiteSettings(
  supabase: SupabaseClient,
  args: Omit<Partial<InsertSiteSettings>, "id" | "created_at">,
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
      ...args,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
