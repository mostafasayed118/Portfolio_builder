import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { getHeroContent } from "@workspace/db/hero-content";
import { getAboutContent } from "@workspace/db/about-content";
import { listSkills } from "@workspace/db/skills";
import { listPublishedProjects } from "@workspace/db/projects";
import { listExperience } from "@workspace/db/experience";
import { listCertifications } from "@workspace/db/certifications";
import { fetchProjectBySlug } from "@workspace/db/projects";
import type { Skill as DbSkill } from "@workspace/supabase/types";

const STALE_TIME = 1000 * 60 * 5;

export function useHeroContent() {
  return useQuery({
    queryKey: ["hero"],
    queryFn: () => {
      const supabase = getSupabase();
      if (!supabase) return null;
      return getHeroContent(supabase);
    },
    staleTime: STALE_TIME,
    retry: 1,
    enabled: isSupabaseConfigured,
  });
}

export function useAboutContent() {
  return useQuery({
    queryKey: ["about"],
    queryFn: () => {
      const supabase = getSupabase();
      if (!supabase) return null;
      return getAboutContent(supabase);
    },
    staleTime: STALE_TIME,
    retry: 1,
    enabled: isSupabaseConfigured,
  });
}

export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: () => {
      const supabase = getSupabase();
      if (!supabase) return [];
      return listSkills(supabase);
    },
    staleTime: STALE_TIME,
    retry: 1,
    enabled: isSupabaseConfigured,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => {
      const supabase = getSupabase();
      if (!supabase) return [];
      return listPublishedProjects(supabase);
    },
    staleTime: STALE_TIME,
    retry: 1,
    enabled: isSupabaseConfigured,
  });
}

export function useExperience() {
  return useQuery({
    queryKey: ["experience"],
    queryFn: () => {
      const supabase = getSupabase();
      if (!supabase) return [];
      return listExperience(supabase);
    },
    staleTime: STALE_TIME,
    retry: 1,
    enabled: isSupabaseConfigured,
  });
}

export function useCertifications() {
  return useQuery({
    queryKey: ["certifications"],
    queryFn: () => {
      const supabase = getSupabase();
      if (!supabase) return [];
      return listCertifications(supabase);
    },
    staleTime: STALE_TIME,
    retry: 1,
    enabled: isSupabaseConfigured,
  });
}

export function useProjectBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["project", slug],
    queryFn: () => {
      const supabase = getSupabase();
      if (!supabase) return null;
      return fetchProjectBySlug(supabase, slug!);
    },
    staleTime: STALE_TIME,
    retry: 1,
    enabled: isSupabaseConfigured && !!slug,
  });
}

export function groupSkillsByCategory(skills: DbSkill[]) {
  const grouped: Record<string, { name: string; proficiency: number; level: "Expert" | "Advanced" | "Intermediate" | "Familiar" }[]> = {};
  for (const s of skills) {
    if (s.is_visible === false) continue;
    const cat = s.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    const level: "Expert" | "Advanced" | "Intermediate" | "Familiar" = s.proficiency >= 90 ? "Expert" :
                  s.proficiency >= 75 ? "Advanced" :
                  s.proficiency >= 60 ? "Intermediate" : "Familiar";
    grouped[cat].push({
      name: s.name,
      proficiency: s.proficiency,
      level,
    });
  }
  return Object.entries(grouped).map(([key, skills]) => ({
    key: key.toLowerCase().replace(/\s+/g, "-"),
    label: key,
    color: "blue",
    skills: skills.sort((a, b) => b.proficiency - a.proficiency),
  }));
}