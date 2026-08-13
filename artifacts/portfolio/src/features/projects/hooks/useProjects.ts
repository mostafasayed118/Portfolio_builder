import { useProjects as useDbProjects } from "@/hooks/use-portfolio-data";
import { PROJECTS } from "@/data/portfolio";
import type { Project } from "@/features/projects/types";

export function useProjects() {
  const query = useDbProjects();
  return query;
}

export function mapDbProject(
  p: { slug?: string | null; title: string; description: string; full_description?: string | null; tech_stack?: string[]; category?: string | null; featured?: boolean | null; github_url?: string | null; live_url?: string | null; metrics?: string[]; completed_at?: string | null; created_at?: string; sort_order?: number | null; is_published?: boolean | null },
  index: number,
): Project {
  return {
    id: index + 1,
    slug: p.slug ?? p.title.toLowerCase().replace(/\s+/g, "-"),
    title: p.title,
    shortDescription: p.description,
    fullDescription: p.full_description ?? p.description,
    techStack: p.tech_stack ?? [],
    category: p.category ?? "web",
    featured: p.featured ?? false,
    githubUrl: p.github_url ?? "",
    liveUrl: p.live_url ?? undefined,
    metrics: p.metrics ?? [],
    images: [],
    completedAt: p.completed_at ?? p.created_at?.slice(0, 4) ?? "",
  };
}

export function mapDbProjectDetail(
  dbProject: { slug?: string | null; title: string; description: string; full_description?: string | null; challenges?: string | null; outcome?: string | null; tech_stack?: string[]; category?: string | null; featured?: boolean | null; github_url?: string | null; live_url?: string | null; metrics?: string[]; completed_at?: string | null; created_at?: string },
  slug: string,
): Project {
  return {
    id: 0,
    slug: dbProject.slug ?? slug,
    title: dbProject.title,
    shortDescription: dbProject.description,
    fullDescription: dbProject.full_description ?? dbProject.description,
    description: dbProject.description,
    challenges: dbProject.challenges ?? null,
    outcome: dbProject.outcome ?? null,
    techStack: dbProject.tech_stack ?? [],
    category: dbProject.category ?? "web",
    featured: dbProject.featured ?? false,
    githubUrl: dbProject.github_url ?? "",
    liveUrl: dbProject.live_url ?? undefined,
    metrics: dbProject.metrics ?? [],
    images: [],
    completedAt: dbProject.completed_at ?? dbProject.created_at?.slice(0, 4) ?? "",
  };
}

export { PROJECTS };
