/**
 * Regression tests for the admin Messages archive/unarchive endpoints.
 *
 * Archive must set `deleted_at` (soft-delete — hides the row from the inbox
 * and the unread count), unarchive must clear it back to null, and both must
 * be user-scope aware and 404 when no row matches. Mirrors the collection-404
 * pattern: getSupabaseClient is pinned to one stable client so the chain this
 * file configures is what the routes actually run.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key-archive";

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

import { getSupabaseClient } from "../../lib/supabase-client";

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  update: vi.fn(),
  select: vi.fn(),
  eq: vi.fn().mockReturnThis(),
} as unknown as {
  from: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
};

vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as never);

const UUID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: a successful update — the row matched and was returned.
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({ data: [{ id: UUID }], count: null, error: null }),
  };
  mockSupabase.update.mockReturnValue(updateChain);
  mockSupabase.from.mockReturnValue(mockSupabase);
});

describe("POST /api/v1/admin/messages/:id/archive", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post(`/api/v1/admin/messages/${UUID}/archive`);
    expect(res.status).toBe(401);
  });

  it("sets deleted_at (soft-delete) on the matching row", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/messages/${UUID}/archive`)
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    // The archive must stamp a deleted_at timestamp — not just flip status.
    const patch = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(patch.deleted_at).toEqual(expect.any(String));
    expect(new Date(patch.deleted_at as string).getTime()).not.toBeNaN();
    // `eq` runs on the chain returned by `update`, not on the top-level mock.
    const chain = mockSupabase.update.mock.results[0].value as { eq: ReturnType<typeof vi.fn> };
    expect(chain.eq).toHaveBeenCalledWith("id", UUID);
  });

  it("returns 404 when no row matches", async () => {
    mockSupabase.update.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], count: null, error: null }),
    });

    const res = await request(app)
      .post(`/api/v1/admin/messages/${UUID}/archive`)
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message", "Message not found");
  });

  it("rejects a non-UUID id", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/not-a-uuid/archive")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/admin/messages/:id/unarchive", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post(`/api/v1/admin/messages/${UUID}/unarchive`);
    expect(res.status).toBe(401);
  });

  it("clears deleted_at back to null on the matching row", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/messages/${UUID}/unarchive`)
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    const patch = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(patch).toHaveProperty("deleted_at", null);
    const chain = mockSupabase.update.mock.results[0].value as { eq: ReturnType<typeof vi.fn> };
    expect(chain.eq).toHaveBeenCalledWith("id", UUID);
  });

  it("returns 404 when no row matches", async () => {
    mockSupabase.update.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], count: null, error: null }),
    });

    const res = await request(app)
      .post(`/api/v1/admin/messages/${UUID}/unarchive`)
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message", "Message not found");
  });

  it("rejects a non-UUID id", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/not-a-uuid/unarchive")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(400);
  });
});
