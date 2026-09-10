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
