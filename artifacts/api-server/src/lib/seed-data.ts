import type { SupabaseClient } from "@supabase/supabase-js";

export const SEED_HERO = {
  heading: "Hi, I'm",
  name: "Your Name",
  roles: ["Data Engineer", "Python Developer", "Full-Stack Developer", "ETL Specialist"],
  description: "Software & Data Engineer passionate about building scalable web platforms and robust ETL pipelines.",
  github: "https://github.com/yourusername",
  linkedin: "https://www.linkedin.com/in/yourusername",
  email: "admin@example.com",
};

export const SEED_ABOUT = {
  bio: "Data Engineer with hands-on experience building production ETL pipelines, data warehouses, and BI dashboards.",
  education: [{ degree: "B.Sc. Computer Science", institution: "Your University", year: "2020 – 2024" }],
  languages: [{ name: "English", level: 90 }],
  interests: [] as string[],
};

export const SEED_SKILL_CATEGORIES = [
  { key: "languages", skills: [{ name: "Python", proficiency: 95 }, { name: "SQL", proficiency: 87 }, { name: "JavaScript", proficiency: 82 }] },
  { key: "frameworks", skills: [{ name: "React", proficiency: 80 }, { name: "Next.js", proficiency: 83 }] },
  { key: "cloud", skills: [{ name: "Azure", proficiency: 80 }] },
];

export const SEED_PROJECTS = [
  { slug: "sample-project", title: "Sample Data Pipeline", description: "A sample data engineering project.", techStack: ["Python", "SQL"], category: "data-engineering", featured: true },
];

export const SEED_EXPERIENCE = [
  { title: "Data Engineer", company: "Your Company", location: "Remote", period: "2024 – Present", description: ["Built data pipelines"], technologies: ["Python", "SQL"], type: "internship" as const },
];

export const SEED_CERTIFICATIONS = [
  { title: "Sample Certification", issuer: "Issuer Name", date: "2025", dateSort: "2025-01", category: "data-engineering" as const },
];

interface SeedResult {
  count: number;
  errors: string[];
}

async function seedCollection<T>(
  supabase: SupabaseClient,
  table: string,
  items: T[],
  existingCheck: () => Promise<Set<string>>,
  toRow: (item: T, i: number) => Record<string, unknown>,
  identityFn: (item: T) => string,
): Promise<SeedResult> {
  const errors: string[] = [];
  const existing = await existingCheck();
  const newItems = items.filter((item) => !existing.has(identityFn(item)));
  if (newItems.length > 0) {
    const { error } = await supabase.from(table).insert(newItems.map((item, i) => toRow(item, i)));
    if (error) errors.push(`${table}: ${error.message}`);
  }
  return { count: newItems.length, errors };
}

export async function seedHerContent(supabase: SupabaseClient): Promise<void> {
  await supabase.from("hero_content").upsert({
    heading: SEED_HERO.heading, name: SEED_HERO.name, roles: SEED_HERO.roles,
    description: SEED_HERO.description, github_url: SEED_HERO.github,
    linkedin_url: SEED_HERO.linkedin, email: SEED_HERO.email, is_published: true,
  });
}

export async function seedAboutContent(supabase: SupabaseClient): Promise<void> {
  await supabase.from("about_content").upsert({
    bio: SEED_ABOUT.bio, education: SEED_ABOUT.education,
    languages: SEED_ABOUT.languages, interests: SEED_ABOUT.interests, is_published: true,
  });
}

export async function seedSkills(supabase: SupabaseClient, userId: string, force: boolean): Promise<SeedResult> {
  return seedCollection(
    supabase, "skills",
    SEED_SKILL_CATEGORIES.flatMap((cat) => cat.skills.map((s) => ({ ...s, cat: cat.key }))),
    async () => force ? new Set() : new Set((await supabase.from("skills").select("name").eq("user_id", userId)).data?.map((s: { name: string }) => s.name.toLowerCase()) ?? []),
    (item, i) => ({ name: item.name, category: item.cat, proficiency: item.proficiency, sort_order: i, is_visible: true, user_id: userId }),
    (item) => item.name.toLowerCase(),
  );
}

export async function seedProjects(supabase: SupabaseClient, userId: string, force: boolean): Promise<SeedResult> {
  return seedCollection(
    supabase, "projects", SEED_PROJECTS,
    async () => force ? new Set() : new Set((await supabase.from("projects").select("slug").eq("user_id", userId)).data?.map((p: { slug: string | null }) => p.slug).filter((s): s is string => !!s) ?? []),
    (p, i) => ({ title: p.title, slug: p.slug, description: p.description, tech_stack: p.techStack, category: p.category, featured: p.featured, is_published: true, sort_order: i, user_id: userId }),
    (p) => p.slug,
  );
}

export async function seedExperience(supabase: SupabaseClient, userId: string, force: boolean): Promise<SeedResult> {
  return seedCollection(
    supabase, "experience", SEED_EXPERIENCE,
    async () => force ? new Set() : new Set((await supabase.from("experience").select("title, company").eq("user_id", userId)).data?.map((e: { title: string; company: string }) => `${e.title}|${e.company}`) ?? []),
    (e, i) => ({ title: e.title, company: e.company, location: e.location, period: e.period, description: e.description, technologies: e.technologies, type: e.type, sort_order: i, is_published: true, user_id: userId }),
    (e) => `${e.title}|${e.company}`,
  );
}

export async function seedCertifications(supabase: SupabaseClient, userId: string, force: boolean): Promise<SeedResult> {
  return seedCollection(
    supabase, "certifications", SEED_CERTIFICATIONS,
    async () => force ? new Set() : new Set((await supabase.from("certifications").select("title").eq("user_id", userId)).data?.map((c: { title: string }) => c.title) ?? []),
    (c, i) => ({ title: c.title, issuer: c.issuer, date: c.date, date_sort: c.dateSort, category: c.category, is_published: true, user_id: userId, sort_order: i }),
    (c) => c.title,
  );
}

export async function softDeleteAll(supabase: SupabaseClient, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await Promise.all([
    supabase.from("skills").update({ deleted_at: now }).eq("user_id", userId).is("deleted_at", null),
    supabase.from("projects").update({ deleted_at: now }).eq("user_id", userId).is("deleted_at", null),
    supabase.from("experience").update({ deleted_at: now }).eq("user_id", userId).is("deleted_at", null),
    supabase.from("certifications").update({ deleted_at: now }).eq("user_id", userId).is("deleted_at", null),
  ]);
}