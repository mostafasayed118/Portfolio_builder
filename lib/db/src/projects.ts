import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project, InsertProject } from "@workspace/supabase/types";

export async function listProjects(
  supabase: SupabaseClient,
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listPublishedProjects(
  supabase: SupabaseClient,
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createProject(
  supabase: SupabaseClient,
  args: {
    title: string;
    description: string;
    tech_stack: string[];
    category: string;
    featured: boolean;
    github_url: string;
    live_url?: string | null;
    metrics?: string[];
    sort_order: number;
    is_published: boolean;
  },
): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      title: args.title,
      description: args.description,
      tech_stack: args.tech_stack,
      category: args.category,
      featured: args.featured,
      github_url: args.github_url,
      live_url: args.live_url ?? null,
      metrics: args.metrics ?? [],
      sort_order: args.sort_order,
      is_published: args.is_published,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateProject(
  supabase: SupabaseClient,
  id: string,
  args: Partial<InsertProject>,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ ...args, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProject(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}
