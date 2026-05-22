import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { doubleCsrfProtection } from "../../middleware/csrf";
import { getSupabaseClient } from "../../lib/supabase-client";

const router: IRouter = Router();

const supabase = getSupabaseClient();

const HERO = {
  heading: "Hi, I'm",
  name: "Your Name",
  roles: ["Data Engineer", "Python Developer", "Full-Stack Developer", "ETL Specialist"],
  description: "Software & Data Engineer passionate about building scalable web platforms and robust ETL pipelines.",
  github: "https://github.com/yourusername",
  linkedin: "https://www.linkedin.com/in/yourusername",
  email: "admin@example.com",
};

const ABOUT_DATA = {
  bio: "Data Engineer with hands-on experience building production ETL pipelines, data warehouses, and BI dashboards.",
  education: [{ degree: "B.Sc. Computer Science", institution: "Your University", year: "2020 – 2024" }],
  languages: [{ name: "English", level: 90 }],
  interests: [] as string[],
};

const SKILL_CATEGORIES = [
  { key: "languages", skills: [{ name: "Python", proficiency: 95 }, { name: "SQL", proficiency: 87 }, { name: "JavaScript", proficiency: 82 }] },
  { key: "frameworks", skills: [{ name: "React", proficiency: 80 }, { name: "Next.js", proficiency: 83 }] },
  { key: "cloud", skills: [{ name: "Azure", proficiency: 80 }] },
];

const PROJECTS = [
  { slug: "sample-project", title: "Sample Data Pipeline", description: "A sample data engineering project.", techStack: ["Python", "SQL"], category: "data-engineering", featured: true },
];

const EXPERIENCE = [
  { title: "Data Engineer", company: "Your Company", location: "Remote", period: "2024 – Present", description: ["Built data pipelines"], technologies: ["Python", "SQL"], type: "internship" as const },
];

const CERTIFICATIONS = [
  { title: "Sample Certification", issuer: "Issuer Name", date: "2025", dateSort: "2025-01", category: "data-engineering" as const },
];

router.post("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const errors: string[] = [];
  const summary: Record<string, number> = {};
  const force = req.query.force === "true";
  const userId = req.user?.id;

  if (force && req.query.confirm !== "true") {
    return res.status(400).json({
      success: false,
      message: "Force re-seed requires confirm=true query param to prevent accidental data loss",
      summary: {},
      errors: [],
    });
  }

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "No user context. Please log in again.",
      summary: {},
      errors: ["Missing user ID from authentication"],
    });
  }

  try {
    // If force re-seed, clear existing data first (scoped to this user)
    if (force) {
      await supabase.from("skills").delete().eq("user_id", userId);
      await supabase.from("projects").delete().eq("user_id", userId);
      await supabase.from("experience").delete().eq("user_id", userId);
      await supabase.from("certifications").delete().eq("user_id", userId);
    }

    await supabase.from("hero_content").upsert({
      heading: HERO.heading,
      name: HERO.name,
      roles: HERO.roles,
      description: HERO.description,
      github_url: HERO.github,
      linkedin_url: HERO.linkedin,
      email: HERO.email,
      is_published: true,
    });
    summary.hero = 1;

    await supabase.from("about_content").upsert({
      bio: ABOUT_DATA.bio,
      education: ABOUT_DATA.education,
      languages: ABOUT_DATA.languages,
      interests: ABOUT_DATA.interests,
      is_published: true,
    });
    summary.about = 1;

    let skillCount = 0;
    if (force) {
      const allSkills = SKILL_CATEGORIES.flatMap((cat) =>
        cat.skills.map((skill, i) => ({
          name: skill.name,
          category: cat.key,
          proficiency: skill.proficiency,
          sort_order: i,
          is_visible: true,
          user_id: userId,
        })),
      );
      const { error } = await supabase.from("skills").insert(allSkills);
      if (error) errors.push(`Skills: ${error.message}`);
      else skillCount = allSkills.length;
    } else {
      const existingSkills = await supabase.from("skills").select("name").eq("user_id", userId);
      const existingNames = new Set((existingSkills.data ?? []).map((s: { name: string }) => s.name.toLowerCase()));
      const newSkills = SKILL_CATEGORIES.flatMap((cat) =>
        cat.skills
          .filter((skill) => !existingNames.has(skill.name.toLowerCase()))
          .map((skill, i) => ({
            name: skill.name,
            category: cat.key,
            proficiency: skill.proficiency,
            sort_order: i,
            is_visible: true,
            user_id: userId,
          })),
      );
      if (newSkills.length > 0) {
        const { error } = await supabase.from("skills").insert(newSkills);
        if (error) errors.push(`Skills: ${error.message}`);
        else skillCount = newSkills.length;
      }
    }
    summary.skills = skillCount;

    let projectCount = 0;
    if (force) {
      const allProjects = PROJECTS.map((p, i) => ({
        title: p.title,
        slug: p.slug,
        description: p.description,
        tech_stack: p.techStack,
        category: p.category,
        featured: p.featured,
        is_published: true,
        sort_order: i,
        user_id: userId,
      }));
      const { error } = await supabase.from("projects").insert(allProjects);
      if (error) errors.push(`Projects: ${error.message}`);
      else projectCount = allProjects.length;
    } else {
      const existingProjects = await supabase.from("projects").select("slug").eq("user_id", userId);
      const existingSlugs = new Set((existingProjects.data ?? []).map((p: { slug: string | null }) => p.slug).filter(Boolean));
      const newProjects = PROJECTS
        .filter((p) => !existingSlugs.has(p.slug))
        .map((p, i) => ({
          title: p.title,
          slug: p.slug,
          description: p.description,
          tech_stack: p.techStack,
          category: p.category,
          featured: p.featured,
          is_published: true,
          sort_order: i,
          user_id: userId,
        }));
      if (newProjects.length > 0) {
        const { error } = await supabase.from("projects").insert(newProjects);
        if (error) errors.push(`Projects: ${error.message}`);
        else projectCount = newProjects.length;
      }
    }
    summary.projects = projectCount;

    let expCount = 0;
    if (force) {
      const allExp = EXPERIENCE.map((e, i) => ({
        title: e.title,
        company: e.company,
        location: e.location,
        period: e.period,
        description: e.description,
        technologies: e.technologies,
        type: e.type,
        sort_order: i,
        is_published: true,
        user_id: userId,
      }));
      const { error } = await supabase.from("experience").insert(allExp);
      if (error) errors.push(`Experience: ${error.message}`);
      else expCount = allExp.length;
    } else {
      const existingExp = await supabase.from("experience").select("title, company").eq("user_id", userId);
      const existingExpKeys = new Set((existingExp.data ?? []).map((e: { title: string; company: string }) => `${e.title}|${e.company}`));
      const newExp = EXPERIENCE
        .filter((e) => !existingExpKeys.has(`${e.title}|${e.company}`))
        .map((e, i) => ({
          title: e.title,
          company: e.company,
          location: e.location,
          period: e.period,
          description: e.description,
          technologies: e.technologies,
          type: e.type,
          sort_order: i,
          is_published: true,
          user_id: userId,
        }));
      if (newExp.length > 0) {
        const { error } = await supabase.from("experience").insert(newExp);
        if (error) errors.push(`Experience: ${error.message}`);
        else expCount = newExp.length;
      }
    }
    summary.experience = expCount;

    let certCount = 0;
    if (force) {
      const allCerts = CERTIFICATIONS.map((c) => ({
        title: c.title,
        issuer: c.issuer,
        date: c.date,
        date_sort: c.dateSort,
        category: c.category,
        is_published: true,
        user_id: userId,
      }));
      const { error } = await supabase.from("certifications").insert(allCerts);
      if (error) errors.push(`Certifications: ${error.message}`);
      else certCount = allCerts.length;
    } else {
      const existingCerts = await supabase.from("certifications").select("title").eq("user_id", userId);
      const existingCertTitles = new Set((existingCerts.data ?? []).map((c: { title: string }) => c.title));
      const newCerts = CERTIFICATIONS
        .filter((c) => !existingCertTitles.has(c.title))
        .map((c) => ({
          title: c.title,
          issuer: c.issuer,
          date: c.date,
          date_sort: c.dateSort,
          category: c.category,
          is_published: true,
          user_id: userId,
        }));
      if (newCerts.length > 0) {
        const { error } = await supabase.from("certifications").insert(newCerts);
        if (error) errors.push(`Certifications: ${error.message}`);
        else certCount = newCerts.length;
      }
    }
    summary.certifications = certCount;

    return res.json({ success: true, summary, errors });
  } catch (e) {
    return res.status(500).json({
      success: false,
      summary,
      errors: [e instanceof Error ? e.message : "Failed to seed data"],
    });
  }
});

export default router;
