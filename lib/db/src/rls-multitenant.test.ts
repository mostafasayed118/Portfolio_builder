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
