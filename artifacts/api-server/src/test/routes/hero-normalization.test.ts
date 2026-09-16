/**
 * Hero admin route GET normalization regression.
 *
 * lib/db getHeroContent runs every hero_content read through
 * normalizeHeroContentFields (placeholder social URLs / emails are replaced
 * with the canonical values at read time). The admin GET route used to query
 * the table inline and return the RAW row, so a seeded placeholder row reached
 * the admin UI unnormalized. The route must now produce exactly the lib/db
 * output.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key-hero-normalization";

const { client } = vi.hoisted(() => {
  const client = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { client };
});

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => client),
}));

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req, res, next) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey === mockAdminKey) {
      (req as Record<string, unknown>).adminEmail = "admin@test.com";
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

const PLACEHOLDER_HERO_ROW = {
  id: "hero-1",
  heading: "Hi, I'm",
  name: "Mustafa Sayed",
  email: "admin@example.com",
  github_url: "https://github.com/yourusername",
  linkedin_url: "https://www.linkedin.com/in/mustafa-sayed",
  youtube_url: "https://www.youtube.com/@your-channel",
  facebook_url: "https://www.facebook.com/yourname",
};

describe("GET /api/v1/admin/hero — normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.from.mockReturnThis();
    client.select.mockReturnThis();
    client.limit.mockReturnThis();
    client.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("replaces placeholder social URLs and email with the canonical values", async () => {
    client.maybeSingle.mockResolvedValueOnce({ data: { ...PLACEHOLDER_HERO_ROW }, error: null });

    const res = await request(app)
      .get("/api/v1/admin/hero")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      github_url: "https://github.com/mostafasayed118",
      linkedin_url: "https://www.linkedin.com/in/mustafa-sayed11",
      youtube_url: "https://www.youtube.com/@MustafaSayed273",
      facebook_url: "https://www.facebook.com/mustafa.sayed.91259",
      email: "mustafasayed20002@gmail.com",
    });
  });

  it("returns null data when no hero row exists", async () => {
    const res = await request(app)
      .get("/api/v1/admin/hero")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it("returns 500 with a safe message when the read fails", async () => {
    client.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "relation hero_content does not exist" },
    });

    const res = await request(app)
      .get("/api/v1/admin/hero")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).not.toContain("hero_content");
  });
});
