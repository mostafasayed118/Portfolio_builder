import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { logInfo, logWarn, logError } from "@workspace/logging";

const LOG_CTX = "generate-sitemap";

/**
 * Generate a fresh `public/sitemap.xml` from the live Supabase
 * `projects` table. Runs as a Vite `prebuild` step so the deployed
 * bundle always reflects published content. No-op outside CI / build
 * if SUPABASE_URL is missing.
 *
 * Usage:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… tsx scripts/generate-sitemap.ts
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.SITE_URL ?? "https://mustafa-sayed-portfolio.vercel.app";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  logWarn("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping", LOG_CTX);
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface Project { slug: string | null; updated_at: string | null; is_published: boolean | null }
interface BlogPost { slug: string; updated_at: string | null; is_published: boolean | null }

const { data, error } = await supabase
  .from("projects")
  .select("slug, updated_at, is_published")
  .eq("is_published", true)
  .not("slug", "is", null)
  .order("updated_at", { ascending: false });

if (error) {
  logError("Supabase query failed", error, LOG_CTX);
  process.exit(1);
}

const projects = (data ?? []) as Project[];

const { data: blogData, error: blogError } = await supabase
  .from("blog_posts")
  .select("slug, updated_at, is_published")
  .eq("is_published", true)
  .is("deleted_at", null)
  .order("updated_at", { ascending: false });

if (blogError) {
  logError("Blog query failed", blogError, LOG_CTX);
  process.exit(1);
}

const blogPosts = (blogData ?? []) as BlogPost[];

const today = new Date().toISOString().split("T")[0];
const urls: string[] = [
  `  <url><loc>${BASE_URL}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
  ...projects
    .filter((p) => p.slug)
    .map((p) => `  <url><loc>${BASE_URL}/projects/${p.slug}</loc><lastmod>${(p.updated_at ?? today).split("T")[0]}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`),
  ...blogPosts
    .map((post) => `  <url><loc>${BASE_URL}/blog/${post.slug}</loc><lastmod>${(post.updated_at ?? today).split("T")[0]}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

const out = resolve(__dirname, "../public/sitemap.xml");
writeFileSync(out, xml, "utf-8");
logInfo(`Wrote ${projects.length} project URL(s) and ${blogPosts.length} blog URL(s) to ${out}`, LOG_CTX);
