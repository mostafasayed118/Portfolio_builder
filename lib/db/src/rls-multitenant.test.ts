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
