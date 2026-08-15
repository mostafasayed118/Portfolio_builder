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

/**
 * Starter articles for the portfolio blog. These are intentionally seeded
 * through the admin import flow so they can be edited or removed from the
 * CMS instead of being hardcoded into the public portfolio.
 */
export const SEED_BLOG_POSTS = [
  {
    slug: "building-reliable-ai-features",
    title: "Building Reliable AI Features Beyond the Demo",
    excerpt: "A practical framework for turning an impressive AI prototype into a useful, observable, and maintainable product feature.",
    tags: ["AI", "Engineering", "Product"],
    content: `## Start with the user outcome\n\nAI features are most valuable when they remove friction from a real workflow. Before choosing a model, define the decision the user needs to make, the information they already have, and what a successful result looks like.\n\n### A production-ready AI loop\n\n1. **Constrain the task.** Give the model a focused job with clear inputs and outputs.\n2. **Validate the result.** Use schemas, confidence checks, and business rules before data reaches the user.\n3. **Keep a human in the loop.** Make corrections easy and use them to improve prompts and evaluation cases.\n4. **Measure quality continuously.** Track latency, cost, failure modes, and user acceptance—not only model accuracy.\n\nThe best AI products are not magic boxes. They are well-designed systems where the model is one replaceable component inside a reliable experience.`,
  },
  {
    slug: "flutter-production-mobile-apps",
    title: "Flutter for Production Mobile Apps",
    excerpt: "What matters when a Flutter project moves from a smooth demo to a mobile product that needs to scale, ship, and stay maintainable.",
    tags: ["Flutter", "Mobile", "Dart"],
    content: `## Flutter is a product decision\n\nFlutter makes it possible to share a large amount of UI and application logic across iOS and Android. The real advantage is not simply writing less code—it is keeping the experience consistent while moving quickly.\n\n### Practices that keep a Flutter app healthy\n\n- Keep feature code separated from networking, storage, and platform integrations.\n- Model loading, empty, error, and success states explicitly.\n- Use small reusable widgets instead of one large screen widget.\n- Test the business logic independently from the rendering layer.\n- Profile real devices before optimizing animations or images.\n\nA production Flutter app still needs platform-aware thinking. Permissions, deep links, notifications, release signing, and accessibility deserve the same attention as the first screen.`,
  },
  {
    slug: "mobile-first-product-engineering",
    title: "Mobile-First Engineering Is More Than Responsive CSS",
    excerpt: "A mobile experience should be designed around attention, touch, network conditions, and fast feedback—not just a smaller viewport.",
    tags: ["Mobile", "UX", "Performance"],
    content: `## Design for the real mobile context\n\nPeople use mobile products with one hand, intermittent connectivity, limited battery, and many distractions. A good mobile experience makes the next action obvious and keeps progress safe when conditions are imperfect.\n\n### Engineering priorities\n\n- Keep primary actions within comfortable touch targets.\n- Load the useful content first and defer everything decorative.\n- Preserve drafts locally when a request can fail.\n- Treat slow networks as a normal state, not an edge case.\n- Use accessible labels, focus states, and readable contrast from the start.\n\nMobile-first work is a collaboration between design and engineering. When both teams optimize for the user’s context instead of a device category, the result feels faster and more trustworthy everywhere.`,
  },
  {
    slug: "shipping-production-web-apps",
    title: "From Web App Idea to Production Release",
    excerpt: "A repeatable path for shipping a web application with clear scope, resilient data flows, and confidence at deployment time.",
    tags: ["Web", "React", "Full-Stack"],
    content: `## Build the smallest complete slice\n\nThe fastest way to learn whether a web product works is to connect one user journey from interface to database and back. A polished landing page without a working data path creates less learning than a simple end-to-end feature.\n\n### A practical release path\n\n1. Define the smallest valuable workflow.\n2. Create a typed contract between the UI and API.\n3. Add loading, empty, error, and permission states before polishing.\n4. Test the important path and its failure cases.\n5. Deploy early with logs, health checks, and a rollback plan.\n\nGood web engineering balances speed with clarity. Clear boundaries, observable requests, and small releases make it easier to improve the product without turning every change into a risky rewrite.`,
  },
  {
    slug: "vibe-coding-with-engineering-discipline",
    title: "Vibe Coding with Engineering Discipline",
    excerpt: "AI-assisted coding can dramatically increase momentum when exploration is paired with tests, review, and deliberate technical decisions.",
    tags: ["Vibe Code", "AI", "Web"],
    content: `## Use AI for momentum, not permission to skip thinking\n\nVibe coding is useful when it helps turn an idea into something concrete quickly. The danger begins when generated code is accepted without understanding its boundaries, security implications, or failure modes.\n\n### A disciplined workflow\n\n- Describe the outcome and constraints before asking for implementation.\n- Ask for small changes that are easy to review and revert.\n- Run typechecks and focused tests after every meaningful step.\n- Inspect authentication, data access, and user input manually.\n- Keep the final design understandable to the next developer.\n\nThe best AI-assisted developers combine curiosity with verification. Let AI handle repetition and exploration, while humans remain responsible for architecture, quality, and the experience users receive.`,
  },
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

export async function seedPosts(supabase: SupabaseClient, userId: string): Promise<SeedResult> {
  return seedCollection(
    supabase,
    "blog_posts",
    SEED_BLOG_POSTS,
    async () => new Set(
      (await supabase.from("blog_posts").select("slug").eq("user_id", userId).is("deleted_at", null)).data?.map((post: { slug: string }) => post.slug) ?? [],
    ),
    (post) => ({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      tags: post.tags,
      is_published: true,
      published_at: new Date().toISOString(),
      user_id: userId,
    }),
    (post) => post.slug,
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