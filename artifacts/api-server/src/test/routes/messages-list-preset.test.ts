/**
 * Regression tests for the messages list endpoint's `?preset=` saved views.
 *
 * Presets are compound filters the single `status` chip can't express:
 * `unread_today` (status + created_at >= UTC midnight), `needs_reply`
 * (read but never replied to), and `unread_or_archived` (a disjunction that
 * excludes read-and-visible rows). Each must translate to the exact Supabase
 * predicates server-side, and `preset` is mutually exclusive with `status`.
 *
 * Mirrors the status-filter test pattern: getSupabaseClient is pinned to one
 * stable chain so the calls this file asserts are what the route makes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key-list-preset";

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req, res, next) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey === mockAdminKey) {
      (req as Record<string, unknown>).adminEmail = "admin@test.com";
      // Superadmin so runCollectionQuery builds the query chain (without a
      // superadmin req.user it early-returns an empty page). No userId → no
      // user scope, so the assertions focus purely on the preset clauses.
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
  gte: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
  // Serves the bulk-unarchive route in the parity test below (the update
  // chain is the same object; awaiting it resolves the plain chain, whose
  // `error` is undefined → success).
  update: vi.fn().mockReturnThis(),
} as unknown as {
  select: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

const mockSupabase = {
  from: vi.fn().mockReturnValue(chain),
} as unknown as {
  from: ReturnType<typeof vi.fn>;
};

vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as never);

/** The same UTC-midnight boundary the route computes for `unread_today`. */
function startOfTodayISO(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockReturnValue(chain);
  chain.range.mockResolvedValue({ data: [], count: 0, error: null });
});

describe("GET /api/v1/admin/messages?preset=", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/admin/messages?preset=unread_today");
    expect(res.status).toBe(401);
  });

  it("unread_today filters to active unread messages created since UTC midnight", async () => {
    const res = await request(app)
      .get("/api/v1/admin/messages?preset=unread_today")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("status", "unread");
    expect(chain.gte).toHaveBeenCalledWith("created_at", startOfTodayISO());
    // Active rows only — archived ones are excluded.
    expect(chain.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("needs_reply filters to read messages that were never replied to", async () => {
    const res = await request(app)
      .get("/api/v1/admin/messages?preset=needs_reply")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("status", "read");
    expect(chain.is).toHaveBeenCalledWith("replied_at", null);
    expect(chain.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("unread_or_archived uses a disjunction and drops the soft-delete filter", async () => {
    const res = await request(app)
      .get("/api/v1/admin/messages?preset=unread_or_archived")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(200);
    // The whole view is one or() clause: unread (visible or not) OR any
    // soft-deleted row. A separate `deleted_at IS NULL` filter would AND
    // away the archived half — it must not appear.
    expect(chain.or).toHaveBeenCalledWith("status.eq.unread,deleted_at.not.is.null");
    expect(chain.is).not.toHaveBeenCalledWith("deleted_at", null);
    expect(chain.eq).not.toHaveBeenCalledWith("status", expect.anything());
  });

  it("rejects an unknown preset with 400", async () => {
    const res = await request(app)
      .get("/api/v1/admin/messages?preset=bogus")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.errors.preset).toEqual(
      expect.arrayContaining([expect.stringContaining("unread_today, unread_or_archived, needs_reply")]),
    );
  });

  it("rejects preset combined with status (mutually exclusive)", async () => {
    const res = await request(app)
      .get("/api/v1/admin/messages?status=unread&preset=unread_today")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(400);
    expect(res.body.errors.preset).toEqual(
      expect.arrayContaining([expect.stringContaining("cannot be combined")]),
    );
  });

  it("archived view and bulk-unarchive's archived filter share byte-identical predicates", async () => {
    // The Archived chip pages over exactly the rows bulk-unarchive's filter
    // restores. Both derive from viewSpec, but the predicate APPLICATION is
    // duplicated (runCollectionQuery's internal softDelete branch vs
    // applyViewSpec) — if one side drifts to a different column/operator,
    // the restore would touch a different set than the list shows. Pin both
    // calls to each other, byte for byte.
    const listRes = await request(app)
      .get("/api/v1/admin/messages?status=archived")
      .set("x-admin-key", mockAdminKey);
    expect(listRes.status).toBe(200);

    const restoreRes = await request(app)
      .post("/api/v1/admin/messages/bulk-unarchive")
      .set("x-admin-key", mockAdminKey)
      .send({ filter: { status: "archived" } });
    expect(restoreRes.status).toBe(200);

    // The exact same predicate, in the same order, from both routes.
    expect(chain.not.mock.calls).toEqual([
      ["deleted_at", "is", null],
      ["deleted_at", "is", null],
    ]);
    // Neither route adds a conflicting filter: no `deleted_at IS NULL`
    // (would AND away the archived set) and no status clause.
    expect(chain.is).not.toHaveBeenCalledWith("deleted_at", null);
    expect(chain.eq).not.toHaveBeenCalledWith("status", expect.anything());
    // And the restore clears exactly the field the view filters on.
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: null });
  });

  it("surfaces a Supabase error as a 500", async () => {
    chain.range.mockResolvedValue({ data: null, count: null, error: { message: "boom" } });
    const res = await request(app)
      .get("/api/v1/admin/messages?preset=needs_reply")
      .set("x-admin-key", mockAdminKey);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("success", false);
  });
});
