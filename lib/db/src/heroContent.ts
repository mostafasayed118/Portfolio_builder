import type { SupabaseClient } from "@supabase/supabase-js";
import type { HeroContent, InsertHeroContent } from "@workspace/supabase/types";

export type { HeroContent };

export async function getHeroContent(
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

export async function upsertHeroContent(
  supabase: SupabaseClient,
  args: Omit<Partial<InsertHeroContent>, 'id' | 'created_at'>,
): Promise<string> {
  const existing = await getHeroContent(supabase);
  if (existing) {
    const { error } = await supabase
      .from("hero_content")
      .update({ ...args, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase
    .from("hero_content")
    .insert({
      heading: args.heading ?? "Hi, I'm",
      name: args.name ?? "Mustafa Sayed",
      roles: args.roles ?? ["Data Engineer", "ETL Developer", "Pipeline Architect"],
      description:
        args.description ??
        "Passionate about building scalable data pipelines and transforming raw data into actionable insights.",
      github_url: args.github_url ?? "https://github.com/mustafasayed",
      linkedin_url: args.linkedin_url ?? "https://linkedin.com/in/mustafasayed",
      email: args.email ?? "mustafasayedsaeed@outlook.com",
      available: args.available ?? true,
      site_name: args.site_name ?? null,
      logo_url: args.logo_url ?? null,
      favicon_url: args.favicon_url ?? null,
      tagline: args.tagline ?? null,
      cv_file_name: args.cv_file_name ?? "Mustafa_Sayed_Resume.pdf",
      is_published: args.is_published ?? true,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function seedDefaultHeroContent(
  supabase: SupabaseClient,
): Promise<string | null> {
  const existing = await getHeroContent(supabase);
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("hero_content")
    .insert({
      heading: "Hi, I'm",
      name: "Mustafa Sayed",
      roles: ["Data Engineer", "ETL Developer", "Pipeline Architect", "BI Developer"],
      description:
        "Passionate about building scalable data pipelines, transforming raw data into actionable insights, and architecting robust ETL solutions.",
      github_url: "https://github.com/mustafasayed",
      linkedin_url: "https://linkedin.com/in/mustafasayed",
      email: "mustafasayedsaeed@outlook.com",
      available: true,
      cv_file_name: "Mustafa_Sayed_Resume.pdf",
      is_published: true,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
