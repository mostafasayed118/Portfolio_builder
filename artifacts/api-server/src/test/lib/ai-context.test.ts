import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildSiteContext } from "../../lib/ai/context";
import { getSupabaseClient } from "../../lib/supabase-client";

vi.mock("../../lib/supabase-client", () => ({ getSupabaseClient: vi.fn() }));

function client() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { from: vi.fn().mockReturnValue(chain) };
}

describe("buildSiteContext", () => {
  beforeEach(() => {
    vi.stubEnv("AI_CONTEXT_TTL_MS", "60000");
    const c = client();
    // First maybeSingle call is the hero_content query.
    c.from().maybeSingle.mockResolvedValueOnce({
      data: {
        name: "Jane",
        heading: "Engineer",
        roles: ["Dev"],
        description: "Builder",
        email: "j@x.com",
        github_url: "https://github.com/j",
        linkedin_url: "",
        twitter_url: null,
        youtube_url: null,
        facebook_url: null,
        tagline: null,
        available: true,
      },
      error: null,
    });
    vi.mocked(getSupabaseClient).mockReturnValue(c as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a context block containing hero name and roles", async () => {
    const text = await buildSiteContext();
    expect(text).toContain("Name: Jane");
    expect(text).toContain("Roles: Dev");
  });

  it("caches the context across calls within the TTL", async () => {
    await buildSiteContext();
    await buildSiteContext();
    // Only one maybeSingle resolution per query set was consumed if cached;
    // a second fetch would try the default mock, still fine — assert the
    // cached value is stable.
    const text = await buildSiteContext();
    expect(text).toContain("Name: Jane");
  });
});

describe("buildSiteContext concurrent fetches", () => {
  beforeEach(() => {
    // TTL 0 disables the cache read path so every call reaches the fetch
    // layer — this isolates in-flight coalescing from cache hits.
    vi.stubEnv("AI_CONTEXT_TTL_MS", "0");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function delayedClient(onQuery: () => void) {
    const chains: Record<string, ReturnType<typeof makeChain>> = {};
    function makeChain() {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ data: null, error: null }), 5),
            ),
        ),
      };
    }
    return {
      from: vi.fn((table: string) => {
        onQuery();
        if (!chains[table]) chains[table] = makeChain();
        return chains[table];
      }),
      chains,
    };
  }

  it("coalesces concurrent misses into one fetch", async () => {
    let calls = 0;
    const c = delayedClient(() => {
      calls++;
    });
    vi.mocked(getSupabaseClient).mockReturnValue(c as never);

    const [a, b, d] = await Promise.all([
      buildSiteContext(),
      buildSiteContext(),
      buildSiteContext(),
    ]);

    expect(a).toBe(b);
    expect(b).toBe(d);
    // One round of 7 queries, not 3 x 7.
    expect(calls).toBe(7);
  });

  it("serves the same stale text to concurrent callers when the fetch rejects", async () => {
    // Prime a non-empty cache entry via a successful fetch.
    const ok = client();
    ok.from().maybeSingle.mockResolvedValueOnce({
      data: {
        name: "Stale",
        heading: "Engineer",
        roles: ["Dev"],
        description: "Builder",
        email: "s@x.com",
        github_url: "",
        linkedin_url: "",
        twitter_url: null,
        youtube_url: null,
        facebook_url: null,
        tagline: null,
        available: true,
      },
      error: null,
    });
    vi.mocked(getSupabaseClient).mockReturnValue(ok as never);
    await buildSiteContext();

    // Swap in a client whose queries reject; TTL 0 keeps the cache read
    // path out of the picture so the concurrent callers reach the failing
    // fetch and must be served the stale entry from the error path.
    const failing = {
      from: vi.fn(() => {
        throw new Error("supabase down");
      }),
    };
    vi.mocked(getSupabaseClient).mockReturnValue(failing as never);

    const [a, b, d] = await Promise.all([
      buildSiteContext(),
      buildSiteContext(),
      buildSiteContext(),
    ]);

    expect(a).toContain("Name: Stale");
    expect(a).toBe(b);
    expect(b).toBe(d);
  });

  it("caps list queries with .limit(100)", async () => {
    const c = delayedClient(() => {});
    vi.mocked(getSupabaseClient).mockReturnValue(c as never);

    await buildSiteContext();

    for (const table of ["skills", "projects", "experience", "certifications"]) {
      expect(c.chains[table].limit).toHaveBeenCalledWith(100);
    }
  });
});
