import type { SupabaseClient } from "@supabase/supabase-js";

export interface CvData {
  name: string;
  roles: string[];
  heading: string;
  description: string;
  email: string;
  github_url: string;
  linkedin_url: string;
  location: string;
  yearsOfExperience: number;
  bio1: string;
  bio2: string;
  degree: string;
  school: string;
  grade: string;
  educationYears: string;
  experience: Array<{
    title: string;
    company: string;
    period: string;
    description: string[];
    technologies: string[];
  }>;
  skills: Array<{
    name: string;
    proficiency: number;
    category: string;
  }>;
  certifications: Array<{
    title: string;
    issuer: string;
    date: string;
  }>;
}

export async function fetchCvData(supabase: SupabaseClient): Promise<CvData> {
  const [heroResult, aboutResult, expResult, skillsResult, certsResult] =
    await Promise.allSettled([
      supabase.from("hero_content").select("*").limit(1).maybeSingle(),
      supabase.from("about_content").select("*").limit(1).maybeSingle(),
      supabase
        .from("experience")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("skills")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("certifications")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

  const hero =
    heroResult.status === "fulfilled" ? heroResult.value.data : null;
  const about =
    aboutResult.status === "fulfilled" ? aboutResult.value.data : null;
  const experienceItems =
    expResult.status === "fulfilled" ? (expResult.value.data ?? []) : [];
  const skillItems =
    skillsResult.status === "fulfilled" ? (skillsResult.value.data ?? []) : [];
  const certItems =
    certsResult.status === "fulfilled" ? (certsResult.value.data ?? []) : [];

  return {
    name: hero?.name ?? "Mustafa Sayed",
    roles: hero?.roles ?? ["Data Engineer"],
    heading: hero?.heading ?? "Hi, I'm",
    description: hero?.description ?? "",
    email: hero?.email ?? "",
    github_url: hero?.github_url ?? "",
    linkedin_url: hero?.linkedin_url ?? "",
    location: about?.location ?? "Cairo, Egypt",
    yearsOfExperience: about?.years_of_experience ?? 1,
    bio1: about?.bio1 ?? "",
    bio2: about?.bio2 ?? "",
    degree: about?.degree ?? "",
    school: about?.school ?? "",
    grade: about?.grade ?? "",
    educationYears: about?.education_years ?? "",
    experience: (experienceItems as Array<{
      title: string;
      company: string;
      period?: string;
      description?: string[];
      technologies?: string[];
    }>).map((e) => ({
      title: e.title,
      company: e.company,
      period: e.period ?? "",
      description: e.description ?? [],
      technologies: e.technologies ?? [],
    })),
    skills: (skillItems as Array<{
      name: string;
      proficiency: number;
      category?: string;
    }>).map((s) => ({
      name: s.name,
      proficiency: s.proficiency,
      category: s.category ?? "General",
    })),
    certifications: (certItems as Array<{
      title: string;
      issuer?: string;
      date: string;
    }>).map((c) => ({
      title: c.title,
      issuer: c.issuer ?? "",
      date: c.date,
    })),
  };
}
