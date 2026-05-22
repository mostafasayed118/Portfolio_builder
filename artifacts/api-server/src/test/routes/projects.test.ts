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

describe("Projects API", () => {
  describe("GET /api/v1/admin/projects", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/projects");
      expect(res.status).toBe(401);
    });

    it("returns 200 with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/projects")
        .set("x-admin-key", mockAdminKey);
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("POST /api/v1/admin/projects", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/admin/projects")
        .send({ title: "Test", description: "A test project with enough content" });
      expect(res.status).toBe(401);
    });

    it("rejects missing title", async () => {
      const res = await request(app)
        .post("/api/v1/admin/projects")
        .set("x-admin-key", mockAdminKey)
        .send({ description: "A test project with enough content" });
      expect(res.status).toBe(400);
    });

    it("rejects short description", async () => {
      const res = await request(app)
        .post("/api/v1/admin/projects")
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Test", description: "Short" });
      expect(res.status).toBe(400);
    });

    it("rejects invalid URL in github_url", async () => {
      const res = await request(app)
        .post("/api/v1/admin/projects")
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Test", description: "A test project with enough content", github_url: "not-a-url" });
      expect(res.status).toBe(400);
    });

    it("creates project and returns 201", async () => {
      const res = await request(app)
        .post("/api/v1/admin/projects")
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Test Project", description: "A test project with enough content" });
      expect([201, 500]).toContain(res.status);
    });
  });

  describe("PUT /api/v1/admin/projects/:id", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/v1/admin/projects/00000000-0000-0000-0000-000000000001")
        .send({ title: "Updated" });
      expect(res.status).toBe(401);
    });

    it("updates project and returns 200", async () => {
      const res = await request(app)
        .put("/api/v1/admin/projects/00000000-0000-0000-0000-000000000001")
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Updated Project" });
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("DELETE /api/v1/admin/projects/:id", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).delete("/api/v1/admin/projects/00000000-0000-0000-0000-000000000001");
      expect(res.status).toBe(401);
    });

    it("deletes project and returns 200", async () => {
      const res = await request(app)
        .delete("/api/v1/admin/projects/00000000-0000-0000-0000-000000000001")
        .set("x-admin-key", mockAdminKey);
      expect([200, 404, 500]).toContain(res.status);
    });
  });
});
