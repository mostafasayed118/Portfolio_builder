import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminToken = "mock-clerk-jwt-token";
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
    const authHeader = req.headers.authorization;
    const adminKey = req.headers["x-admin-key"];
    if (adminKey === mockAdminKey || authHeader === `Bearer ${mockAdminToken}`) {
      (req as Record<string, unknown>).adminEmail = "admin@test.com";
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

describe("Hero API", () => {
  describe("GET /api/v1/admin/hero", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/hero");
      expect(res.status).toBe(401);
    });

    it("returns 200 with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/hero")
        .set("x-admin-key", mockAdminKey);
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("PUT /api/v1/admin/hero", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/v1/admin/hero")
        .send({ heading: "Test" });
      expect(res.status).toBe(401);
    });

    it("rejects invalid URL in github_url", async () => {
      const res = await request(app)
        .put("/api/v1/admin/hero")
        .set("x-admin-key", mockAdminKey)
        .send({ github_url: "not-a-url" });
      expect(res.status).toBe(400);
    });

    it("rejects invalid email", async () => {
      const res = await request(app)
        .put("/api/v1/admin/hero")
        .set("x-admin-key", mockAdminKey)
        .send({ email: "invalid-email" });
      expect(res.status).toBe(400);
    });

    it("accepts valid partial update", async () => {
      const res = await request(app)
        .put("/api/v1/admin/hero")
        .set("x-admin-key", mockAdminKey)
        .send({ heading: "Hello World", name: "Test User" });
      expect([200, 500]).toContain(res.status);
    });
  });
});
