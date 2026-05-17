import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project as DbProject, InsertProject } from "@workspace/supabase/types";
import { sanitizeUrl } from "./utils";

export type Project = DbProject;

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
    slug: string;
    description: string;
    full_description?: string | null;
    challenges?: string | null;
    outcome?: string | null;
    completed_at?: string | null;
    category: string;
    tech_stack?: string[];
    tags?: string[];
    featured: boolean;
    github_url?: string | null;
    live_url?: string | null;
    image_url?: string | null;
    metrics?: string[];
    sort_order?: number;
    is_published?: boolean;
  },
): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      title: args.title,
      slug: args.slug,
      description: args.description,
      full_description: args.full_description ?? null,
      challenges: args.challenges ?? null,
      outcome: args.outcome ?? null,
      completed_at: args.completed_at ?? null,
      category: args.category,
      tech_stack: args.tech_stack ?? [],
      tags: args.tags ?? [],
      featured: args.featured,
      github_url: sanitizeUrl(args.github_url),
      live_url: sanitizeUrl(args.live_url),
      image_url: sanitizeUrl(args.image_url),
      metrics: args.metrics ?? [],
      sort_order: args.sort_order ?? 0,
      is_published: args.is_published ?? false,
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
  args: {
    title?: string;
    slug?: string;
    description?: string;
    full_description?: string | null;
    challenges?: string | null;
    outcome?: string | null;
    completed_at?: string | null;
    category?: string;
    tech_stack?: string[];
    tags?: string[];
    featured?: boolean;
    github_url?: string | null;
    live_url?: string | null;
    image_url?: string | null;
    metrics?: string[];
    sort_order?: number;
    is_published?: boolean;
  },
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

export async function toggleProjectFeatured(
   supabase: SupabaseClient,
   id: string,
   featured: boolean,
): Promise<void> {
   const { error } = await supabase
     .from("projects")
     .update({ featured, updated_at: new Date().toISOString() })
     .eq("id", id);
   if (error) throw error;
}

export async function fetchProjectBySlug(
   supabase: SupabaseClient,
   slug: string,
): Promise<Project | null> {
   const { data, error } = await supabase
     .from("projects")
     .select("*")
     .eq("slug", slug)
     .eq("is_published", true)
     .maybeSingle();
   if (error) throw error;
   return data;
}
