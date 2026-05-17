import type { SupabaseClient } from "@supabase/supabase-js";
import type { HeroContent } from "@workspace/supabase/types";

export type { HeroContent } from "@workspace/supabase/types";

export interface HeroFormData {
  name: string;
  typewriter_lines: string[];
  subtitle: string;
  bio: string;
  avatar_url: string;
  cv_url: string;
  site_name: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
  social_links: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    email?: string;
    [key: string]: string | undefined;
  };
  stats: Array<{ label: string; value: string }>;
}

export async function fetchHeroContent(
  supabase: SupabaseClient,
): Promise<HeroContent | null> {
  const { data, error } = await supabase
    .from("hero_content")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

