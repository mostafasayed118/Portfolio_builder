import { useAboutContent } from "@/hooks/use-portfolio-data";
import { ABOUT } from "@/data/portfolio";
import { useLanguage } from "@/lib/language";
import type { TranslationKeys } from "@/i18n";
import type { AboutData } from "@/features/about/types";

function getLevelLabel(level: number, t: TranslationKeys): string {
  const { levels } = t.skills;
  if (level >= 90) return levels.native;
  if (level >= 70) return levels.fluent;
  if (level >= 50) return levels.intermediate;
  if (level >= 30) return levels.basic;
  return levels.beginner;
}

export function useAbout() {
  const { t } = useLanguage();
  const { data: supabaseAbout, isLoading } = useAboutContent();

  const about: AboutData = supabaseAbout
    ? {
        bio1: supabaseAbout.bio1,
        bio2: supabaseAbout.bio2,
        location: supabaseAbout.location,
        yearsOfExperience: supabaseAbout.years_of_experience,
        education: {
          degree: supabaseAbout.degree,
          school: supabaseAbout.school,
          grade: supabaseAbout.grade,
          years: supabaseAbout.education_years,
        },
        languages: Array.isArray(supabaseAbout.languages)
          ? supabaseAbout.languages.map(l => ({ lang: l.name, level: getLevelLabel(l.level, t), pct: Math.min(l.level, 100) }))
          : [],
      }
    : ABOUT;

  return { about, isLoading };
}
