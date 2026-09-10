/**
 * Regression tests for the admin Messages unread-count endpoint.
 *
 * The sidebar badge and the Messages page both render this count, so it must
 * stay pinned to exactly the rows the API counts: status='unread' AND
 * deleted_at IS NULL. If the filter ever regresses (e.g. counting all rows,
 * or forgetting the soft-delete exclusion), these tests fail.
 *
 * Mirrors the collection-404 test pattern: the module-level Supabase mock
 * returns a chainable client, and getSupabaseClient is pinned to one stable
 * instance so the chain this file configures is what the route actually runs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key-unread";

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req, res, next) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey === mockAdminKey) {
      (req as Record<string, unknown>).adminEmail = "admin@test.com";
      // No req.user → targetUserId stays undefined and the route applies NO
      // user scope, so the assertions focus purely on the status/deleted
      // filters (the `.or()` scope branch is not exercised here).
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

// Pin getSupabaseClient (mocked by setup.ts to hand out a fresh client per
// call) to one stable, fully-controlled client. The route's unread-count
// chain is from().select().eq("status","unread").is("deleted_at",null) —
// `is` is the terminal here, resolving to the count the route surfaces.
import { getSupabaseClient } from "../../lib/supabase-client";
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockResolvedValue({ count: 5, error: null }),
  or: vi.fn().mockReturnThis(),
} as unknown as {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
};

vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as never);

beforeEach(() => {
  vi.clearAllMocks();
  // Default: a resolving count-only terminal (head query) so the route's
  // `const { count, error } = await query` receives a real count.
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase.is.mockResolvedValue({ count: 5, error: null });
});

describe("GET /api/v1/admin/messages/unread-count", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/admin/messages/unread-count");
    expect(res.status).toBe(401);
  });

  it("counts only status='unread' rows", async () => {
    const res = await request(app)
      .get("/api/v1/admin/messages/unread-count")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: 5 });
    // The status filter must be applied to the query — without it the count
    // would include read/archived messages.
    expect(mockSupabase.eq).toHaveBeenCalledWith("status", "unread");
  });

  it("excludes soft-deleted rows", async () => {
    await request(app)
      .get("/api/v1/admin/messages/unread-count")
      .set("x-admin-key", mockAdminKey);

    // Soft-deleted messages must not inflate the count.
    expect(mockSupabase.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("surfaces the count from the query as-is (no client-side math)", async () => {
    mockSupabase.is.mockResolvedValue({ count: 42, error: null });
    const res = await request(app)
      .get("/api/v1/admin/messages/unread-count")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: 42 });
  });

  it("returns 0 instead of erroring when the count is null", async () => {
    mockSupabase.is.mockResolvedValue({ count: null, error: null });
    const res = await request(app)
      .get("/api/v1/admin/messages/unread-count")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: 0 });
  });
});
