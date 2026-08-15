/**
 * Regression tests for the messages list endpoint's server-side `?status=`
 * filter.
 *
 * The admin UI pages through the collection endpoint, so once more than the
 * page size of messages exists, a client-side filter over a single fetched
 * page silently truncates the set. These tests pin the endpoint to apply the
 * filter itself: `unread`/`read` restrict the status column (still excluding
 * soft-deleted rows), `archived` inverts the soft-delete (deleted_at NOT
 * NULL), and an unknown value is rejected with 400.
 *
 * Mirrors the unread-count test pattern: getSupabaseClient is pinned to one
 * stable chain so the calls this file asserts are what the route actually
 * makes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key-list-filter";

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req, res, next) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey === mockAdminKey) {
      (req as Record<string, unknown>).adminEmail = "admin@test.com";
      // Superadmin so runCollectionQuery builds the query chain (without a
      // superadmin req.user it early-returns an empty page and never touches
      // the client). No userId → no user scope, so the assertions focus purely
      // on the status/soft-delete clauses.
      (req as Record<string, unknown>).user = { id: "user-1", email: "admin@test.com", role: "superadmin" };
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

import { getSupabaseClient } from "../../lib/supabase-client";

const chain = {
  select: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
} as unknown as {
  select: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
};

const mockSupabase = {
  from: vi.fn().mockReturnValue(chain),
} as unknown as {
  from: ReturnType<typeof vi.fn>;
};

vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as never);

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockReturnValue(chain);
  chain.range.mockResolvedValue({ data: [], count: 0, error: null });
});

describe("GET /api/v1/admin/messages?status=", () => {

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/admin/messages?status=unread");
    expect(res.status).toBe(401);
  });

  it("filters to status='unread' server-side when ?status=unread", async () => {
    const res = await request(app)
      .get("/api/v1/admin/messages?status=unread")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("status", "unread");
    // Soft-deleted rows stay excluded — the unread set is active rows only.
    expect(chain.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("filters to status='read' server-side when ?status=read", async () => {
    const res = await request(app)
      .get("/api/v1/admin/messages?status=read")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("status", "read");
    expect(chain.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("pages over soft-deleted rows when ?status=archived", async () => {
    const res = await request(app)
      .get("/api/v1/admin/messages?status=archived")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    // Archived inverts the soft-delete filter instead of filtering status.
    expect(chain.not).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(chain.eq).not.toHaveBeenCalledWith("status", "archived");
  });

  it("keeps the default view when ?status=all", async () => {
    const res = await request(app)
      .get("/api/v1/admin/messages?status=all")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(chain.eq).not.toHaveBeenCalledWith("status", "all");
    expect(chain.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("keeps the default view when status is omitted", async () => {
    const res = await request(app)
      .get("/api/v1/admin/messages")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    // No status → no status equality clause (user scope may still use `.eq`
    // on other columns, so assert the specific non-call).
    expect(chain.eq).not.toHaveBeenCalledWith("status", expect.anything());
    expect(chain.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("rejects an unknown status with 400", async () => {
    const res = await request(app)
      .get("/api/v1/admin/messages?status=bogus")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.errors.status).toEqual(
      expect.arrayContaining([expect.stringContaining("unread, read, archived, all")]),
    );
  });

  it("surfaces a Supabase error as a 500", async () => {
    chain.range.mockResolvedValue({ data: null, count: null, error: { message: "boom" } });
    const res = await request(app)
      .get("/api/v1/admin/messages?status=unread")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("success", false);
  });
});
