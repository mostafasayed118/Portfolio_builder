import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { getThemeSettings } from "@workspace/db/theme-settings";
import { getTypographySettings } from "@workspace/db/typography-settings";

type ThemeData = {
  lightPrimary: string; lightAccent: string; lightBackground: string;
  lightForeground: string; lightCard: string; lightBorder: string;
  lightMuted: string; lightMutedForeground: string; lightRing: string;
  darkPrimary: string; darkAccent: string; darkBackground: string;
  darkForeground: string; darkCard: string; darkBorder: string;
  darkMuted: string; darkMutedForeground: string; darkRing: string;
  radius: string;
};

function applyThemeVars(theme: ThemeData) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const p = isDark ? "dark" : "light";

  const vars: Record<string, string> = {
    "--primary": theme[`${p}Primary` as keyof ThemeData] as string,
    "--accent": theme[`${p}Accent` as keyof ThemeData] as string,
    "--background": theme[`${p}Background` as keyof ThemeData] as string,
    "--foreground": theme[`${p}Foreground` as keyof ThemeData] as string,
    "--card": theme[`${p}Card` as keyof ThemeData] as string,
    "--card-foreground": theme[`${p}Foreground` as keyof ThemeData] as string,
    "--border": theme[`${p}Border` as keyof ThemeData] as string,
    "--muted": theme[`${p}Muted` as keyof ThemeData] as string,
    "--muted-foreground": theme[`${p}MutedForeground` as keyof ThemeData] as string,
    "--ring": theme[`${p}Ring` as keyof ThemeData] as string,
    "--radius": theme.radius,
  };

  for (const [prop, val] of Object.entries(vars)) {
    if (val) root.style.setProperty(prop, val);
  }
}

function mapThemeData(data: {
  id: string; mode: string; light_primary: string; light_accent: string;
  light_background: string; light_foreground: string; light_card: string;
  light_border: string; light_muted: string; light_muted_foreground: string;
  light_ring: string; dark_primary: string; dark_accent: string;
  dark_background: string; dark_foreground: string; dark_card: string;
  dark_border: string; dark_muted: string; dark_muted_foreground: string;
  dark_ring: string; radius: string;
}): ThemeData {
  return {
    lightPrimary: data.light_primary, lightAccent: data.light_accent,
    lightBackground: data.light_background, lightForeground: data.light_foreground,
    lightCard: data.light_card, lightBorder: data.light_border,
    lightMuted: data.light_muted, lightMutedForeground: data.light_muted_foreground,
    lightRing: data.light_ring,
    darkPrimary: data.dark_primary, darkAccent: data.dark_accent,
    darkBackground: data.dark_background, darkForeground: data.dark_foreground,
    darkCard: data.dark_card, darkBorder: data.dark_border,
    darkMuted: data.dark_muted, darkMutedForeground: data.dark_muted_foreground,
    darkRing: data.dark_ring,
    radius: data.radius,
  };
}

export function useSupabaseTheme() {
  const { data: themeData } = useQuery({
    queryKey: ["themeSettings"],
    queryFn: () => getThemeSettings(getSupabase()),
    enabled: isSupabaseConfigured,
  });

  useEffect(() => {
    if (!themeData) return;
    applyThemeVars(mapThemeData(themeData));
  }, [themeData]);

  useEffect(() => {
    if (!themeData) return;
    const observer = new MutationObserver(() => {
      applyThemeVars(mapThemeData(themeData));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [themeData]);
}

export function useSupabaseTypography() {
  const { data: typoData } = useQuery({
    queryKey: ["typographySettings"],
    queryFn: () => getTypographySettings(getSupabase()),
    enabled: isSupabaseConfigured,
  });

  useEffect(() => {
    if (!typoData) return;
    const root = document.documentElement;
    if (typoData.body_font_url) {
      const existing = document.querySelector(`link[data-font="body"]`);
      if (!existing) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = typoData.body_font_url;
        link.setAttribute("data-font", "body");
        document.head.appendChild(link);
      }
    }
    if (typoData.display_font_url) {
      const existing = document.querySelector(`link[data-font="display"]`);
      if (!existing) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = typoData.display_font_url;
        link.setAttribute("data-font", "display");
        document.head.appendChild(link);
      }
    }
    root.style.setProperty("--font-display", typoData.display_font);
    root.style.setProperty("--font-body", typoData.body_font);
    root.style.setProperty("font-size", typoData.base_font_size);
  }, [typoData]);
}
