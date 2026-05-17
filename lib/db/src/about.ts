import type { SupabaseClient } from "@supabase/supabase-js";
import type { AboutContent, InsertAboutContent } from "@workspace/supabase/types";

export async function fetchAboutContent(
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
  args: {
    bio?: string;
    education?: { degree: string; institution: string; year: string; description?: string }[];
    languages?: { name: string; level: number }[];
    interests?: string[];
  },
): Promise<string> {
  const existing = await fetchAboutContent(supabase);
  const now = new Date().toISOString();

  const payload: Omit<Partial<InsertAboutContent>, 'id' | 'created_at'> = {
    bio: args.bio ?? null,
    education: args.education ?? [],
    languages: args.languages ?? [],
    interests: args.interests ?? [],
    updated_at: now,
  };

  if (existing) {
    const { error } = await supabase
      .from("about_content")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("about_content")
    .insert({
      bio1: args.bio ?? "",
      bio2: "",
      bio: args.bio ?? null,
      location: "Cairo, Egypt",
      years_of_experience: 1,
      degree: "",
      school: "",
      grade: "",
      education_years: "",
      education: args.education ?? [],
      languages: args.languages ?? [],
      interests: args.interests ?? [],
      is_published: true,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export type { AboutContent };