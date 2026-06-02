/**
 * Regression tests for TASK-004 / TASK-010.
 *
 * Verifies that PUT /:id and DELETE /:id routes return 404 when no row
 * matches the query (count === 0), rather than silently returning 200.
 *
 * This test file mocks Supabase at the module level to control the
 * `count` value returned by `.update().eq().select("id")` calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key-404";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req, res, next) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey === mockAdminKey) {
      (req as Record<string, unknown>).adminEmail = "admin@test.com";
      (req as Record<string, unknown>).user = { id: "user-1", email: "admin@test.com", role: "superadmin" };
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

// Mock the supabase client to return count=0 for update operations
// This simulates "no row matched" for PUT /:id and DELETE /:id
import { getSupabaseClient } from "../../lib/supabase-client";
const mockSupabase = getSupabaseClient() as unknown as {
  from: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  // Reset the chain mock for update → select("id") to return count=0
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
  };
  mockSupabase.update.mockReturnValue(updateChain);
  mockSupabase.from.mockReturnValue(mockSupabase);
});

const NONEXISTENT_UUID = "11111111-1111-1111-1111-111111111111";

describe("Regression: 404 on nonexistent row (TASK-004 / TASK-010)", () => {
  describe("PUT /api/v1/admin/projects/:id with missing row", () => {
    it("returns 404 when no project matches the id", async () => {
      const res = await request(app)
        .put(`/api/v1/admin/projects/${NONEXISTENT_UUID}`)
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Updated Title" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Project not found");
    });

    it("returns 400 if id is not a valid UUID", async () => {
      const res = await request(app)
        .put("/api/v1/admin/projects/not-a-uuid")
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Updated Title" });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/v1/admin/projects/:id with missing row", () => {
    it("returns 404 when no project matches the id", async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/projects/${NONEXISTENT_UUID}`)
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Project not found");
    });
  });

  describe("PUT /api/v1/admin/skills/:id with missing row", () => {
    it("returns 404 when no skill matches the id", async () => {
      const res = await request(app)
        .put(`/api/v1/admin/skills/${NONEXISTENT_UUID}`)
        .set("x-admin-key", mockAdminKey)
        .send({ name: "Updated Skill" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Skill not found");
    });
  });

  describe("DELETE /api/v1/admin/skills/:id with missing row", () => {
    it("returns 404 when no skill matches the id", async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/skills/${NONEXISTENT_UUID}`)
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Skill not found");
    });
  });

  describe("PUT /api/v1/admin/experience/:id with missing row", () => {
    it("returns 404 when no experience matches the id", async () => {
      const res = await request(app)
        .put(`/api/v1/admin/experience/${NONEXISTENT_UUID}`)
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Updated Title", company: "Updated Co" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Experience not found");
    });
  });

  describe("DELETE /api/v1/admin/experience/:id with missing row", () => {
    it("returns 404 when no experience matches the id", async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/experience/${NONEXISTENT_UUID}`)
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Experience not found");
    });
  });

  describe("PUT /api/v1/admin/certifications/:id with missing row", () => {
    it("returns 404 when no certification matches the id", async () => {
      const res = await request(app)
        .put(`/api/v1/admin/certifications/${NONEXISTENT_UUID}`)
        .set("x-admin-key", mockAdminKey)
        .send({ name: "Updated Cert", issuer: "Issuer", issue_date: "2024-01-01" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Certification not found");
    });
  });

  describe("DELETE /api/v1/admin/certifications/:id with missing row", () => {
    it("returns 404 when no certification matches the id", async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/certifications/${NONEXISTENT_UUID}`)
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Certification not found");
    });
  });

  describe("PUT /api/v1/admin/section-settings/:id with missing row", () => {
    it("returns 404 when no section setting matches the id", async () => {
      const res = await request(app)
        .put(`/api/v1/admin/section-settings/${NONEXISTENT_UUID}`)
        .set("x-admin-key", mockAdminKey)
        .send({ is_visible: false });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Section setting not found");
    });
  });

  describe("PATCH /api/v1/admin/messages/:id/read with missing row", () => {
    it("returns 404 when no message matches the id", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/messages/${NONEXISTENT_UUID}/read`)
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Message not found");
    });
  });

  describe("DELETE /api/v1/admin/messages/:id with missing row", () => {
    it("returns 404 when no message matches the id", async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/messages/${NONEXISTENT_UUID}`)
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Message not found");
    });
  });

  describe("PATCH /api/v1/admin/users/:id/role with missing row", () => {
    it("returns 404 when no user matches the id", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${NONEXISTENT_UUID}/role`)
        .set("x-admin-key", mockAdminKey)
        .send({ role: "user" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "User not found");
    });
  });

  describe("Boundary: count=null should also produce 404", () => {
    it("returns 404 when update result has count=null", async () => {
      const updateChain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [], count: null, error: null }),
      };
      mockSupabase.update.mockReturnValue(updateChain);

      const res = await request(app)
        .put(`/api/v1/admin/projects/${NONEXISTENT_UUID}`)
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Updated Title" });

      expect(res.status).toBe(404);
    });
  });
});
