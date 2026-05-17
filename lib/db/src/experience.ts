import type { SupabaseClient } from "@supabase/supabase-js";
import type { Experience as DbExperience, InsertExperience } from "@workspace/supabase/types";

export type Experience = DbExperience;

export async function listExperience(
  supabase: SupabaseClient,
): Promise<Experience[]> {
  const { data, error } = await supabase
    .from("experience")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createExperience(
  supabase: SupabaseClient,
  args: {
    title: string;
    company: string;
    location?: string;
    period?: string;
    description?: string[];
    technologies?: string[];
    type?: "internship" | "certification" | "volunteer";
    sort_order?: number;
    is_published?: boolean;
    current?: boolean;
  },
): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("experience")
    .insert({
      title: args.title,
      company: args.company,
      location: args.location ?? "",
      period: args.period ?? "",
      description: args.description ?? [],
      technologies: args.technologies ?? [],
      type: args.type ?? "internship",
      sort_order: args.sort_order ?? 0,
      is_published: args.is_published ?? true,
      current: args.current ?? false,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateExperience(
  supabase: SupabaseClient,
  id: string,
  args: {
    title?: string;
    company?: string;
    location?: string;
    period?: string;
    description?: string[];
    technologies?: string[];
    type?: "internship" | "certification" | "volunteer";
    sort_order?: number;
    is_published?: boolean;
    current?: boolean;
  },
): Promise<void> {
  const { error } = await supabase
    .from("experience")
    .update({ ...args, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteExperience(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("experience").delete().eq("id", id);
  if (error) throw error;
}
