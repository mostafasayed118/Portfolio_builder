import { env } from "../env";
import { getSupabaseClient } from "../supabase-client";

const MAX_CONTEXT_CHARS = 6000;
let cache: { text: string; at: number } | null = null;

export async function buildSiteContext(): Promise<string> {
  const now = Date.now();
  if (cache && now - cache.at < env.AI_CONTEXT_TTL_MS) return cache.text;
  try {
    const text = await fetchContext();
    cache = { text, at: now };
    return text;
  } catch {
    return cache?.text ?? "";
  }
}

async function fetchContext(): Promise<string> {
  const supabase = getSupabaseClient();
  const [hero, about, skills, projects, experience, certifications, contact] = await Promise.all([
    supabase.from("hero_content")
      .select("name, heading, roles, description, email, github_url, linkedin_url, twitter_url, youtube_url, facebook_url, tagline, available")
      .eq("is_published", true).maybeSingle(),
    supabase.from("about_content")
      .select("bio1, bio2, bio, location, years_of_experience, degree, school, education, languages, interests")
      .eq("is_published", true).maybeSingle(),
    supabase.from("skills").select("name, category, proficiency").is("deleted_at", null).eq("is_visible", true),
    supabase.from("projects").select("title, description, tech_stack, category, tags").is("deleted_at", null).eq("is_published", true),
    supabase.from("experience").select("title, company, location, period, description, technologies, type").is("deleted_at", null).eq("is_published", true),
    supabase.from("certifications").select("title, issuer, date, skills").is("deleted_at", null).eq("is_published", true),
    supabase.from("contact_info").select("email, phone, location, github, linkedin, youtube, facebook, whatsapp, availability_status, working_hours").limit(1).maybeSingle(),
  ]);

  const parts: string[] = [];
  const h = hero.data;
  if (h) {
    parts.push(`Name: ${h.name ?? ""}`);
    if (h.heading) parts.push(`Tagline: ${h.heading}`);
    if (h.roles?.length) parts.push(`Roles: ${h.roles.join(", ")}`);
    if (h.description) parts.push(`Summary: ${h.description}`);
    if (h.email) parts.push(`Email: ${h.email}`);
    const links = [h.github_url, h.linkedin_url, h.twitter_url, h.youtube_url, h.facebook_url].filter(Boolean).join(", ");
    if (links) parts.push(`Links: ${links}`);
  }
  const a = about.data;
  if (a) {
    const bios = [a.bio1, a.bio2, a.bio].filter(Boolean).join(" ");
    if (bios) parts.push(`About: ${bios}`);
    if (a.location) parts.push(`Location: ${a.location}`);
    if (a.years_of_experience) parts.push(`Years of experience: ${a.years_of_experience}`);
    if (a.degree || a.school) parts.push(`Education: ${a.degree ?? ""} ${a.school ?? ""}`.trim());
    if (a.languages?.length) parts.push(`Languages: ${a.languages.map((l) => l.name).join(", ")}`);
    if (a.interests?.length) parts.push(`Interests: ${a.interests.join(", ")}`);
  }
  if (skills.data?.length) {
    parts.push(`Skills: ${skills.data.map((s) => s.name).join(", ")}`);
  }
  if (projects.data?.length) {
    parts.push(`Projects: ${projects.data.map((p) => `${p.title} — ${p.description}`).join(" | ")}`);
  }
  if (experience.data?.length) {
    parts.push(`Experience: ${experience.data.map((e) => `${e.title} at ${e.company} (${e.period})`).join(" | ")}`);
  }
  if (certifications.data?.length) {
    parts.push(`Certifications: ${certifications.data.map((c) => `${c.title} (${c.issuer})`).join(" | ")}`);
  }
  const c = contact.data;
  if (c) {
    const contactBits = [c.email, c.phone, c.location, c.github, c.linkedin, c.whatsapp].filter(Boolean).join(", ");
    if (contactBits) parts.push(`Contact: ${contactBits}`);
    if (c.availability_status) parts.push(`Availability: ${c.availability_status}`);
  }
  return parts.join("\n").slice(0, MAX_CONTEXT_CHARS);
}
