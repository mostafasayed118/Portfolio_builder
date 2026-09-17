import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { anonClient, clientFor, ensureSchema, isLocalSupabaseUp, serviceClient } from "./rls-test-helpers";

const d = (await isLocalSupabaseUp()) ? describe : describe.skip;
const tables = [
  { table: "messages", row: { name: "Fixture", email: "fixture@test.local", message: "Private fixture message", status: "read" }, change: { message: "Updated private fixture message" } },
  { table: "cv_settings", row: { object_path: "fixture/cv-1.pdf", file_name: "fixture.pdf" }, change: { file_name: "updated.pdf" } },
  { table: "analytics_events", row: { type: "page_view", path: "/fixture" }, change: { path: "/updated" } },
  { table: "content_health_reports", row: { scope: "fixture", issues: [] }, change: { scope: "updated" } },
];
const outsiders = [
  { name: "other owner", identity: { sub: "user_test_ownerB", email: "owner-b@test.local" } },
  { name: "non-owner superadmin", identity: { sub: "user_test_admin", email: "owner-a@test.local" } },
];

d("rls: retired tenant admin overrides (069)", () => {
  for (const { table, row, change } of tables) {
    it(`${table}: owner can insert, read, update and delete private rows`, async () => {
      const { portfolioB } = await ensureSchema();
      const owner = clientFor({ sub: "user_test_ownerA" });
      const id = randomUUID();
      const inserted = await owner.from(table).insert({ ...row, id, portfolio_id: portfolioB }).select("id");
      expect(inserted.error).toBeNull();
      expect(inserted.data).toEqual([{ id }]);
      const read = await owner.from(table).select("id").eq("id", id);
      expect(read.error).toBeNull();
      expect(read.data).toEqual([{ id }]);
      const updated = await owner.from(table).update(change).eq("id", id).select();
      expect(updated.error).toBeNull();
      expect(updated.data).toEqual([expect.objectContaining({ id, ...change })]);
      const deleted = await owner.from(table).delete().eq("id", id).select("id");
      expect(deleted.error).toBeNull();
      expect(deleted.data).toEqual([{ id }]);
      const fresh = await serviceClient().from(table).select("id").eq("id", id);
      expect(fresh.error).toBeNull();
      expect(fresh.data).toEqual([]);
    });

    for (const { name, identity } of outsiders) {
      for (const operation of ["select", "insert", "update", "delete"]) {
        it(`${table}: ${name} cannot ${operation} another portfolio's private row`, async () => {
          const { portfolioB } = await ensureSchema();
          const svc = serviceClient();
          const outsider = clientFor(identity);
          const id = randomUUID();
          if (operation !== "insert") {
            const seeded = await svc.from(table).insert({ ...row, id, portfolio_id: portfolioB });
            expect(seeded.error).toBeNull();
          }
          if (operation === "insert") {
            const result = await outsider.from(table).insert({ ...row, id, portfolio_id: portfolioB });
            expect(result.error?.code).toBe("42501");
          } else {
            const query = outsider.from(table);
            const result = operation === "select"
              ? await query.select("id").eq("id", id)
              : operation === "update"
                ? await query.update(change).eq("id", id).select("id")
                : await query.delete().eq("id", id).select("id");
            expect(result.error).toBeNull();
            expect(result.data).toEqual([]);
          }
          const fresh = await svc.from(table).select().eq("id", id);
          expect(fresh.error).toBeNull();
          expect(fresh.data).toEqual(operation === "insert" ? [] : [expect.objectContaining({ id, ...row })]);
        });
      }
    }

    it(`${table}: owner cannot move a row to another owner's portfolio`, async () => {
      const { portfolioB, portfolioC } = await ensureSchema();
      const owner = clientFor({ sub: "user_test_ownerA" });
      const id = randomUUID();
      const seeded = await owner.from(table).insert({ ...row, id, portfolio_id: portfolioB });
      expect(seeded.error).toBeNull();
      const moved = await owner.from(table).update({ portfolio_id: portfolioC }).eq("id", id);
      expect(moved.error?.code).toBe("42501");
      const fresh = await owner.from(table).select("portfolio_id").eq("id", id).single();
      expect(fresh.error).toBeNull();
      expect(fresh.data?.portfolio_id).toBe(portfolioB);
    });
  }

  it("preserves global users CRUD for superadmins but not regular users", async () => {
    await ensureSchema();
    const admin = clientFor({ sub: "user_test_ownerA", email: "owner-a@test.local" });
    const regular = clientFor({ sub: "user_test_ownerB", email: "owner-b@test.local" });
    const id = randomUUID();
    try {
      const denied = await regular.from("users").insert({ id, clerk_id: `user_${id}`, email: `${id}@test.local`, role: "user" });
      expect(denied.error?.code).toBe("42501");
      const inserted = await admin.from("users").insert({ id, clerk_id: `user_${id}`, email: `${id}@test.local`, role: "user" }).select("id");
      expect(inserted.error).toBeNull();
      expect(inserted.data).toEqual([{ id }]);
      const read = await admin.from("users").select("id").eq("id", id);
      expect(read.error).toBeNull();
      expect(read.data).toEqual([{ id }]);
      const updated = await admin.from("users").update({ role: "superadmin" }).eq("id", id).select("role");
      expect(updated.error).toBeNull();
      expect(updated.data).toEqual([{ role: "superadmin" }]);
      const deleted = await admin.from("users").delete().eq("id", id).select("id");
      expect(deleted.error).toBeNull();
      expect(deleted.data).toEqual([{ id }]);
    } finally {
      await serviceClient().from("users").delete().eq("id", id);
    }
  });
});

d("rls: storage admin retirement (069)", () => {
  it("a superadmin cannot upload under another tenant's project_images prefix", async () => {
    const { portfolioB } = await ensureSchema();
    const admin = clientFor({ sub: "user_test_admin", email: "owner-a@test.local" });
    const path = `${portfolioB}/${randomUUID()}.png`;
    try {
      const result = await admin.storage.from("project_images").upload(path, new Uint8Array([1]), { contentType: "image/png" });
      expect(result.error).not.toBeNull();
      const listed = await serviceClient().storage.from("project_images").list(portfolioB);
      expect(listed.error).toBeNull();
      expect(listed.data?.some((item) => `${portfolioB}/${item.name}` === path)).toBe(false);
    } finally {
      await serviceClient().storage.from("project_images").remove([path]);
    }
  });
});

d("rls: maintenance authorization (069)", () => {
  it("the live catalog has no tenant admin overrides or retired user_id columns", () => {
    const result = execFileSync("docker", [
      "exec", "supabase_db_Portfolio-Fixer", "psql", "-U", "postgres", "-d", "postgres", "-At", "-c",
      "SELECT count(*) FROM pg_policies WHERE (schemaname = 'public' AND policyname LIKE 'admin_all_%') OR (schemaname IN ('public','storage') AND tablename <> 'users' AND (coalesce(qual,'') || coalesce(with_check,'')) ~ 'is_admin'); SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND column_name='user_id' AND table_name <> 'theme_presets';",
    ], { encoding: "utf8" });
    expect(result.trim().split(/\r?\n/)).toEqual(["0", "0"]);
  });

  it("global analytics cleanup is executable only by the service role", () => {
    const result = execFileSync("docker", [
      "exec", "supabase_db_Portfolio-Fixer", "psql", "-U", "postgres", "-d", "postgres", "-At", "-c",
      "SELECT has_function_privilege('anon', 'public.cleanup_old_analytics()', 'EXECUTE'), has_function_privilege('authenticated', 'public.cleanup_old_analytics()', 'EXECUTE'), has_function_privilege('service_role', 'public.cleanup_old_analytics()', 'EXECUTE');",
    ], { encoding: "utf8" });
    expect(result.trim()).toBe("f|f|t");
  });
});

d("rls: analytics validation retained from 066", () => {
  const cases = [
    { name: "boundary lengths", values: { path: "/".repeat(512), preset_id: "p".repeat(255), referrer: "r".repeat(1024), device: "d".repeat(64) }, allowed: true },
    { name: "nullable metadata", values: { path: null, section_key: null, preset_id: null, referrer: null, device: null }, allowed: true },
    { name: "oversized path", values: { path: "/".repeat(513) }, allowed: false },
    { name: "oversized section", values: { section_key: "s".repeat(129) }, allowed: false },
    { name: "oversized preset", values: { preset_id: "p".repeat(256) }, allowed: false },
    { name: "oversized referrer", values: { referrer: "r".repeat(1025) }, allowed: false },
    { name: "oversized device", values: { device: "d".repeat(65) }, allowed: false },
    { name: "unlisted event", values: { type: "unlisted_event" }, allowed: false },
  ];
  for (const { name, values, allowed } of cases) {
    it(`${name}: ${allowed ? "accepted" : "denied"} for anonymous published analytics`, async () => {
      const { portfolioA } = await ensureSchema();
      const id = randomUUID();
      const result = await anonClient().from("analytics_events").insert({ id, portfolio_id: portfolioA, type: "page_view", ...values });
      if (allowed) expect(result.error).toBeNull();
      else expect(result.error?.code).toBe("42501");
      const fresh = await serviceClient().from("analytics_events").select("id").eq("id", id);
      expect(fresh.error).toBeNull();
      expect(fresh.data).toEqual(allowed ? [{ id }] : []);
    });
  }

  for (const target of ["draft", "null", "omitted"]) {
    it(`denies anonymous analytics with ${target} portfolio`, async () => {
      const { portfolioB } = await ensureSchema();
      const id = randomUUID();
      const portfolio = target === "omitted" ? {} : { portfolio_id: target === "draft" ? portfolioB : null };
      const result = await anonClient().from("analytics_events").insert({ id, type: "page_view", ...portfolio });
      expect(result.error?.code).toBe("42501");
      const fresh = await serviceClient().from("analytics_events").select("id").eq("id", id);
      expect(fresh.error).toBeNull();
      expect(fresh.data).toEqual([]);
    });
  }
});
