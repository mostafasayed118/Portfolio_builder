import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("../../lib/supabase-client", () => ({ getSupabaseClient: () => ({ from }) }));
vi.mock("../../lib/env", () => ({ env: { AI_CONTEXT_TTL_MS: 60000 } }));

type Row = Record<string, unknown>;
const tenantTables = ["hero_content", "about_content", "skills", "projects", "experience", "certifications", "contact_info"];
let rows: Record<string, Row[]>;
let errors: Set<string>;
let rejected: Set<string>;
let buildSiteContext: () => Promise<string>;
const chains: Record<string, ReturnType<typeof query>> = {};

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let orderColumn = "";
  let maxRows = Infinity;
  let single = false;
  const result = async () => {
    if (rejected.has(table)) throw new Error("database unavailable");
    const data = (rows[table] ?? [])
      .filter((row) => filters.every(([column, value]) => row[column] === value))
      .sort((a, b) => String(a[orderColumn]).localeCompare(String(b[orderColumn])))
      .slice(0, maxRows);
    return {
      data: single ? data[0] ?? null : data,
      error: errors.has(table) ? { message: "query failed" } : null,
    };
  };
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((column: string, value: unknown) => { filters.push([column, value]); return chain; }),
    is: vi.fn((column: string, value: unknown) => { filters.push([column, value]); return chain; }),
    order: vi.fn((column: string) => { orderColumn = column; return chain; }),
    limit: vi.fn((limit: number) => { maxRows = limit; return chain; }),
    maybeSingle: vi.fn(() => { single = true; return result(); }),
    then: (resolve: (value: Awaited<ReturnType<typeof result>>) => unknown, reject: (error: unknown) => unknown) => result().then(resolve, reject),
  };
  return chain;
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  errors = new Set();
  rejected = new Set();
  rows = {
    public_portfolios: [
      { id: "b", slug: "beta", is_published: true },
      { id: "private", slug: "aaa", is_published: false },
      { id: "a", slug: "alpha", is_published: true },
    ],
  };
  for (const table of tenantTables) {
    rows[table] = ["b", "private", null, "a"].map((portfolioId) => ({
      portfolio_id: portfolioId, is_published: true, is_visible: true, deleted_at: null,
      name: `${portfolioId} name`, bio: `${portfolioId} bio`, title: `${portfolioId} title`,
      description: `${portfolioId} description`, company: `${portfolioId} company`,
      issuer: `${portfolioId} issuer`, email: `${portfolioId}@example.com`, roles: ["Developer"],
    }));
  }
  from.mockReset().mockImplementation((table: string) => {
    const chain = query(table);
    chains[table] = chain;
    return chain;
  });
  ({ buildSiteContext } = await import("../../lib/ai/context"));
});

afterEach(() => { vi.useRealTimers(); });

describe("public AI context isolation", () => {
  it("selects the first published slug and scopes every content query", async () => {
    const text = await buildSiteContext();
    expect(text).toContain("Name: a name");
    expect(text).toContain("Roles: Developer");
    expect(text).toContain("About: a bio");
    expect(text).toContain("Skills: a name");
    expect(text).toContain("Projects: a title");
    expect(text).toContain("Experience: a title at a company");
    expect(text).toContain("Certifications: a title (a issuer)");
    expect(text).toContain("Contact: a@example.com");
    for (const forbidden of ["b name", "b title", "b bio", "b@example.com", "private", "null"])
      expect(text).not.toContain(forbidden);
    expect(chains.public_portfolios.eq).toHaveBeenCalledWith("is_published", true);
    expect(chains.public_portfolios.order).toHaveBeenCalledWith("slug", { ascending: true });
    expect(chains.public_portfolios.limit).toHaveBeenCalledWith(1);
    for (const table of tenantTables)
      expect(chains[table].eq).toHaveBeenCalledWith("portfolio_id", "a");
  });

  it("preserves publication, visibility, deletion and list limits", async () => {
    await buildSiteContext();
    for (const table of ["hero_content", "about_content", "projects", "experience", "certifications"])
      expect(chains[table].eq).toHaveBeenCalledWith("is_published", true);
    expect(chains.skills.eq).toHaveBeenCalledWith("is_visible", true);
    for (const table of ["skills", "projects", "experience", "certifications"]) {
      expect(chains[table].is).toHaveBeenCalledWith("deleted_at", null);
      expect(chains[table].limit).toHaveBeenCalledWith(100);
    }
  });

  it("returns no context and skips content queries without a published portfolio", async () => {
    rows.public_portfolios = [{ id: "private", slug: "aaa", is_published: false }];
    expect(await buildSiteContext()).toBe("");
    expect(from.mock.calls).toEqual([["public_portfolios"]]);
  });

  it.each(["public_portfolios", ...tenantTables])("fails closed on %s query errors even with data", async (table) => {
    errors.add(table);
    expect(await buildSiteContext()).toBe("");
    errors.delete(table);
    expect(await buildSiteContext()).toContain("Name: a name");
  });

  it.each(["public_portfolios", "hero_content", "skills"])("fails closed on rejected %s queries", async (table) => {
    rejected.add(table);
    expect(await buildSiteContext()).toBe("");
  });

  it("rechecks publication on cache hits without refetching content", async () => {
    expect(await buildSiteContext()).toContain("Name: a name");
    expect(await buildSiteContext()).toContain("Name: a name");
    expect(from.mock.calls.filter(([table]) => table === "public_portfolios")).toHaveLength(2);
    expect(from.mock.calls.filter(([table]) => table === "hero_content")).toHaveLength(1);
  });

  it("does not serve cached context after all portfolios are unpublished", async () => {
    await buildSiteContext();
    rows.public_portfolios = [];
    expect(await buildSiteContext()).toBe("");
  });

  it("partitions cached context by the currently resolved portfolio", async () => {
    expect(await buildSiteContext()).toContain("Name: a name");
    rows.public_portfolios = [{ id: "b", slug: "beta", is_published: true }];
    const text = await buildSiteContext();
    expect(text).toContain("Name: b name");
    expect(text).not.toContain("a name");
    rows.public_portfolios = [{ id: "a", slug: "alpha", is_published: true }];
    expect(await buildSiteContext()).toContain("Name: a name");
  });

  it("does not use a cached context when publication lookup fails", async () => {
    await buildSiteContext();
    errors.add("public_portfolios");
    expect(await buildSiteContext()).toBe("");
  });

  it("does not serve stale context after refresh failure and permits retry", async () => {
    await buildSiteContext();
    vi.advanceTimersByTime(60001);
    errors.add("skills");
    expect(await buildSiteContext()).toBe("");
    errors.delete("skills");
    rows.hero_content = [{ portfolio_id: "a", is_published: true, name: "Updated" }];
    expect(await buildSiteContext()).toContain("Name: Updated");
  });

  it("coalesces concurrent content fetches while checking publication for each call", async () => {
    const texts = await Promise.all([buildSiteContext(), buildSiteContext(), buildSiteContext()]);
    for (const text of texts) expect(text).toContain("Name: a name");
    expect(from.mock.calls.filter(([table]) => table === "public_portfolios")).toHaveLength(3);
    for (const table of tenantTables)
      expect(from.mock.calls.filter(([name]) => name === table)).toHaveLength(1);
  });

  it("caps generated context length", async () => {
    rows.hero_content = [{ portfolio_id: "a", is_published: true, name: "x".repeat(7000) }];
    expect(await buildSiteContext()).toHaveLength(6000);
  });
});
