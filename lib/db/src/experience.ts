import type { SupabaseClient } from "@supabase/supabase-js";
import type { Experience as DbExperience } from "@workspace/supabase/types";
import { queryOrThrow } from "./query";

export type Experience = DbExperience;

export async function listExperience(
  supabase: SupabaseClient,
): Promise<Experience[]> {
  return queryOrThrow<Experience[]>(
    supabase
      .from("experience")
      .select("*")
      .is("deleted_at", null)
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
    { table: "experience", operation: "listExperience" },
  );
}

export async function createExperience(
  supabase: SupabaseClient,
  args: {
    title: string; company: string; location?: string; period?: string;
    description?: string[]; technologies?: string[];
    type?: "internship" | "certification" | "volunteer";
    sort_order?: number; is_published?: boolean; current?: boolean;
  },
): Promise<string> {
  const now = new Date().toISOString();
  const data = await queryOrThrow<{ id: string }>(
    supabase.from("experience").insert({
      title: args.title, company: args.company,
      location: args.location ?? "", period: args.period ?? "",
      description: args.description ?? [], technologies: args.technologies ?? [],
      type: args.type ?? "internship", sort_order: args.sort_order ?? 0,
      is_published: args.is_published ?? true, current: args.current ?? false,
      created_at: now, updated_at: now,
    }).select("id").single(),
    { table: "experience", operation: "createExperience" },
  );
  return data.id;
}

export async function updateExperience(
  supabase: SupabaseClient,
  id: string,
  args: {
    title?: string; company?: string; location?: string; period?: string;
    description?: string[]; technologies?: string[];
    type?: "internship" | "certification" | "volunteer";
    sort_order?: number; is_published?: boolean; current?: boolean;
  },
): Promise<void> {
  await queryOrThrow(
    supabase.from("experience").update({ ...args, updated_at: new Date().toISOString() }).eq("id", id),
    { table: "experience", operation: "updateExperience" },
  );
}

export async function deleteExperience(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  await queryOrThrow(
    supabase.from("experience").update({ deleted_at: new Date().toISOString() }).eq("id", id),
    { table: "experience", operation: "deleteExperience" },
  );
}
