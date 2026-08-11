import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project as DbProject } from "@workspace/supabase/types";
import { sanitizeUrl } from "./utils";
import { queryOrThrow } from "./query";

export type Project = DbProject;

const PROJECT_TABLE = "projects" as const;

export async function listProjects(
  supabase: SupabaseClient,
): Promise<Project[]> {
  return queryOrThrow<Project[]>(
    supabase.from(PROJECT_TABLE).select("*").is("deleted_at", null).order("sort_order", { ascending: true }),
    { table: PROJECT_TABLE, operation: "listProjects" },
  );
}

export async function listPublishedProjects(
  supabase: SupabaseClient,
): Promise<Project[]> {
  return queryOrThrow<Project[]>(
    supabase.from(PROJECT_TABLE).select("*").eq("is_published", true).is("deleted_at", null).order("sort_order", { ascending: true }),
    { table: PROJECT_TABLE, operation: "listPublishedProjects" },
  );
}

export async function createProject(
  supabase: SupabaseClient,
  args: {
    title: string; slug: string; description: string;
    full_description?: string | null; challenges?: string | null; outcome?: string | null;
    completed_at?: string | null; category: string;
    tech_stack?: string[]; tags?: string[]; featured: boolean;
    github_url?: string | null; live_url?: string | null; image_url?: string | null;
    metrics?: string[]; sort_order?: number; is_published?: boolean;
  },
): Promise<string> {
  const now = new Date().toISOString();
  const data = await queryOrThrow<{ id: string }>(
    supabase.from(PROJECT_TABLE).insert({
      title: args.title, slug: args.slug, description: args.description,
      full_description: args.full_description ?? null, challenges: args.challenges ?? null, outcome: args.outcome ?? null,
      completed_at: args.completed_at ?? null, category: args.category,
      tech_stack: args.tech_stack ?? [], tags: args.tags ?? [], featured: args.featured,
      github_url: sanitizeUrl(args.github_url), live_url: sanitizeUrl(args.live_url), image_url: sanitizeUrl(args.image_url),
      metrics: args.metrics ?? [], sort_order: args.sort_order ?? 0, is_published: args.is_published ?? false,
      created_at: now, updated_at: now,
    }).select("id").single(),
    { table: PROJECT_TABLE, operation: "createProject" },
  );
  return data.id;
}

export async function updateProject(
  supabase: SupabaseClient,
  id: string,
  args: {
    title?: string; slug?: string; description?: string;
    full_description?: string | null; challenges?: string | null; outcome?: string | null;
    completed_at?: string | null; category?: string;
    tech_stack?: string[]; tags?: string[]; featured?: boolean;
    github_url?: string | null; live_url?: string | null; image_url?: string | null;
    metrics?: string[]; sort_order?: number; is_published?: boolean;
  },
): Promise<void> {
  await queryOrThrow(
    supabase.from(PROJECT_TABLE).update({ ...args, updated_at: new Date().toISOString() }).eq("id", id),
    { table: PROJECT_TABLE, operation: "updateProject" },
  );
}

export async function deleteProject(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  await queryOrThrow(
    supabase.from(PROJECT_TABLE).update({ deleted_at: new Date().toISOString() }).eq("id", id),
    { table: PROJECT_TABLE, operation: "deleteProject" },
  );
}

export async function toggleProjectFeatured(
  supabase: SupabaseClient,
  id: string,
  featured: boolean,
): Promise<void> {
  await queryOrThrow(
    supabase.from(PROJECT_TABLE).update({ featured, updated_at: new Date().toISOString() }).eq("id", id),
    { table: PROJECT_TABLE, operation: "toggleProjectFeatured" },
  );
}

export async function fetchProjectBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<Project | null> {
  return queryOrThrow(
    supabase.from(PROJECT_TABLE).select("*").eq("slug", slug).eq("is_published", true).is("deleted_at", null).maybeSingle(),
    { table: PROJECT_TABLE, operation: "fetchProjectBySlug" },
  );
}
