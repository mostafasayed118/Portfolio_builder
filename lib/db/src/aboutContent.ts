import type { SupabaseClient } from "@supabase/supabase-js";
import type { AboutContent, InsertAboutContent } from "@workspace/supabase/types";

export type { AboutContent };

export async function getAboutContent(
  supabase: SupabaseClient,
): Promise<AboutContent | null> {
  const { data, error } = await supabase
    .from("about_content")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertAboutContent(
  supabase: SupabaseClient,
  args: Omit<Partial<InsertAboutContent>, 'id' | 'created_at'>,
): Promise<string> {
  const existing = await getAboutContent(supabase);
  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from("about_content")
      .update({ ...args, updated_at: now })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase
    .from("about_content")
    .insert({
      bio1:
        args.bio1 ??
        "Data Engineer with 1+ years of experience building production ETL pipelines.",
      bio2:
        args.bio2 ??
        "Skilled in transforming complex data into actionable insights using modern data stack tools.",
      location: args.location ?? "Cairo, Egypt",
      years_of_experience: args.years_of_experience ?? 1,
      degree: args.degree ?? "B.Sc. Statistics & Computer Science",
      school: args.school ?? "Ain Shams University",
      grade: args.grade ?? "Very Good",
      education_years: args.education_years ?? "2020 – 2024",
      languages: args.languages ?? [
        { lang: "Arabic", level: "Native", pct: 100 },
        { lang: "English", level: "Professional", pct: 85 },
        { lang: "French", level: "Basic", pct: 30 },
      ],
      is_published: args.is_published ?? true,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
