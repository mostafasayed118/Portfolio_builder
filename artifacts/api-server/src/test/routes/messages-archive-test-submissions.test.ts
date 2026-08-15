/**
 * Regression tests for POST /api/v1/admin/messages/archive-test-submissions.
 *
 * The one-click E2E-test cleanup must be server-side (the list endpoint
 * paginates, so the client can't see all rows), superadmin-only, and must
 * archive exactly the still-visible `e2e-%` rows — reporting how many were
 * archived. The route counts the visible e2e rows first (typed head-count),
 * then updates the identical predicate. Mirrors the messages-archive test
 * pattern: getSupabaseClient is pinned to a stable client whose chains are
 * what the route actually runs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key-cleanup";
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
//  - count: from().select(id, {count, head}).ilike().is() -> { count, error }
//  - update: from().update(patch).ilike().is() -> { error }
type Chain = {
  ilike: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
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
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockResolvedValue({ count: 2, error: null }),
  };
}

function updateChain(): Chain & { select?: ReturnType<typeof vi.fn> } {
  return {
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockResolvedValue({ error: null }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRole = "superadmin";
  mockSupabase.select.mockReturnValue(countChain());
  mockSupabase.update.mockReturnValue(updateChain());
  mockSupabase.from.mockReturnValue(mockSupabase);
});

describe("POST /api/v1/admin/messages/archive-test-submissions", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/v1/admin/messages/archive-test-submissions");
    expect(res.status).toBe(401);
  });

  it("requires superadmin (403 for regular admins)", async () => {
    mockRole = "admin";
    const res = await request(app)
      .post("/api/v1/admin/messages/archive-test-submissions")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("success", false);
  });

  it("counts and archives exactly the visible e2e-% rows, reporting the count", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/archive-test-submissions")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { archived: 2 } });

    // Count query: select("id", { count, head }) + ilike("email","e2e-%") + is("deleted_at",null)
    const countChain = mockSupabase.select.mock.results[0].value as Chain;
    expect(countChain.ilike).toHaveBeenCalledWith("email", "e2e-%");
    expect(countChain.is).toHaveBeenCalledWith("deleted_at", null);

    // Update query: stamps deleted_at on the identical predicate.
    const update = mockSupabase.update.mock.results[0].value as Chain;
    const patch = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(patch.deleted_at).toEqual(expect.any(String));
    expect(update.ilike).toHaveBeenCalledWith("email", "e2e-%");
    expect(update.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("reports 0 when the count query finds nothing", async () => {
    mockSupabase.select.mockReturnValue({
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ count: 0, error: null }),
    });

    const res = await request(app)
      .post("/api/v1/admin/messages/archive-test-submissions")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { archived: 0 } });
  });

  it("surfaces a count-query Supabase error as a 500", async () => {
    mockSupabase.select.mockReturnValue({
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ count: null, error: { message: "boom" } }),
    });

    const res = await request(app)
      .post("/api/v1/admin/messages/archive-test-submissions")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("success", false);
  });
});
