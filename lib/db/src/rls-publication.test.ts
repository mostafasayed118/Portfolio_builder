import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { anonClient, clientFor, ensureSchema, isLocalSupabaseUp, serviceClient } from "./rls-test-helpers";

const d = (await isLocalSupabaseUp()) ? describe : describe.skip;
const fixtures = [
  { table: "theme_settings", row: {}, publicRead: true },
  { table: "typography_settings", row: {}, publicRead: true },
  { table: "site_settings", row: {}, publicRead: true },
  { table: "seo_settings", row: {}, publicRead: true },
  { table: "hero_content", row: { email: "fixture@test.local" }, publicRead: true },
  { table: "about_content", row: {}, publicRead: true },
  { table: "contact_info", row: {}, publicRead: true },
  { table: "cv_settings", row: { object_path: "fixture/cv-1.pdf", file_name: "fixture.pdf" }, publicRead: true },
  { table: "skills", row: { name: "SQL", category: "Data", proficiency: 90, is_visible: true }, publicRead: true },
  { table: "projects", row: { title: "Fixture", description: "Real fixture description", is_published: true }, publicRead: true },
  { table: "experience", row: { title: "Engineer", company: "Fixture", location: "Remote", period: "2026", type: "internship", is_published: true }, publicRead: true },
  { table: "certifications", row: { title: "Fixture", issuer: "Fixture", date: "2026", is_published: true }, publicRead: true },
  { table: "messages", row: { name: "Fixture", email: "fixture@test.local", message: "Private fixture message" }, publicRead: false },
  { table: "section_settings", row: { key: "fixture", label: "Fixture", is_visible: true }, publicRead: true },
  { table: "content_snapshots", row: { entity_type: "project", entity_id: randomUUID(), version: 1, data: {} }, publicRead: false },
  { table: "section_variants", row: { section_key: "hero", label: "Fixture", config: {} }, publicRead: true },
  { table: "analytics_events", row: { type: "page_view", path: "/fixture" }, publicRead: false },
  { table: "content_health_reports", row: { scope: "fixture", issues: [] }, publicRead: false },
  { table: "image_metadata", row: { storage_path: "fixture.png", original_filename: "fixture.png", mime_type: "image/png", file_size_bytes: 1, entity_type: "projects" }, publicRead: false },
  { table: "image_variants", row: { variant_type: "thumbnail", storage_path: "fixture.png" }, publicRead: false },
  { table: "blog_posts", row: { title: "Fixture", content: "Real fixture content", is_published: true }, publicRead: true },
];

const readers = [
  { name: "anon", client: anonClient, owns: false },
  { name: "foreign owner", client: () => clientFor({ sub: "user_test_ownerB" }), owns: false },
  { name: "foreign superadmin", client: () => clientFor({ sub: "user_test_admin", email: "owner-a@test.local" }), owns: false },
  { name: "owner", client: () => clientFor({ sub: "user_test_ownerA" }), owns: true },
];

function catalog(query: string): string[] {
  return execFileSync("docker", [
    "exec", "supabase_db_Portfolio-Fixer", "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-At", "-c", query,
  ], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
}

d("rls: all tenant publication boundaries (069)", () => {
  for (const { table, row, publicRead } of fixtures) {
    it(`${table}: only owners read drafts; public readers see only eligible published rows`, async () => {
      const { portfolioA, portfolioB } = await ensureSchema();
      const svc = serviceClient();
      const publishedId = randomUUID();
      const draftId = randomUUID();
      for (const [id, portfolio_id] of [[publishedId, portfolioA], [draftId, portfolioB]]) {
        const extra: Record<string, unknown> = {};
        if (table === "skills") extra.name = `SQL-${id}`;
        if (table === "section_settings") extra.key = `fixture-${id}`;
        if (table === "projects" || table === "blog_posts") extra.slug = `fixture-${id}`;
        if (table === "section_variants") extra.variant_key = id;
        if (table === "content_snapshots") extra.entity_id = id;
        if (table === "image_variants") {
          const parentId = randomUUID();
          const parent = await svc.from("image_metadata").insert({ id: parentId, portfolio_id, storage_path: "fixture.png", original_filename: "fixture.png", mime_type: "image/png", file_size_bytes: 1, entity_type: "projects" });
          expect(parent.error).toBeNull();
          extra.parent_image_id = parentId;
        }
        const seeded = await svc.from(table).insert({ ...row, ...extra, id, portfolio_id });
        expect(seeded.error).toBeNull();
      }
      for (const reader of readers) {
        const result = await reader.client().from(table).select("id").in("id", [publishedId, draftId]);
        expect(result.error).toBeNull();
        const expected = reader.owns ? [publishedId, draftId] : publicRead ? [publishedId] : [];
        expect.soft(result.data?.map((item) => item.id).sort(), reader.name).toEqual(expected.sort());
      }
    });
  }

  for (const table of ["skills", "projects", "experience", "certifications", "blog_posts"]) {
    for (const hidden of ["unpublished", "deleted"]) {
      it(`${table}: ${hidden} rows stay private even on a published portfolio`, async () => {
        const { portfolioA } = await ensureSchema();
        const fixture = fixtures.find((item) => item.table === table);
        if (!fixture) throw new Error(`Missing fixture for ${table}`);
        const id = randomUUID();
        const visibility = hidden === "deleted" ? { deleted_at: new Date().toISOString() }
          : table === "skills" ? { is_visible: false } : { is_published: false };
        const slug = table === "projects" || table === "blog_posts" ? { slug: `fixture-${id}` } : {};
        const seeded = await serviceClient().from(table).insert({ ...fixture.row, ...slug, ...visibility, id, portfolio_id: portfolioA });
        expect(seeded.error).toBeNull();
        for (const reader of readers) {
          const result = await reader.client().from(table).select("id").eq("id", id);
          expect(result.error).toBeNull();
          expect(result.data, reader.name).toEqual(reader.owns ? [{ id }] : []);
        }
      });
    }
  }

  it("every tenant table has RLS and exactly scoped owner/public policies, with no permissive OR bypass", () => {
    const tables = catalog("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='portfolio_id' AND NOT a.attisdropped) ORDER BY c.relname;");
    expect(tables).toEqual(fixtures.map(({ table }) => table).sort());
    expect(catalog("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='portfolio_id' AND NOT a.attisdropped);")).toEqual([]);
    const policies = catalog("SELECT tablename || '|' || policyname || '|' || cmd || '|' || roles::text || '|' || regexp_replace(coalesce(qual,''), '[()[:space:]]', '', 'g') || '|' || regexp_replace(coalesce(with_check,''), '[()[:space:]]', '', 'g') FROM pg_policies p WHERE schemaname='public' AND EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p.schemaname AND c.table_name=p.tablename AND c.column_name='portfolio_id') ORDER BY tablename,policyname;");
    const publicNames: Record<string, string> = { theme_settings: "theme", typography_settings: "typography", site_settings: "site", seo_settings: "seo", hero_content: "hero", about_content: "about", contact_info: "contact", cv_settings: "cv", section_settings: "sections", section_variants: "variants", blog_posts: "published_blog_posts" };
    const expected: string[] = [];
    for (const { table, publicRead } of fixtures) {
      for (const cmd of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
        const qual = cmd === "INSERT" ? "" : "owns_portfolioportfolio_id";
        const check = cmd === "INSERT" || cmd === "UPDATE" ? "owns_portfolioportfolio_id" : "";
        expected.push(`${table}|owner_${cmd.toLowerCase()}_${table}|${cmd}|{authenticated}|${qual}|${check}`);
      }
      if (publicRead) {
        const visibility = table === "skills" ? "is_visible=trueANDdeleted_atISNULLAND"
          : ["projects", "experience", "certifications", "blog_posts"].includes(table) ? "is_published=trueANDdeleted_atISNULLAND" : "";
        expected.push(`${table}|public_read_${publicNames[table] ?? table}|SELECT|{anon,authenticated}|${visibility}is_published_portfolioportfolio_id|`);
      }
    }
    const publicInserts = policies.filter((policy) => /^(messages|analytics_events)\|public_insert_/.test(policy));
    expect(publicInserts).toHaveLength(2);
    for (const policy of publicInserts) {
      expect(policy).toContain("|INSERT|{anon,authenticated}||is_published_portfolioportfolio_idAND");
      expect(policy).not.toMatch(/\bOR\b|is_admin|portfolio_idISNULL/);
    }
    expect(policies.filter((policy) => !publicInserts.includes(policy)).sort()).toEqual(expected.sort());
  });
});
