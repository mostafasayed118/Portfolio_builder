/**
 * Regression tests for POST /api/v1/admin/messages/archive-test-submissions.
 *
 * The one-click test-submission cleanup must be server-side (the list
 * endpoint paginates, so the client can't see all rows), superadmin-only,
 * and must archive exactly the still-visible test rows — emails starting
 * with `e2e-` or `qa.verify.`, or exactly `test@test.com` — reporting how
 * many were archived. The route counts the visible test rows first (typed
 * head-count), then updates the identical predicate. Mirrors the
 * messages-archive test pattern: getSupabaseClient is pinned to a stable
 * client whose chains are what the route actually runs.
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
//  - count: from().select(id, {count, head}).or().is() -> { count, error }
//  - update: from().update(patch).or().is() -> { error }
type Chain = {
  or: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
};

/** The exact predicate the route must apply to both statements. */
const EXPECTED_PREDICATE =
  "email.ilike.e2e-%,email.ilike.qa.verify.%,email.ilike.test@test.com";

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
    or: vi.fn().mockReturnThis(),
    is: vi.fn().mockResolvedValue({ count: 2, error: null }),
  };
}

function updateChain(): Chain {
  return {
    or: vi.fn().mockReturnThis(),
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

  it("counts and archives exactly the visible test-submission rows, reporting the count", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/archive-test-submissions")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { archived: 2 } });

    // Count query: select("id", { count, head }) + or(email predicate) + is("deleted_at",null)
    const countChain = mockSupabase.select.mock.results[0].value as Chain;
    expect(countChain.or).toHaveBeenCalledWith(EXPECTED_PREDICATE);
    expect(countChain.is).toHaveBeenCalledWith("deleted_at", null);

    // Update query: stamps deleted_at on the identical predicate.
    const update = mockSupabase.update.mock.results[0].value as Chain;
    const patch = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(patch.deleted_at).toEqual(expect.any(String));
    expect(update.or).toHaveBeenCalledWith(EXPECTED_PREDICATE);
    expect(update.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("covers e2e-*, qa.verify.*, AND test@test.com rows — not just e2e-", async () => {
    await request(app)
      .post("/api/v1/admin/messages/archive-test-submissions")
      .set("x-admin-key", mockAdminKey);

    const countChain = mockSupabase.select.mock.results[0].value as Chain;
    const predicate = countChain.or.mock.calls[0][0] as string;
    // All three test-email families must be present and OR-ed together (one
    // `.or()` call, not AND-chained ilikes).
    expect(predicate).toContain("email.ilike.e2e-%");
    expect(predicate).toContain("email.ilike.qa.verify.%");
    expect(predicate).toContain("email.ilike.test@test.com");
    expect(countChain.or).toHaveBeenCalledTimes(1);
    // The exact test@test.com address must appear as a value, not a pattern
    // with a wildcard (so test@test.com is matched, but nothing broader).
    expect(predicate).not.toContain("test@test.com%");
  });

  it("reports 0 when the count query finds nothing", async () => {
    mockSupabase.select.mockReturnValue({
      or: vi.fn().mockReturnThis(),
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
      or: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ count: null, error: { message: "boom" } }),
    });

    const res = await request(app)
      .post("/api/v1/admin/messages/archive-test-submissions")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("success", false);
  });
});
