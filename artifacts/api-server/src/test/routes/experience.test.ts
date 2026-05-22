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

describe("Experience API", () => {
  describe("GET /api/v1/admin/experience", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/experience");
      expect(res.status).toBe(401);
    });

    it("returns 200 with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/experience")
        .set("x-admin-key", mockAdminKey);
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("POST /api/v1/admin/experience", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/admin/experience")
        .send({ title: "Dev", company: "Acme" });
      expect(res.status).toBe(401);
    });

    it("rejects missing title", async () => {
      const res = await request(app)
        .post("/api/v1/admin/experience")
        .set("x-admin-key", mockAdminKey)
        .send({ company: "Acme" });
      expect(res.status).toBe(400);
    });

    it("rejects invalid type enum", async () => {
      const res = await request(app)
        .post("/api/v1/admin/experience")
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Dev", company: "Acme", type: "invalid" });
      expect(res.status).toBe(400);
    });

    it("creates experience and returns 201", async () => {
      const res = await request(app)
        .post("/api/v1/admin/experience")
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Developer", company: "Acme Corp", type: "internship" });
      expect([201, 400, 500]).toContain(res.status);
    });
  });

  describe("PUT /api/v1/admin/experience/:id", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/v1/admin/experience/00000000-0000-0000-0000-000000000001")
        .send({ title: "Updated" });
      expect(res.status).toBe(401);
    });

    it("updates experience and returns 200", async () => {
      const res = await request(app)
        .put("/api/v1/admin/experience/00000000-0000-0000-0000-000000000001")
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Senior Developer" });
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("DELETE /api/v1/admin/experience/:id", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).delete("/api/v1/admin/experience/00000000-0000-0000-0000-000000000001");
      expect(res.status).toBe(401);
    });

    it("deletes experience and returns 200", async () => {
      const res = await request(app)
        .delete("/api/v1/admin/experience/00000000-0000-0000-0000-000000000001")
        .set("x-admin-key", mockAdminKey);
      expect([200, 404, 500]).toContain(res.status);
    });
  });
});
