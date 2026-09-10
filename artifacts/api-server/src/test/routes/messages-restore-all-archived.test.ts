/**
 * Regression tests for POST /api/v1/admin/messages/restore-all-archived.
 *
 * The one-click "empty the Archived tab" action must be server-side (the
 * list endpoint paginates, so the client can't see every archived row),
 * superadmin-only, and must clear `deleted_at` on exactly the soft-deleted
 * rows — reporting how many were restored. The route counts the archived
 * rows first (typed head-count), then updates the identical predicate.
 * Mirrors the archive-test-submissions test pattern: getSupabaseClient is
 * pinned to a stable client whose chains are what the route actually runs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key-restore-all";
// Toggleable per-test so the same module mock can serve superadmin and
// non-superadmin cases.
let mockRole: "superadmin" | "admin" = "superadmin";

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req, res, next) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey === mockAdminKey) {
      (req as Record<string, unknown>).adminEmail = "admin@test.com";
      (req as Record<string, unknown>).user = {
        id: "user-1",
        email: "admin@test.com",
        role: mockRole,
      };
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

import { getSupabaseClient } from "../../lib/supabase-client";

// Chain shapes:
//  - count: from().select(id, {count, head}).not(deleted_at, is, null) -> { count, error }
//  - update: from().update(patch).not(deleted_at, is, null) -> { error }
type Chain = {
  not: ReturnType<typeof vi.fn>;
};

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn(),
  update: vi.fn(),
} as unknown as {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as never);

function countChain(): Chain {
  return {
    not: vi.fn().mockResolvedValue({ count: 2, error: null }),
  };
}

function updateChain(): Chain {
  return {
    not: vi.fn().mockResolvedValue({ error: null }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRole = "superadmin";
  mockSupabase.select.mockReturnValue(countChain());
  mockSupabase.update.mockReturnValue(updateChain());
  mockSupabase.from.mockReturnValue(mockSupabase);
});

describe("POST /api/v1/admin/messages/restore-all-archived", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/v1/admin/messages/restore-all-archived");
    expect(res.status).toBe(401);
  });

  it("requires superadmin (403 for regular admins)", async () => {
    mockRole = "admin";
    const res = await request(app)
      .post("/api/v1/admin/messages/restore-all-archived")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("success", false);
  });

  it("counts and restores exactly the archived rows, reporting the count", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/restore-all-archived")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { restored: 2 } });

    // Count query: select(id, {count, head}) + not(deleted_at, is, null)
    const countChain = mockSupabase.select.mock.results[0].value as Chain;
    expect(countChain.not).toHaveBeenCalledWith("deleted_at", "is", null);

    // Update query: clears deleted_at on the identical predicate (the inverse
    // of archive-test-submissions, which stamps it).
    const update = mockSupabase.update.mock.results[0].value as Chain;
    const patch = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(patch).toEqual({ deleted_at: null });
    expect(update.not).toHaveBeenCalledWith("deleted_at", "is", null);
  });

  it("uses the exact same predicate on the count and update statements", async () => {
    await request(app)
      .post("/api/v1/admin/messages/restore-all-archived")
      .set("x-admin-key", mockAdminKey);

    const countChain = mockSupabase.select.mock.results[0].value as Chain;
    const updateChain = mockSupabase.update.mock.results[0].value as Chain;
    const countArgs = countChain.not.mock.calls[0];
    const updateArgs = updateChain.not.mock.calls[0];
    // Compare the two ACTUAL calls to each other — if the count and update
    // ever target different sets (e.g. one regresses to an inline copy),
    // the response would report N restored while a different N is touched.
    expect(updateArgs).toEqual(countArgs);
    expect(countArgs).toEqual(["deleted_at", "is", null]);
  });

  it("reports 0 when the count query finds no archived rows", async () => {
    mockSupabase.select.mockReturnValue({
      not: vi.fn().mockResolvedValue({ count: 0, error: null }),
    });

    const res = await request(app)
      .post("/api/v1/admin/messages/restore-all-archived")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { restored: 0 } });
  });

  it("surfaces a count-query Supabase error as a 500", async () => {
    mockSupabase.select.mockReturnValue({
      not: vi.fn().mockResolvedValue({ count: null, error: { message: "boom" } }),
    });

    const res = await request(app)
      .post("/api/v1/admin/messages/restore-all-archived")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("success", false);
  });
});
