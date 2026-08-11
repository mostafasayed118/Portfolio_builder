import type { SupabaseClient } from "@supabase/supabase-js";
import type { AboutContent, InsertAboutContent } from "@workspace/supabase/types";
import { queryOrThrow } from "./query";

export type { AboutContent };

export async function getAboutContent(
  supabase: SupabaseClient,
): Promise<AboutContent | null> {
  return queryOrThrow(
    supabase.from("about_content").select("*").limit(1).maybeSingle(),
    { table: "about_content", operation: "getAboutContent" },
  );
}

export async function upsertAboutContent(
  supabase: SupabaseClient,
  args: Omit<Partial<InsertAboutContent>, 'id' | 'created_at'>,
): Promise<string> {
  const existing = await getAboutContent(supabase);
  const now = new Date().toISOString();
  if (existing) {
    await queryOrThrow(
      supabase.from("about_content").update({ ...args, updated_at: now }).eq("id", existing.id),
      { table: "about_content", operation: "upsertAboutContent.update" },
    );
    return existing.id;
  }
  const data = await queryOrThrow<{ id: string }>(
    supabase.from("about_content").insert({
      bio1: args.bio1 ?? "Data Engineer with 1+ years of experience building production ETL pipelines.",
      bio2: args.bio2 ?? "Skilled in transforming complex data into actionable insights using modern data stack tools.",
      location: args.location ?? "Cairo, Egypt",
      years_of_experience: args.years_of_experience ?? 1,
      degree: args.degree ?? "B.Sc. Statistics & Computer Science",
      school: args.school ?? "Ain Shams University",
      grade: args.grade ?? "Very Good",
      education_years: args.education_years ?? "2020 – 2024",
      languages: args.languages ?? [
        { name: "Arabic", level: 100 },
        { name: "English", level: 85 },
        { name: "French", level: 30 },
      ],
      is_published: args.is_published ?? true,
      updated_at: now,
    }).select("id").single(),
    { table: "about_content", operation: "upsertAboutContent.insert" },
  );
  return data.id;
}
