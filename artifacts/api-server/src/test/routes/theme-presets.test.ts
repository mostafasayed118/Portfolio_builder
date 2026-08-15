import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key";

// ---------------------------------------------------------------------------
// In-memory theme_presets store + chainable fake Supabase client, so the
// duplicate-name and overwrite flows can be asserted deterministically.
//
// The global test setup mocks lib/supabase-client with a dumb chain (no `is`,
// so GET 500s). This file overrides that mock with a stateful fake.
// The fake lives in vi.hoisted: vi.mock factories are hoisted above module
// evaluation, so any outer variable they reference must be created there
// (or prefixed with `mock`) or the mock silently never applies.
// ---------------------------------------------------------------------------
interface PresetRow {
  id: string;
  name: string;
  description: string;
  palette: unknown;
  user_id: string | null;
  deleted_at: string | null;
}

const { state, makeClient } = vi.hoisted(() => {
  const state: { store: PresetRow[]; nextId: number } = { store: [], nextId: 1 };

  /** Deterministic valid-UUID ids (validateParamId rejects non-UUID ids). */
  const uuid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

  const makeClient = () => ({
    from: (_table: string) => {
      const filters: Array<(rows: PresetRow[]) => PresetRow[]> = [];
      let action: "select" | "insert" | "update" = "select";
      let patch: Record<string, unknown> | null = null;
      let selectCols: string | null = null;
      let order: [string, boolean] | null = null;

      const compute = () => {
        let rows = filters.reduce((acc, f) => f(acc), [...state.store]);
        if (order) {
          const [col, asc] = order;
          rows = [...rows].sort((a, b) => {
            const av = (a as Record<string, unknown>)[col] as string;
            const bv = (b as Record<string, unknown>)[col] as string;
            return (av < bv ? -1 : av > bv ? 1 : 0) * (asc ? 1 : -1);
          });
        }
        if (action === "insert") {
          state.store.push({
            id: uuid(state.nextId++),
            deleted_at: null,
            user_id: null,
            description: "",
            palette: null,
            ...(patch ?? {}),
          });
          return { data: null, count: null, error: null };
        }
        if (action === "update") {
          const count = rows.length;
          for (const row of rows) Object.assign(row, patch);
          return { data: rows, count, error: null };
        }
        if (selectCols === "id, name") {
          return { data: rows.map((r) => ({ id: r.id, name: r.name })), error: null };
        }
        return { data: rows, count: rows.length, error: null };
      };

      const q: Record<string, unknown> = {};
      Object.assign(q, {
        select: (cols?: string) => { selectCols = (cols as string) ?? null; return q; },
        insert: (row: Record<string, unknown>) => { action = "insert"; patch = { ...row }; return q; },
        update: (p: Record<string, unknown>) => { action = "update"; patch = p; return q; },
        eq: (col: string, val: unknown) => {
          filters.push((rows) => rows.filter((r) => (r as Record<string, unknown>)[col] === val));
          return q;
        },
        is: (col: string, val: unknown) => {
          filters.push((rows) =>
            rows.filter((r) =>
              val === null
                ? (r as Record<string, unknown>)[col] == null
                : (r as Record<string, unknown>)[col] === val,
            ),
          );
          return q;
        },
        order: (col: string, opts?: { ascending?: boolean }) => {
          order = [col, opts?.ascending ?? true];
          return q;
        },
        range: () => q,
        limit: () => q,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(compute()).then(resolve, reject),
      });
      return q;
    },
  });

  return { state, makeClient };
});

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => makeClient()),
}));

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req, res, next) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey === mockAdminKey) {
      (req as Record<string, unknown>).adminEmail = "admin@test.com";
      (req as Record<string, unknown>).user = { id: "user-1", role: "superadmin" };
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

const VALID_PALETTE = {
  mode: "light",
  lightPrimary: "204 92% 42%", lightAccent: "189 90% 38%", lightBackground: "220 30% 97%",
  lightForeground: "222 40% 10%", lightCard: "0 0% 100%", lightBorder: "220 18% 84%",
  lightMuted: "220 20% 91%", lightMutedForeground: "220 15% 42%", lightRing: "204 92% 45%",
  darkPrimary: "204 92% 62%", darkAccent: "189 95% 53%", darkBackground: "222 48% 6%",
  darkForeground: "210 30% 96%", darkCard: "222 40% 9%", darkBorder: "220 22% 18%",
  darkMuted: "222 32% 12%", darkMutedForeground: "215 18% 72%", darkRing: "204 92% 62%",
  radius: "0.9rem",
};

function existingRow(name: string, overrides: Partial<PresetRow> = {}): PresetRow {
  return {
    id: `00000000-0000-0000-0000-${String(state.nextId++).padStart(12, "0")}`,
    name,
    description: "Saved earlier",
    palette: VALID_PALETTE,
    user_id: "user-1",
    deleted_at: null,
    ...overrides,
  };
}

describe("Theme Presets API", () => {
  beforeEach(() => {
    state.store = [];
    state.nextId = 1;
  });

  describe("GET /api/v1/admin/theme-presets", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/theme-presets");
      expect(res.status).toBe(401);
    });

    it("returns 200 with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/theme-presets")
        .set("x-admin-key", mockAdminKey);
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/v1/admin/theme-presets", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/admin/theme-presets")
        .send({ name: "My Teal", palette: VALID_PALETTE });
      expect(res.status).toBe(401);
    });

    it("rejects a missing name", async () => {
      const res = await request(app)
        .post("/api/v1/admin/theme-presets")
        .set("x-admin-key", mockAdminKey)
        .send({ palette: VALID_PALETTE });
      expect(res.status).toBe(400);
    });

    it("rejects an incomplete palette", async () => {
      const res = await request(app)
        .post("/api/v1/admin/theme-presets")
        .set("x-admin-key", mockAdminKey)
        .send({ name: "Broken", palette: { mode: "light", radius: "0.5rem" } });
      expect(res.status).toBe(400);
    });

    it("creates a template and returns 201", async () => {
      const res = await request(app)
        .post("/api/v1/admin/theme-presets")
        .set("x-admin-key", mockAdminKey)
        .send({ name: "My Teal", description: "Saved palette", palette: VALID_PALETTE });
      expect(res.status).toBe(201);
      expect(state.store).toHaveLength(1);
    });

    it("allows a second template with a different name", async () => {
      state.store = [existingRow("My Teal")];
      const res = await request(app)
        .post("/api/v1/admin/theme-presets")
        .set("x-admin-key", mockAdminKey)
        .send({ name: "Fresh Name", palette: VALID_PALETTE });
      expect(res.status).toBe(201);
      expect(state.store).toHaveLength(2);
    });
  });

  describe("duplicate-name handling", () => {
    it("returns 409 with the existing id instead of stacking a duplicate", async () => {
      state.store = [existingRow("My Teal")];
      const res = await request(app)
        .post("/api/v1/admin/theme-presets")
        .set("x-admin-key", mockAdminKey)
        .send({ name: "My Teal", palette: VALID_PALETTE });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("DUPLICATE_NAME");
      expect(res.body.existingId).toBe(state.store[0].id);
      expect(state.store).toHaveLength(1); // no second row stacked
    });

    it("matches names case-insensitively", async () => {
      state.store = [existingRow("my teal")];
      const res = await request(app)
        .post("/api/v1/admin/theme-presets")
        .set("x-admin-key", mockAdminKey)
        .send({ name: "MY TEAL", palette: VALID_PALETTE });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("DUPLICATE_NAME");
    });

    it("ignores soft-deleted templates with the same name", async () => {
      state.store = [existingRow("My Teal", { deleted_at: "2026-08-01T00:00:00Z" })];
      const res = await request(app)
        .post("/api/v1/admin/theme-presets")
        .set("x-admin-key", mockAdminKey)
        .send({ name: "My Teal", palette: VALID_PALETTE });
      expect(res.status).toBe(201);
      expect(state.store).toHaveLength(2);
    });
  });

  describe("PUT /api/v1/admin/theme-presets/:id", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/v1/admin/theme-presets/00000000-0000-0000-0000-000000000001")
        .send({ name: "Renamed" });
      expect(res.status).toBe(401);
    });

    it("updates a template and returns 200", async () => {
      const row = existingRow("My Teal");
      state.store = [row];
      const res = await request(app)
        .put(`/api/v1/admin/theme-presets/${row.id}`)
        .set("x-admin-key", mockAdminKey)
        .send({ description: "Overwritten", palette: VALID_PALETTE });
      expect(res.status).toBe(200);
      expect(state.store[0].description).toBe("Overwritten");
    });

    it("returns 404 for a missing template", async () => {
      const res = await request(app)
        .put("/api/v1/admin/theme-presets/00000000-0000-0000-0000-000000000099")
        .set("x-admin-key", mockAdminKey)
        .send({ description: "Nope" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/admin/theme-presets/:id", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).delete("/api/v1/admin/theme-presets/00000000-0000-0000-0000-000000000001");
      expect(res.status).toBe(401);
    });

    it("soft-deletes a template and returns 200", async () => {
      const row = existingRow("My Teal");
      state.store = [row];
      const res = await request(app)
        .delete(`/api/v1/admin/theme-presets/${row.id}`)
        .set("x-admin-key", mockAdminKey);
      expect(res.status).toBe(200);
      expect(state.store[0].deleted_at).not.toBeNull();
    });
  });
});
