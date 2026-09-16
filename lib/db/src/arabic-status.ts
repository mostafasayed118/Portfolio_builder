import type { SupabaseClient } from "@supabase/supabase-js";
import { queryOrThrowWithCount } from "./query";

/**
 * Arabic translation coverage, matching exactly what the admin
 * ArabicContentStatus card renders: hero/about are "any translated row?"
 * booleans (singleton tables), while projects/experience/certifications
 * report how many rows carry a translated `title_ar`.
 *
 * Each table is counted server-side with a head query (`head: true,
 * count: "exact"`), so no rows are ever transferred — the previous
 * client-side implementation pulled every translated row just to read
 * `data.length`.
 */
export interface ArabicTranslationStatus {
  hero: boolean;
  about: boolean;
  projects: { filled: number };
  experience: { filled: number };
  certifications: { filled: number };
}

/** Head-count rows in `table` whose `column` is not null. */
async function countTranslated(supabase: SupabaseClient, table: string, column: string): Promise<number> {
  const { count } = await queryOrThrowWithCount<unknown>(
    supabase.from(table).select(column, { count: "exact", head: true }).not(column, "is", null),
    { table, operation: "getArabicTranslationStatus" },
  );
  return count;
}

export async function getArabicTranslationStatus(supabase: SupabaseClient): Promise<ArabicTranslationStatus> {
  const [hero, about, projects, experience, certifications] = await Promise.all([
    countTranslated(supabase, "hero_content", "name_ar"),
    countTranslated(supabase, "about_content", "bio_ar"),
    countTranslated(supabase, "projects", "title_ar"),
    countTranslated(supabase, "experience", "title_ar"),
    countTranslated(supabase, "certifications", "title_ar"),
  ]);
  return {
    hero: hero > 0,
    about: about > 0,
    projects: { filled: projects },
    experience: { filled: experience },
    certifications: { filled: certifications },
  };
}
