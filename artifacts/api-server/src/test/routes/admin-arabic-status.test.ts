import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

// ---------------------------------------------------------------------------
// The arabic-status route delegates persistence to @workspace/db/arabic-status.
// That module is real code here — the boundary is the Supabase client, so this
// file overrides the global lib/supabase-client mock with a chainable fake
// whose terminal `.not()` each test controls (from → select → not).
// ---------------------------------------------------------------------------
const { client } = vi.hoisted(() => {
  const client = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    not: vi.fn(),
  };
  return { client };
});

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => client),
}));

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req, res, next) => {
    if (req.headers["x-admin-key"] === "test-key") {
      req.adminEmail = "admin@test.com";
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

describe("Admin arabic-status API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.from.mockReturnThis();
    client.select.mockReturnThis();
  });

  describe("GET /api/v1/admin/arabic-status", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/arabic-status");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns per-table translation status in the envelope", async () => {
      client.not
        .mockResolvedValueOnce({ data: null, count: 1, error: null }) // hero_content
        .mockResolvedValueOnce({ data: null, count: 1, error: null }) // about_content
        .mockResolvedValueOnce({ data: null, count: 3, error: null }) // projects
        .mockResolvedValueOnce({ data: null, count: 2, error: null }) // experience
        .mockResolvedValueOnce({ data: null, count: 0, error: null }); // certifications

      const res = await request(app)
        .get("/api/v1/admin/arabic-status")
        .set("x-admin-key", "test-key");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        hero: true,
        about: true,
        projects: { filled: 3 },
        experience: { filled: 2 },
        certifications: { filled: 0 },
      });
      expect(client.from).toHaveBeenCalledWith("hero_content");
      expect(client.from).toHaveBeenCalledWith("about_content");
      expect(client.from).toHaveBeenCalledWith("projects");
      expect(client.from).toHaveBeenCalledWith("experience");
      expect(client.from).toHaveBeenCalledWith("certifications");
      expect(client.select).toHaveBeenCalledWith("name_ar", { count: "exact", head: true });
      expect(client.not).toHaveBeenCalledWith("name_ar", "is", null);
      expect(client.not).toHaveBeenCalledWith("title_ar", "is", null);
    });

    it("returns 500 (safe message) when a table query fails", async () => {
      client.not
        .mockResolvedValueOnce({ data: null, count: 1, error: null })
        .mockResolvedValueOnce({ data: null, count: 0, error: { message: "db down" } });

      const res = await request(app)
        .get("/api/v1/admin/arabic-status")
        .set("x-admin-key", "test-key");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).not.toContain("db down");
    });
  });
});
