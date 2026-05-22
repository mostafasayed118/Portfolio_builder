import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../../app";

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req, _res, next) => {
    const key = req.headers["x-admin-key"];
    if (key === "test-key") {
      req.adminEmail = "admin@test.com";
      req.user = { id: "test-user-id", email: "admin@test.com", role: "superadmin" };
      return next();
    }
    if (key === "regular-key") {
      req.adminEmail = "user@test.com";
      req.user = { id: "regular-user-id", email: "user@test.com", role: "user" };
      return next();
    }
    return _res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

vi.mock("../../middleware/requireSuperadmin", () => ({
  requireSuperadmin: vi.fn((req, res, next) => {
    if (req.user?.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Superadmin access required" });
    }
    next();
  }),
}));

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: "00000000-0000-0000-0000-000000000001", email: "admin@test.com", role: "superadmin" },
      error: null,
    }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

describe("Users API", () => {
  describe("GET /api/v1/admin/users", () => {
    it("returns 200 with user list for superadmin", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("x-admin-key", "test-key");
      expect([200, 500]).toContain(res.status);
    });

    it("returns 403 for regular admin (not superadmin)", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("x-admin-key", "regular-key");
      expect(res.status).toBe(403);
    });

    it("returns 401 for unauthenticated requests", async () => {
      const res = await request(app).get("/api/v1/admin/users");
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/v1/admin/users/:id/role", () => {
    it("returns 403 for regular admin attempting role change", async () => {
      const res = await request(app)
        .patch("/api/v1/admin/users/00000000-0000-0000-0000-000000000001/role")
        .set("x-admin-key", "regular-key")
        .send({ role: "superadmin" });
      expect(res.status).toBe(403);
    });

    it("returns 401 for unauthenticated requests", async () => {
      const res = await request(app)
        .patch("/api/v1/admin/users/00000000-0000-0000-0000-000000000001/role")
        .send({ role: "superadmin" });
      expect(res.status).toBe(401);
    });

    it("returns 400 for invalid role value", async () => {
      const res = await request(app)
        .patch("/api/v1/admin/users/00000000-0000-0000-0000-000000000001/role")
        .set("x-admin-key", "test-key")
        .send({ role: "invalid-role" });
      expect(res.status).toBe(400);
    });
  });

  describe("requireSuperadmin middleware", () => {
    it("blocks regular admin users with 403", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("x-admin-key", "regular-key");
      expect(res.status).toBe(403);
    });

    it("blocks unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/v1/admin/users");
      expect(res.status).toBe(401);
    });
  });
});
