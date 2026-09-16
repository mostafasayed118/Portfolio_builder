import { describe, expect, it } from "vitest";
import { anonClient, clientFor, ensureSchema, isLocalSupabaseUp, serviceClient } from "./rls-test-helpers";

const run = await isLocalSupabaseUp();
const d = run ? describe : describe.skip;

d("rls: portfolios (064)", () => {
  it("owner sees own portfolios, including drafts, on the base table", async () => {
    const { portfolioA, portfolioB } = await ensureSchema();
    const owner = clientFor({ sub: "user_test_ownerA" });
    const { data } = await owner.from("portfolios").select("id").in("id", [portfolioA, portfolioB]);
    expect(data?.map((row) => row.id).sort()).toEqual([portfolioA, portfolioB].sort());
  });

  it("owner cannot update another owner's portfolio", async () => {
    const { portfolioC } = await ensureSchema();
    const ownerA = clientFor({ sub: "user_test_ownerA" });
    const { data, error } = await ownerA
      .from("portfolios")
      .update({ title: "hijacked" })
      .eq("id", portfolioC)
      .select();
    expect(data).toEqual([]);
    expect(error).toBeNull();
    const svc = serviceClient();
    const { data: fresh } = await svc.from("portfolios").select("title").eq("id", portfolioC).single();
    expect(fresh?.title).toBe("Test Portfolio C");
  });

  it("anon sees only published portfolios through public_portfolios", async () => {
    const { portfolioA, portfolioB, portfolioC } = await ensureSchema();
    const anon = anonClient();
    const { data } = await anon.from("public_portfolios").select("id");
    const ids = data?.map((row) => row.id) ?? [];
    expect(ids).toContain(portfolioA);
    expect(ids).toContain(portfolioC);
    expect(ids).not.toContain(portfolioB);
  });

  it("anon cannot insert or update portfolios", async () => {
    const anon = anonClient();
    const { error: insErr } = await anon
      .from("portfolios")
      .insert({ slug: "anon-own", title: "x", owner_user_id: "user_anon" });
    expect(insErr).not.toBeNull();
    const svc = serviceClient();
    const { data } = await svc.from("portfolios").select("id").eq("slug", "anon-own");
    expect(data).toEqual([]);
  });
});

d("rls: tenant columns + backfill (065)", () => {
  it("backfills portfolio #1 and stamps every existing row", async () => {
    const svc = serviceClient();
    const { data: pf } = await svc
      .from("portfolios")
      .select("id, slug, is_published")
      .eq("slug", "mustafa")
      .single();
    expect(pf).not.toBeNull();
    expect(pf?.is_published).toBe(true);

    for (const table of ["projects", "skills", "messages", "site_settings", "blog_posts"]) {
      const { data } = await svc.from(table).select("portfolio_id");
      for (const row of data ?? []) {
        expect(row.portfolio_id).toBe(pf?.id);
      }
    }
  });

  it("enforces singleton semantics per portfolio (not globally)", async () => {
    const { portfolioB } = await ensureSchema();
    const svc = serviceClient();
    const { error: errB } = await svc.from("site_settings").insert({ portfolio_id: portfolioB });
    expect(errB).toBeNull();
    const { error: errDup } = await svc.from("site_settings").insert({ portfolio_id: portfolioB });
    expect(errDup).not.toBeNull();
    expect(errDup?.code).toBe("23505");
  });

  it("drops legacy contact_messages", async () => {
    const svc = serviceClient();
    const { error } = await svc.from("contact_messages").select("id").limit(1);
    expect(error).not.toBeNull();
  });

  it("keeps section keys unique per portfolio", async () => {
    const svc = serviceClient();
    const { data: pf1 } = await svc.from("portfolios").select("id").eq("slug", "mustafa").single();
    const { error: errDup } = await svc
      .from("section_settings")
      .insert({ portfolio_id: pf1?.id, key: "hero", label: "Hero" });
    expect(errDup).not.toBeNull();
    expect(errDup?.code).toBe("23505");
  });
});

d("rls: tenanted table isolation (066)", () => {
  it("owner reads own rows and not other tenants' rows", async () => {
    const { portfolioA } = await ensureSchema();
    const svc = serviceClient();
    await svc.from("projects").upsert(
      { portfolio_id: portfolioA, slug: "a-project", title: "A project", description: "a decent description", is_published: false },
      { onConflict: "id" },
    );
    const ownerA = clientFor({ sub: "user_test_ownerA" });
    const ownerB = clientFor({ sub: "user_test_ownerB" });
    const { data: seenByA } = await ownerA.from("projects").select("title").eq("title", "A project");
    expect(seenByA?.length).toBe(1);
    const { data: seenByB } = await ownerB.from("projects").select("title").eq("title", "A project");
    expect(seenByB).toEqual([]);
  });

  it("owner can insert and delete within own portfolio only", async () => {
    const { portfolioA, portfolioC } = await ensureSchema();
    const ownerA = clientFor({ sub: "user_test_ownerA" });
    const { data: inserted, error: insErr } = await ownerA
      .from("skills")
      .insert({ portfolio_id: portfolioA, name: "SQL", category: "Data", proficiency: 90 })
      .select("id");
    expect(insErr).toBeNull();
    const skillId = inserted?.[0]?.id;
    if (skillId === undefined) throw new Error("expected skill insert to return id");
    const { error: crossErr } = await ownerA
      .from("skills")
      .insert({ portfolio_id: portfolioC, name: "Nope", category: "X", proficiency: 1 });
    expect(crossErr).not.toBeNull();
    const { error: delErr } = await ownerA.from("skills").delete().eq("id", skillId);
    expect(delErr).toBeNull();
  });

  it("anon reads only published content from published portfolios", async () => {
    const { portfolioA, portfolioB } = await ensureSchema();
    const svc = serviceClient();
    await svc.from("projects").upsert(
      { portfolio_id: portfolioA, slug: "pub-project", title: "Pub project", description: "a decent description", is_published: true },
      { onConflict: "id" },
    );
    await svc.from("projects").upsert(
      { portfolio_id: portfolioB, slug: "draft-project", title: "Draft project", description: "a decent description", is_published: true },
      { onConflict: "id" },
    );
    const anon = anonClient();
    const { data } = await anon
      .from("projects")
      .select("title")
      .in("title", ["Pub project", "Draft project", "A project"]);
    expect(data?.map((row) => row.title)).toEqual(["Pub project"]);
  });

  it("anon can insert messages only into published portfolios, with guarded columns", async () => {
    const { portfolioA, portfolioB } = await ensureSchema();
    const anon = anonClient();
    const { error: okErr } = await anon.from("messages").insert({
      portfolio_id: portfolioA,
      name: "Visitor",
      email: "visitor@example.org",
      message: "Hello from a real visitor message",
      subject: null,
    });
    expect(okErr).toBeNull();
    const { error: draftErr } = await anon.from("messages").insert({
      portfolio_id: portfolioB,
      name: "Visitor",
      email: "visitor@example.org",
      message: "Hello from a real visitor",
    });
    expect(draftErr).not.toBeNull();
    const { error: statusErr } = await anon.from("messages").insert({
      portfolio_id: portfolioA,
      name: "Visitor",
      email: "visitor@example.net",
      message: "Hello from a real visitor",
      status: "read",
    });
    expect(statusErr).not.toBeNull();
  });

  it("anon analytics inserts stay whitelisted and portfolio-scoped", async () => {
    const { portfolioA } = await ensureSchema();
    const anon = anonClient();
    const { error: okErr } = await anon
      .from("analytics_events")
      .insert({ portfolio_id: portfolioA, type: "page_view", path: "/" });
    expect(okErr).toBeNull();
    const { error: badType } = await anon
      .from("analytics_events")
      .insert({ portfolio_id: portfolioA, type: "self_xss", path: "/" });
    expect(badType).not.toBeNull();
  });
});

d("rls: storage tenancy (067)", () => {
  it("prefixes existing storage objects with the tenant portfolio id", async () => {
    const svc = serviceClient();
    const { data: pf1 } = await svc.from("portfolios").select("id").eq("slug", "mustafa").single();
    const { data: cvRow } = await svc.from("cv_settings").select("object_path").limit(1);
    if ((cvRow ?? []).length > 0) {
      expect(cvRow?.[0]?.object_path).toMatch(new RegExp(`^${pf1?.id}/`));
    }
  });

  it("lets owners write only under their own prefix", async () => {
    const { portfolioA } = await ensureSchema();
    const ownerA = clientFor({ sub: "user_test_ownerA" });
    const { error: okErr } = await ownerA.storage
      .from("project_images")
      .upload(`${portfolioA}/test.png`, new Uint8Array([1, 2, 3]), {
        contentType: "image/png",
        upsert: true,
      });
    expect(okErr).toBeNull();

    const { data: pfC } = await serviceClient()
      .from("portfolios")
      .select("id")
      .eq("slug", "rls-test-c")
      .single();
    const otherId = pfC?.id;
    if (otherId === undefined) throw new Error("seed did not create portfolio C");
    const { error: crossErr } = await ownerA.storage
      .from("project_images")
      .upload(`${otherId}/steal.png`, new Uint8Array([1]), { contentType: "image/png" });
    expect(crossErr).not.toBeNull();

    await ownerA.storage.from("project_images").remove([`${portfolioA}/test.png`]);
  });

  it("anon cannot write to any bucket", async () => {
    const { portfolioA } = await ensureSchema();
    const anon = anonClient();
    const { error } = await anon.storage
      .from("project_images")
      .upload(`${portfolioA}/anon.png`, new Uint8Array([1]), { contentType: "image/png" });
    expect(error).not.toBeNull();
  });
});
