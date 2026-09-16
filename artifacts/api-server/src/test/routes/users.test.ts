import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

// ---------------------------------------------------------------------------
// The users route delegates persistence to @workspace/db/users. That module is
// real code here — the boundary is the Supabase client, so this file overrides
// the global lib/supabase-client mock with a chainable fake whose terminal
// methods each test controls. The fake lives in vi.hoisted: vi.mock factories
// are hoisted above module evaluation, so any outer variable they reference
// must be created there or the mock silently never applies.
// ---------------------------------------------------------------------------
const { client } = vi.hoisted(() => {
  const client = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  };
  return { client };
});

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => client),
}));

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req, _res, next) => {
    const key = req.headers["x-admin-key"];
    if (key === "test-key") {
      req.adminEmail = "admin@test.com";
      req.user = { id: "00000000-0000-0000-0000-000000000001", email: "admin@test.com", role: "superadmin" };
      return next();
    }
    if (key === "regular-key") {
      req.adminEmail = "user@test.com";
      req.user = { id: "00000000-0000-0000-0000-000000000002", email: "user@test.com", role: "user" };
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

const USER_ROW = {
  id: "00000000-0000-0000-0000-000000000009",
  clerk_id: "clerk_9",
  email: "admin@test.com",
  name: "Admin",
  role: "superadmin",
  created_at: "2026-01-01T00:00:00Z",
};

describe("Users API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/admin/users", () => {
    it("returns 200 with a paginated envelope for superadmin", async () => {
      client.range.mockResolvedValueOnce({ data: [USER_ROW], count: 1, error: null });

      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("x-admin-key", "test-key");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([USER_ROW]);
      expect(res.body.pagination).toEqual({
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false,
      });
      expect(client.from).toHaveBeenCalledWith("users");
      expect(client.select).toHaveBeenCalledWith(
        "id, clerk_id, email, name, role, created_at",
        { count: "exact" },
      );
      expect(client.order).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(client.range).toHaveBeenCalledWith(0, 49);
    });

    it("forwards limit/offset query params to the range query", async () => {
      client.range.mockResolvedValueOnce({ data: [], count: 0, error: null });

      const res = await request(app)
        .get("/api/v1/admin/users?limit=10&offset=20")
        .set("x-admin-key", "test-key");

      expect(res.status).toBe(200);
      expect(client.range).toHaveBeenCalledWith(20, 29);
    });

    it("returns a 500 envelope when the DB query fails", async () => {
      client.range.mockResolvedValueOnce({ data: null, count: null, error: new Error("db down") });

      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("x-admin-key", "test-key");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Internal server error");
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
    it("returns 200 with the updated user on success", async () => {
      const updated = { ...USER_ROW, role: "user" };
      client.select.mockResolvedValueOnce({ data: [updated], count: null, error: null });

      const res = await request(app)
        .patch("/api/v1/admin/users/00000000-0000-0000-0000-000000000009/role")
        .set("x-admin-key", "test-key")
        .send({ role: "user" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(updated);
      expect(client.update).toHaveBeenCalledWith({ role: "user" });
      expect(client.eq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000009");
      expect(client.select).toHaveBeenCalledWith("id, clerk_id, email, name, role, created_at");
    });

    it("returns 404 with 'User not found' when the update matches no rows", async () => {
      client.select.mockResolvedValueOnce({ data: [], count: null, error: null });

      const res = await request(app)
        .patch("/api/v1/admin/users/00000000-0000-0000-0000-000000000009/role")
        .set("x-admin-key", "test-key")
        .send({ role: "user" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("User not found");
      expect(client.update).toHaveBeenCalledWith({ role: "user" });
    });

    it("returns 400 with role field errors for invalid role value", async () => {
      const res = await request(app)
        .patch("/api/v1/admin/users/00000000-0000-0000-0000-000000000009/role")
        .set("x-admin-key", "test-key")
        .send({ role: "invalid-role" });
      expect(res.status).toBe(400);
      expect(res.body.errors.role).toBeDefined();
      expect(client.update).not.toHaveBeenCalled();
    });

    it("returns 400 when a superadmin tries to demote themselves", async () => {
      const res = await request(app)
        .patch("/api/v1/admin/users/00000000-0000-0000-0000-000000000001/role")
        .set("x-admin-key", "test-key")
        .send({ role: "user" });

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual({ role: ["Cannot demote yourself"] });
      expect(client.update).not.toHaveBeenCalled();
    });

    it("returns a 500 envelope when the DB update fails", async () => {
      client.select.mockResolvedValueOnce({ data: null, error: new Error("db down") });

      const res = await request(app)
        .patch("/api/v1/admin/users/00000000-0000-0000-0000-000000000009/role")
        .set("x-admin-key", "test-key")
        .send({ role: "superadmin" });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Internal server error");
    });

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
  });

  describe("GET /api/v1/admin/users/me", () => {
    it("returns the current authenticated admin", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users/me")
        .set("x-admin-key", "test-key");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@test.com",
        role: "superadmin",
      });
    });
  });
});
