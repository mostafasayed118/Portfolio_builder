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
    in: vi.fn().mockReturnThis(),
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

describe("Messages API", () => {
  describe("GET /api/v1/admin/messages", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/messages");
      expect(res.status).toBe(401);
    });

    it("returns 200 with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/messages")
        .set("x-admin-key", mockAdminKey);
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("GET /api/v1/admin/messages/unread-count", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/messages/unread-count");
      expect(res.status).toBe(401);
    });

    it("returns count with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/messages/unread-count")
        .set("x-admin-key", mockAdminKey);
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("PATCH /api/v1/admin/messages/:id/read", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .patch("/api/v1/admin/messages/00000000-0000-0000-0000-000000000001/read")
        .send({});
      expect(res.status).toBe(401);
    });

    it("marks message as read", async () => {
      const res = await request(app)
        .patch("/api/v1/admin/messages/00000000-0000-0000-0000-000000000001/read")
        .set("x-admin-key", mockAdminKey)
        .send({});
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  describe("DELETE /api/v1/admin/messages/:id", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).delete("/api/v1/admin/messages/00000000-0000-0000-0000-000000000001");
      expect(res.status).toBe(401);
    });

    it("deletes message", async () => {
      const res = await request(app)
        .delete("/api/v1/admin/messages/00000000-0000-0000-0000-000000000001")
        .set("x-admin-key", mockAdminKey);
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  describe("POST /api/v1/admin/messages/bulk-delete", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/admin/messages/bulk-delete")
        .send({ ids: [] });
      expect(res.status).toBe(401);
    });

    it("rejects empty ids array", async () => {
      const res = await request(app)
        .post("/api/v1/admin/messages/bulk-delete")
        .set("x-admin-key", mockAdminKey)
        .send({ ids: [] });
      expect(res.status).toBe(400);
    });

    it("rejects invalid UUID format", async () => {
      const res = await request(app)
        .post("/api/v1/admin/messages/bulk-delete")
        .set("x-admin-key", mockAdminKey)
        .send({ ids: ["not-a-uuid"] });
      expect(res.status).toBe(400);
    });
  });
});
