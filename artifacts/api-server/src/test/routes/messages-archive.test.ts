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
  in: vi.fn().mockResolvedValue({ error: null }),
} as unknown as {
  from: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
};

vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as never);

const UUID = "11111111-1111-1111-1111-111111111111";

/**
 * A thenable filter chain for the filter-based bulk-archive path: every
 * predicate returns the chain (so `.is().eq()` chains in any order) and
 * awaiting the chain resolves the success terminal — matching the real
 * PostgrestBuilder, where the last filter method carries the result.
 */
function bulkFilterChain(): Record<string, unknown> & PromiseLike<Record<string, unknown>> {
  const then = (onFulfilled: (v: Record<string, unknown>) => unknown) =>
    Promise.resolve({ error: null }).then(onFulfilled);
  const self: Record<string, unknown> & PromiseLike<Record<string, unknown>> = {
    eq: vi.fn(() => self),
    is: vi.fn(() => self),
    not: vi.fn(() => self),
    or: vi.fn(() => self),
    gte: vi.fn(() => self),
    in: vi.fn(() => self),
    select: vi.fn(() => self),
    range: vi.fn(() => self),
    then,
  };
  return self;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: a successful update — the row matched and was returned. The
  // chain serves both terminal patterns: `.eq().select()` for the per-row
  // archive/unarchive routes and `.in()` for the bulk-archive route. The
  // `range` spy exists so the no-truncation guard can assert bulk cleanup
  // never paginates (a reintroduced `.range()` would silently cap it).
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockResolvedValue({ data: [{ id: UUID }], count: null, error: null }),
    range: vi.fn().mockReturnThis(),
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

describe("POST /api/v1/admin/messages/bulk-archive", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-archive")
      .send({ ids: [UUID] });
    expect(res.status).toBe(401);
  });

  it("sets deleted_at on every id in the batch", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-archive")
      .set("x-admin-key", mockAdminKey)
      .send({ ids: [UUID, "22222222-2222-2222-2222-222222222222"] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    const patch = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(patch.deleted_at).toEqual(expect.any(String));
    // `.in()` runs on the chain returned by `update`; it must carry all
    // batch ids — no partial archiving.
    const chain = mockSupabase.update.mock.results[0].value as { in: ReturnType<typeof vi.fn> };
    expect(chain.in).toHaveBeenCalledWith("id", [
      UUID,
      "22222222-2222-2222-2222-222222222222",
    ]);
  });

  it("archives every batch id in ONE statement — no range() page cap", async () => {
    // A deliberately large batch: if a future change sliced the ids into
    // 50-row pages (or fetched-then-loop), rows past the cap would be left
    // unarchived and the response would silently claim success.
    const ids = Array.from({ length: 120 }, (_, i) =>
      `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    );

    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-archive")
      .set("x-admin-key", mockAdminKey)
      .send({ ids });

    expect(res.status).toBe(200);
    const chain = mockSupabase.update.mock.results[0].value as {
      in: ReturnType<typeof vi.fn>;
      range: ReturnType<typeof vi.fn>;
    };
    // All 120 ids in a single `.in()` — exactly one statement, no partial set.
    expect(chain.in).toHaveBeenCalledTimes(1);
    expect(chain.in).toHaveBeenCalledWith("id", ids);
    // No pagination on the update chain — a reintroduced `.range(0, 49)`
    // would cap the batch at the first page and fail this guard.
    expect(chain.range).not.toHaveBeenCalled();
  });

  it("rejects an empty ids array", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-archive")
      .set("x-admin-key", mockAdminKey)
      .send({ ids: [] });

    expect(res.status).toBe(400);
  });

  it("rejects non-uuid ids", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-archive")
      .set("x-admin-key", mockAdminKey)
      .send({ ids: ["nope"] });

    expect(res.status).toBe(400);
  });

  it("rejects ids combined with a filter", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-archive")
      .set("x-admin-key", mockAdminKey)
      .send({ ids: [UUID], filter: { status: "unread" } });

    expect(res.status).toBe(400);
  });

  it("rejects a body with neither ids nor a filter", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-archive")
      .set("x-admin-key", mockAdminKey)
      .send({});

    expect(res.status).toBe(400);
  });

  it("surfaces a Supabase error as a 500", async () => {
    mockSupabase.update.mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: { message: "boom" } }),
    });
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-archive")
      .set("x-admin-key", mockAdminKey)
      .send({ ids: [UUID] });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("success", false);
  });

  it("archives every row matching a status filter in one statement", async () => {
    const chain = bulkFilterChain();
    mockSupabase.update.mockReturnValue(chain as never);

    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-archive")
      .set("x-admin-key", mockAdminKey)
      .send({ filter: { status: "unread" } });

    expect(res.status).toBe(200);
    // The SAME view predicates the list endpoint applies — active unread rows
    // only — and NO id-list `.in()`: one statement over the whole set.
    const f = chain as unknown as {
      is: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      in: ReturnType<typeof vi.fn>;
    };
    expect(f.is).toHaveBeenCalledWith("deleted_at", null);
    expect(f.eq).toHaveBeenCalledWith("status", "unread");
    expect(f.in).not.toHaveBeenCalled();
  });

  it("archives every row matching the unread_today preset", async () => {
    const chain = bulkFilterChain();
    mockSupabase.update.mockReturnValue(chain as never);

    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-archive")
      .set("x-admin-key", mockAdminKey)
      .send({ filter: { preset: "unread_today" } });

    expect(res.status).toBe(200);
    const f = chain as unknown as {
      eq: ReturnType<typeof vi.fn>;
      gte: ReturnType<typeof vi.fn>;
      is: ReturnType<typeof vi.fn>;
    };
    expect(f.eq).toHaveBeenCalledWith("status", "unread");
    expect(f.gte).toHaveBeenCalledWith("created_at", expect.stringMatching(/^\d{4}-\d{2}-\d{2}T00:00:00.000Z$/));
    expect(f.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("archives every unread-or-archived row via the shared or() disjunction", async () => {
    const chain = bulkFilterChain();
    mockSupabase.update.mockReturnValue(chain as never);

    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-archive")
      .set("x-admin-key", mockAdminKey)
      .send({ filter: { preset: "unread_or_archived" } });

    expect(res.status).toBe(200);
    const f = chain as unknown as {
      or: ReturnType<typeof vi.fn>;
      is: ReturnType<typeof vi.fn>;
    };
    expect(f.or).toHaveBeenCalledWith("status.eq.unread,deleted_at.not.is.null");
    // No soft-delete filter — the disjunction already covers deleted rows.
    expect(f.is).not.toHaveBeenCalledWith("deleted_at", null);
  });

  it("archives the archived set via the inverted soft-delete filter", async () => {
    const chain = bulkFilterChain();
    mockSupabase.update.mockReturnValue(chain as never);

    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-archive")
      .set("x-admin-key", mockAdminKey)
      .send({ filter: { status: "archived" } });

    expect(res.status).toBe(200);
    const f = chain as unknown as {
      not: ReturnType<typeof vi.fn>;
    };
    expect(f.not).toHaveBeenCalledWith("deleted_at", "is", null);
  });
});

describe("POST /api/v1/admin/messages/bulk-unarchive", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-unarchive")
      .send({ ids: [UUID] });
    expect(res.status).toBe(401);
  });

  it("clears deleted_at back to null on every id in the batch", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-unarchive")
      .set("x-admin-key", mockAdminKey)
      .send({ ids: [UUID, "22222222-2222-2222-2222-222222222222"] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    const patch = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(patch).toHaveProperty("deleted_at", null);
    // `.in()` runs on the chain returned by `update`; it must carry all
    // batch ids — no partial restore.
    const chain = mockSupabase.update.mock.results[0].value as { in: ReturnType<typeof vi.fn> };
    expect(chain.in).toHaveBeenCalledWith("id", [
      UUID,
      "22222222-2222-2222-2222-222222222222",
    ]);
  });

  it("rejects an empty ids array", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-unarchive")
      .set("x-admin-key", mockAdminKey)
      .send({ ids: [] });

    expect(res.status).toBe(400);
  });

  it("rejects non-uuid ids", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-unarchive")
      .set("x-admin-key", mockAdminKey)
      .send({ ids: ["nope"] });

    expect(res.status).toBe(400);
  });

  it("rejects ids combined with a filter", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-unarchive")
      .set("x-admin-key", mockAdminKey)
      .send({ ids: [UUID], filter: { status: "archived" } });

    expect(res.status).toBe(400);
  });

  it("rejects a body with neither ids nor a filter", async () => {
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-unarchive")
      .set("x-admin-key", mockAdminKey)
      .send({});

    expect(res.status).toBe(400);
  });

  it("restores every archived row via the status filter in one statement", async () => {
    const chain = bulkFilterChain();
    mockSupabase.update.mockReturnValue(chain as never);

    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-unarchive")
      .set("x-admin-key", mockAdminKey)
      .send({ filter: { status: "archived" } });

    expect(res.status).toBe(200);
    // The SAME inverted soft-delete predicate the list endpoint applies for
    // the Archived view — and NO id-list `.in()`: one statement over the
    // whole archived set, so "restore all matching" scales past thousands.
    const patch = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(patch).toHaveProperty("deleted_at", null);
    const f = chain as unknown as {
      not: ReturnType<typeof vi.fn>;
      in: ReturnType<typeof vi.fn>;
    };
    expect(f.not).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(f.in).not.toHaveBeenCalled();
  });

  it("restores rows matching a preset via the shared view predicates", async () => {
    const chain = bulkFilterChain();
    mockSupabase.update.mockReturnValue(chain as never);

    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-unarchive")
      .set("x-admin-key", mockAdminKey)
      .send({ filter: { preset: "unread_today" } });

    expect(res.status).toBe(200);
    const f = chain as unknown as {
      eq: ReturnType<typeof vi.fn>;
      gte: ReturnType<typeof vi.fn>;
      is: ReturnType<typeof vi.fn>;
    };
    expect(f.eq).toHaveBeenCalledWith("status", "unread");
    expect(f.gte).toHaveBeenCalledWith("created_at", expect.stringMatching(/^\d{4}-\d{2}-\d{2}T00:00:00.000Z$/));
    expect(f.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("surfaces a Supabase error as a 500", async () => {
    mockSupabase.update.mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: { message: "boom" } }),
    });
    const res = await request(app)
      .post("/api/v1/admin/messages/bulk-unarchive")
      .set("x-admin-key", mockAdminKey)
      .send({ ids: [UUID] });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("success", false);
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
