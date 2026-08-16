/**
 * Regression tests for POST /api/v1/admin/messages/mark-all-read.
 *
 * Mark All Read must be server-side: the list endpoint paginates at 50 rows,
 * so a client loop over the fetched page can never reach every unread message
 * once more than 50 exist. These tests pin that the route targets ALL unread
 * non-deleted rows (with the same user scope as the unread-count endpoint)
 * and reports how many were marked. Mirrors the archive-test-submissions test
 * pattern: getSupabaseClient is pinned to a stable client whose chains are
 * what the route actually runs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key-mark-all";
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

type Chain = {
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
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

/**
 * A thenable chain like the real PostgrestBuilder: every filter returns the
 * chain (so `.is().or()` chains work in any order) and awaiting the chain
 * resolves to the configured terminal result.
 */
function chain(terminal: Record<string, unknown>): Chain & PromiseLike<Record<string, unknown>> {
  const then = (onFulfilled: (v: Record<string, unknown>) => unknown) =>
    Promise.resolve(terminal).then(onFulfilled);
  // `self` is safe as const: the arrow closures only reference it lazily.
  const self: Chain & PromiseLike<Record<string, unknown>> = {
    eq: vi.fn(() => self),
    is: vi.fn(() => self),
    or: vi.fn(() => self),
    // The list endpoint paginates via `.range(offset, offset + limit - 1)`;
    // mark-all-read must never call it, or rows past page one go unmarked.
    range: vi.fn(() => self),
    then,
  };
  return self;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRole = "superadmin";
  mockSupabase.select.mockReturnValue(chain({ count: 3, error: null }));
  mockSupabase.update.mockReturnValue(chain({ error: null }));
  mockSupabase.from.mockReturnValue(mockSupabase);
});

describe("POST /api/v1/admin/messages/mark-all-read", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/v1/admin/messages/mark-all-read");
    expect(res.status).toBe(401);
  });

  it("marks ALL unread non-deleted rows (count + update share the predicate)", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/mark-all-read")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { marked: 3 } });

    // Count query: status='unread' AND deleted_at IS NULL — no user scope
    // for a superadmin.
    const countChain = mockSupabase.select.mock.results[0].value as Chain;
    expect(countChain.eq).toHaveBeenCalledWith("status", "unread");
    expect(countChain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(countChain.or).not.toHaveBeenCalled();

    // Update query: flips status to 'read' on the identical predicate.
    const updateChain = mockSupabase.update.mock.results[0].value as Chain;
    const patch = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(patch).toHaveProperty("status", "read");
    expect(updateChain.eq).toHaveBeenCalledWith("status", "unread");
    expect(updateChain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(updateChain.or).not.toHaveBeenCalled();
  });

  it("keeps the count and update predicates identical (no drift)", async () => {
    await request(app)
      .post("/api/v1/admin/messages/mark-all-read")
      .set("x-admin-key", mockAdminKey);

    const countChain = mockSupabase.select.mock.results[0].value as Chain;
    const updateChain = mockSupabase.update.mock.results[0].value as Chain;
    // The update must target the identical set it counted — same status and
    // soft-delete clauses, same user scope. Comparing the actual call args
    // to each other (not to hardcoded copies) catches any divergence.
    expect(updateChain.eq.mock.calls).toEqual(countChain.eq.mock.calls);
    expect(updateChain.is.mock.calls).toEqual(countChain.is.mock.calls);
    expect(updateChain.or.mock.calls).toEqual(countChain.or.mock.calls);
  });

  it("scopes to the admin's own rows (or unowned) for non-superadmins", async () => {
    mockRole = "admin";
    const res = await request(app)
      .post("/api/v1/admin/messages/mark-all-read")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    const countChain = mockSupabase.select.mock.results[0].value as Chain;
    const updateChain = mockSupabase.update.mock.results[0].value as Chain;
    expect(countChain.or).toHaveBeenCalledWith("user_id.eq.user-1,user_id.is.null");
    expect(updateChain.or).toHaveBeenCalledWith("user_id.eq.user-1,user_id.is.null");
  });

  it("marks ALL 120 unread rows across pages — no 50-row truncation", async () => {
    // Fixture: 120 unread rows — well past the list endpoint's 50-row page
    // cap. The bug this guards against is a client-side loop over the
    // fetched page (which can only ever see the first 50). The server-side
    // endpoint must count and update every row in single statements, with
    // no `.range()` on either query.
    mockSupabase.select.mockReturnValue(chain({ count: 120, error: null }));
    mockSupabase.update.mockReturnValue(chain({ error: null }));

    const res = await request(app)
      .post("/api/v1/admin/messages/mark-all-read")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { marked: 120 } });

    const countChain = mockSupabase.select.mock.results[0].value as Chain;
    const updateChain = mockSupabase.update.mock.results[0].value as Chain;

    // The count is an exact head-count over the whole table, not a fetched
    // row page — fetching rows (`.select("*")` + range) is exactly how
    // truncation sneaks back in.
    expect(mockSupabase.select).toHaveBeenCalledWith("id", { count: "exact", head: true });

    // Neither statement paginates: one update touches every matching row.
    expect(countChain.range).not.toHaveBeenCalled();
    expect(updateChain.range).not.toHaveBeenCalled();

    // The update still targets the same unread + not-soft-deleted predicate.
    expect(updateChain.eq).toHaveBeenCalledWith("status", "unread");
    expect(updateChain.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("reports 0 when there is nothing unread", async () => {
    mockSupabase.select.mockReturnValue(chain({ count: 0, error: null }));
    const res = await request(app)
      .post("/api/v1/admin/messages/mark-all-read")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { marked: 0 } });
  });

  it("surfaces a Supabase error as a 500", async () => {
    mockSupabase.select.mockReturnValue(
      chain({ count: null, error: { message: "boom" } }),
    );
    const res = await request(app)
      .post("/api/v1/admin/messages/mark-all-read")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("success", false);
  });
});
