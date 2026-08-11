import { useState, useEffect } from "react";
import { useHeroContent } from "@/hooks/use-portfolio-data";
import { useMouseTilt } from "@/hooks/use-mouse-tilt";
import { useLanguage } from "@/lib/language";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { trackEvent } from "@workspace/db/analytics";
import { logWarn } from "@/lib/logger";
import { getApiUrl } from "@/lib/env";
import { HERO } from "@/data/portfolio";
import type { HeroData } from "@/features/hero/types";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function useHero() {
  const { data: supabaseHero, isLoading } = useHeroContent();
  const tilt = useMouseTilt(12);
  const { t, isArabic } = useLanguage();
  const reducedMotion = useReducedMotion();
  const apiBase = getApiUrl();
  const cvHref = apiBase ? `${apiBase}/api/v1/cv` : "";

  const hero: HeroData = supabaseHero
    ? {
        heading: supabaseHero.heading,
        name: supabaseHero.name,
        roles: supabaseHero.roles,
        description: supabaseHero.description,
        github: supabaseHero.github_url,
        linkedin: supabaseHero.linkedin_url,
        email: supabaseHero.email,
        available: supabaseHero.available,
        cvFileName: supabaseHero.cv_file_name ?? "Mustafa_Sayed_Resume.pdf",
      }
    : { ...HERO, available: true, cvFileName: "Mustafa_Sayed_Resume.pdf" };

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const trackCvDownload = () => {
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) trackEvent(sb, "cv_download", "/", { source: "hero" }).catch((err) => logWarn("trackEvent failed", err));
    }
  };

  return { hero, isLoading, tilt, t, isArabic, reducedMotion, cvHref, scrollTo, trackCvDownload };
}
