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

const POLL_INTERVAL = 60_000;
const POLL_OPTIONS = { refetchInterval: POLL_INTERVAL, refetchIntervalInBackground: false };

export function useHeroContent() {
  return useQuery({
    queryKey: ["hero"],
    queryFn: async () => {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      return getHeroContent(supabase);
    },
    ...POLL_OPTIONS,
    retry: 2,
    enabled: isSupabaseConfigured,
  });
}

export function useAboutContent() {
  return useQuery({
    queryKey: ["about"],
    queryFn: async () => {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      return getAboutContent(supabase);
    },
    ...POLL_OPTIONS,
    retry: 2,
    enabled: isSupabaseConfigured,
  });
}

export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      return listSkills(supabase);
    },
    ...POLL_OPTIONS,
    retry: 2,
    enabled: isSupabaseConfigured,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      return listPublishedProjects(supabase);
    },
    ...POLL_OPTIONS,
    retry: 2,
    enabled: isSupabaseConfigured,
  });
}

export function useExperience() {
  return useQuery({
    queryKey: ["experience"],
    queryFn: async () => {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      return listExperience(supabase);
    },
    ...POLL_OPTIONS,
    retry: 2,
    enabled: isSupabaseConfigured,
  });
}

export function useCertifications() {
  return useQuery({
    queryKey: ["certifications"],
    queryFn: async () => {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      return listCertifications(supabase);
    },
    ...POLL_OPTIONS,
    retry: 2,
    enabled: isSupabaseConfigured,
  });
}

export function useProjectBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["project", slug],
    queryFn: async () => {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      return fetchProjectBySlug(supabase, slug!);
    },
    ...POLL_OPTIONS,
    retry: 2,
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
