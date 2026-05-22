import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { fetchLanguageSettings } from "@workspace/db/site-settings";
import { en, ar } from "@/i18n";
import type { TranslationKeys } from "@/i18n";
import type { LanguageSettings } from "@workspace/db/site-settings";

type Language = "en" | "ar";

type LanguageContextType = {
  lang: Language;
  dir: "ltr" | "rtl";
  t: TranslationKeys;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  isArabic: boolean;
  showToggle: boolean;
  langSettings: LanguageSettings | null;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { data: langSettings } = useQuery({
    queryKey: ["language-settings"],
    queryFn: () => {
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");
      return fetchLanguageSettings(sb);
    },
    enabled: isSupabaseConfigured,
    staleTime: 1000 * 60 * 5,
  });

  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    if (!langSettings) return;

    if (langSettings.language_mode === "en_only") {
      setLangState("en");
      return;
    }
    if (langSettings.language_mode === "ar_only") {
      setLangState("ar");
      return;
    }

    const saved = localStorage.getItem("portfolio-lang") as Language | null;
    if (saved && (saved === "en" || saved === "ar")) {
      setLangState(saved);
    } else {
      setLangState(langSettings.default_language);
    }
  }, [langSettings]);

  const dir = (lang === "ar" && langSettings?.rtl_enabled) ? "rtl" : "ltr";
  const t = lang === "ar" ? ar : en;
  const isArabic = lang === "ar";

  const showToggle = langSettings?.language_mode === "both" && langSettings?.show_language_toggle === true;

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    localStorage.setItem("portfolio-lang", lang);
  }, [lang, dir]);

  const setLanguage = (newLang: Language) => {
    if (langSettings?.language_mode === "en_only" && newLang !== "en") return;
    if (langSettings?.language_mode === "ar_only" && newLang !== "ar") return;
    setLangState(newLang);
  };

  const toggleLanguage = () => {
    if (langSettings?.language_mode !== "both") return;
    setLangState((l) => (l === "en" ? "ar" : "en"));
  };

  return (
    <LanguageContext.Provider value={{ lang, dir, t, toggleLanguage, setLanguage, isArabic, showToggle, langSettings: langSettings ?? null }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

export function useT() {
  return useLanguage().t;
}
