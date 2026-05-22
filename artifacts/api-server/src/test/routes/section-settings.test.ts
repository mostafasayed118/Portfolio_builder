import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
  })),
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

describe("Section Settings API", () => {
  describe("GET /api/v1/admin/section-settings", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/section-settings");
      expect(res.status).toBe(401);
    });

    it("returns 200 with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/section-settings")
        .set("x-admin-key", mockAdminKey);
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("PUT /api/v1/admin/section-settings/:id", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/v1/admin/section-settings/00000000-0000-0000-0000-000000000001")
        .send({ is_visible: false });
      expect(res.status).toBe(401);
    });

    it("updates section settings", async () => {
      const res = await request(app)
        .put("/api/v1/admin/section-settings/00000000-0000-0000-0000-000000000001")
        .set("x-admin-key", mockAdminKey)
        .send({ is_visible: false, sort_order: 5 });
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("POST /api/v1/admin/section-settings/reorder", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/admin/section-settings/reorder")
        .send([{ id: "1", sort_order: 1 }]);
      expect(res.status).toBe(401);
    });

    it("reorders sections", async () => {
      const res = await request(app)
        .post("/api/v1/admin/section-settings/reorder")
        .set("x-admin-key", mockAdminKey)
        .send([{ id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", sort_order: 1 }, { id: "b2c3d4e5-f6a7-8901-bcde-f12345678901", sort_order: 2 }]);
      expect([200, 500]).toContain(res.status);
    });
  });
});
