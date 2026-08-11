import type { SupabaseClient } from "@supabase/supabase-js";
import type { SiteSettings } from "@workspace/supabase/types";
import { queryOrThrow } from "./query";

export type LanguageMode = "en_only" | "ar_only" | "both";

export type LanguageSettings = {
  language_mode: LanguageMode;
  default_language: "en" | "ar";
  show_language_toggle: boolean;
  rtl_enabled: boolean;
};

const TABLE = "site_settings" as const;

export async function getSiteSettings(
  supabase: SupabaseClient,
): Promise<SiteSettings | null> {
  return queryOrThrow(
    supabase.from(TABLE).select("*").limit(1).maybeSingle(),
    { table: TABLE, operation: "getSiteSettings" },
  );
}

export async function fetchLanguageSettings(
  supabase: SupabaseClient,
): Promise<LanguageSettings> {
  const defaults: LanguageSettings = {
    language_mode: "en_only",
    default_language: "en",
    show_language_toggle: false,
    rtl_enabled: false,
  };

  try {
    const data = await queryOrThrow<{
      language_mode: string; default_language: string;
      show_language_toggle: boolean; rtl_enabled: boolean;
    } | null>(
      supabase.from(TABLE).select("language_mode, default_language, show_language_toggle, rtl_enabled").limit(1).maybeSingle(),
      { table: TABLE, operation: "fetchLanguageSettings" },
    );

    if (!data) {
      return defaults;
    }

    return {
      language_mode: (data.language_mode as LanguageMode) ?? "en_only",
      default_language: (data.default_language as "en" | "ar") ?? "en",
      show_language_toggle: data.show_language_toggle ?? false,
      rtl_enabled: data.rtl_enabled ?? false,
    };
  } catch {
    // Graceful degradation: a DB blip must not crash the public site,
    // so fall back to safe English defaults.
    return defaults;
  }
}

export async function updateLanguageSettings(
  supabase: SupabaseClient,
  settings: Partial<LanguageSettings>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await getSiteSettings(supabase);
    const now = new Date().toISOString();
    if (existing) {
      await queryOrThrow(
        supabase.from(TABLE).update({ ...settings, updated_at: now }).eq("id", existing.id),
        { table: TABLE, operation: "updateLanguageSettings.update" },
      );
    } else {
      await queryOrThrow(
        supabase.from(TABLE).insert({
          site_name: "Mustafa Sayed", site_tagline: "Data Engineer",
          footer_text: "Built with passion and a lot of coffee.",
          copyright_text: `© ${new Date().getFullYear()} Mustafa Sayed. All rights reserved.`,
          logo_text: "MS", default_theme: "dark", ...settings, updated_at: now,
        }),
        { table: TABLE, operation: "updateLanguageSettings.insert" },
      );
    }
    return { success: true };
  } catch (err) {
    // Strip the `[table.operation]` triage prefix added by queryOrThrow —
    // this error is surfaced directly to the admin UI toast.
    const raw = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: raw.replace(/^\[[^\]]+\]\s*/, "") };
  }
}

export async function upsertSiteSettings(
  supabase: SupabaseClient,
  updates?: Partial<SiteSettings>,
): Promise<string> {
  const existing = await getSiteSettings(supabase);
  const now = new Date().toISOString();
  if (existing) {
    if (updates && Object.keys(updates).length > 0) {
      await queryOrThrow(
        supabase.from(TABLE).update({ ...updates, updated_at: now }).eq("id", existing.id),
        { table: TABLE, operation: "upsertSiteSettings.update" },
      );
    }
    return existing.id;
  }
  const data = await queryOrThrow<{ id: string }>(
    supabase.from(TABLE).insert({
      site_name: "Mustafa Sayed", site_tagline: "Data Engineer",
      footer_text: "Built with ❤️ and a lot of coffee.",
      copyright_text: `© ${new Date().getFullYear()} Mustafa Sayed. All rights reserved.`,
      logo_text: "MS", default_theme: "dark",
      updated_at: now,
    }).select("id").single(),
    { table: TABLE, operation: "upsertSiteSettings" },
  );
  return data.id;
}
