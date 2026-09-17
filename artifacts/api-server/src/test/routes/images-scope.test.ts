/**
 * Task 4 — Images scoping + fail-closed userId.
 *
 * Covers (with no first-party vi.mock — the network boundary is stubbed
 * via fetch, and collection-query units need no mocks at all):
 *  1. `resolveTargetUserId` rejects filter-injection `userId` values.
 *  2. `runCollectionQuery` answers 400 (not a 200 with an injected filter)
 *     for a malicious `?userId=` value.
 *  3. Non-owner DELETE of an image returns 404 and performs no writes.
 *  4. Ownership is checked inside the single metadata SELECT (no N+1).
 *  5. Upload stamps `user_id`; legacy NULL-owner rows are fail-closed (404)
 *     for non-superadmins; superadmin bypass keeps working.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@workspace/supabase/types";
import {
  resolveTargetUserId,
  runCollectionQuery,
  InvalidTargetUserIdError,
} from "../../lib/route-helpers";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";

const INJECTION = "1),user_id.eq.x";
const EXACT_USERID_MESSAGE = "Invalid userId format — must be a valid UUID";
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

/** Plain literals satisfy the helper's narrow Pick<…, "user"> parameter. */
function authedReq(user: { id: string; email: string; role: string }): Pick<AuthenticatedRequest, "user"> {
  return { user };
}

describe("resolveTargetUserId fail-closed validation", () => {
  it("throws on filter-injection userId instead of passing it through", () => {
    const req = authedReq({ id: "user-1", email: "admin@test.com", role: "superadmin" });
    expect(() => resolveTargetUserId(req, INJECTION)).toThrow(InvalidTargetUserIdError);
  });

  it("passes a valid UUID through for superadmins", () => {
    const req = authedReq({ id: "user-1", email: "admin@test.com", role: "superadmin" });
    expect(resolveTargetUserId(req, VALID_UUID)).toBe(VALID_UUID);
  });

  it("ignores queryUserId for non-superadmins and returns their own id", () => {
    const req = authedReq({ id: "user-own", email: "a@test.com", role: "admin" });
    expect(resolveTargetUserId(req, VALID_UUID)).toBe("user-own");
  });
});

describe("runCollectionQuery rejects injection userId with 400", () => {
  const mini = express();
  mini.use(express.json());
  // theme_presets is the only collection that keeps ?userId= scoping
  // (tenanted tables are RLS-scoped and ignore it) — the fail-closed
  // machinery is pinned here.
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    returns: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
  };
  const stubSupabase = { from: vi.fn().mockReturnValue(chain) };
  mini.use((req, _res, next) => {
    Object.assign(req, {
      user: { id: "user-1", email: "admin@test.com", role: "superadmin" },
      supabase: stubSupabase,
    });
    next();
  });
  mini.get("/t", (req, res) => {
    void runCollectionQuery(req, res, "theme_presets");
  });

  it("returns 400 with the canonical userId error for filter injection", async () => {
    const res = await request(mini).get(`/t?userId=${encodeURIComponent(INJECTION)}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, errors: { userId: [EXACT_USERID_MESSAGE] } });
  });

  it("still allows a valid superadmin userId switch", async () => {
    const res = await request(mini).get(`/t?userId=${VALID_UUID}`);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// HTTP-level image scoping: real adminAuth (API key) + real Supabase client
// with fetch stubbed. Two fresh app instances so the default-admin cache
// holds a different requester per scenario.
// ---------------------------------------------------------------------------

interface Scenario {
  requester: { id: string; email: string; role: string };
  image: Record<string, string | number | null> | null;
}

interface FetchLogEntry {
  url: string;
  method: string;
  bodyText: string;
}

const scenario: Scenario = {
  requester: { id: "user-a", email: "a@test.com", role: "admin" },
  image: null,
};
const fetchLog: FetchLogEntry[] = [];

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function stubFetch(input: unknown, init?: { method?: string; body?: unknown }): Promise<Response> {
  const raw = input instanceof URL ? input.href : input instanceof Request ? input.url : String(input);
  const method = init?.method ?? "GET";
  const bodyText = typeof init?.body === "string" ? init.body : "";
  fetchLog.push({ url: raw, method, bodyText });

  if (raw.includes("/rest/v1/users")) {
    return json({ ...scenario.requester, clerk_id: "user_clerk_a" });
  }
  if (raw.includes("/rest/v1/portfolios")) {
    const url = new URL(raw);
    if (url.searchParams.has("owner_user_id")) {
      return json([{ id: OWNER_A }]);
    }
    return json({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" });
  }
  if (raw.includes("/rest/v1/image_metadata")) {
    if (method === "GET") {
      if (!scenario.image) return json({ code: "PGRST116", message: "zero rows" }, 406);
      if (new URL(raw).searchParams.get("id")?.startsWith("in.")) return json([scenario.image]);
      return json(scenario.image);
    }
    if (method === "POST") {
      return json({ id: "99999999-9999-4999-8999-999999999999" }, 201);
    }
    return json([]);
  }
  if (raw.includes("/storage/v1/")) {
    return json({});
  }
  return json([]);
}

const API_KEY = "scope-test-key-123";
const OWNER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OWNER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const IMAGE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function imageRow(owner: string | null): Record<string, string | number | null> {
  return {
    id: IMAGE_ID,
    storage_path: "projects/abc123/original.jpg",
    portfolio_id: owner,
  };
}

async function bootApp(): Promise<Express> {
  vi.resetModules();
  const [appMod, supabaseMod, envMod] = await Promise.all([
    import("../../app"),
    import("../../lib/supabase-client"),
    import("../../lib/env"),
  ]);
  vi.mocked(supabaseMod.getSupabaseClient).mockReturnValue(
    createClient<Database>(envMod.env.SUPABASE_URL, envMod.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  );
  return appMod.default;
}

describe("DELETE /api/v1/images/:id scoping (non-superadmin)", () => {
  let app: Express;

  beforeAll(async () => {
    vi.stubEnv("ADMIN_API_KEY", API_KEY);
    vi.stubGlobal("fetch", stubFetch);
    scenario.requester = { id: OWNER_A, email: "a@test.com", role: "admin" };
    app = await bootApp();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns 404 for an image owned by another user and performs no writes", async () => {
    fetchLog.length = 0;
    scenario.image = imageRow(OWNER_B);
    const res = await request(app).delete(`/api/v1/images/${IMAGE_ID}`).set("x-admin-key", API_KEY);
    expect(res.status).toBe(404);
    expect(fetchLog.some((e) => e.url.includes("/storage/v1/"))).toBe(false);
    expect(fetchLog.some((e) => e.method === "DELETE" && e.url.includes("image_metadata"))).toBe(false);
  });

  it("returns 404 for a legacy NULL-owner row (fail-closed)", async () => {
    scenario.image = imageRow(null);
    const res = await request(app).delete(`/api/v1/images/${IMAGE_ID}`).set("x-admin-key", API_KEY);
    expect(res.status).toBe(404);
  });

  it("checks the selected portfolio against the requester before deleting", async () => {
    fetchLog.length = 0;
    scenario.image = imageRow(OWNER_A);
    const res = await request(app).delete(`/api/v1/images/${IMAGE_ID}`).set("x-admin-key", API_KEY);
    expect(res.status).toBe(200);
    const selects = fetchLog.filter((e) => e.method === "GET" && e.url.includes("/rest/v1/image_metadata"));
    expect(selects).toHaveLength(1);
    expect(new URL(selects[0].url).searchParams.get("select")).toBe("storage_path,id,portfolio_id");
    const ownership = fetchLog.find((entry) => new URL(entry.url).searchParams.has("owner_user_id"));
    expect(ownership).toBeDefined();
    if (!ownership) throw new Error("Missing portfolio ownership query");
    expect(new URL(ownership.url).searchParams.get("owner_user_id")).toBe("eq.user_clerk_a");
    expect(fetchLog.some((entry) => entry.method === "DELETE" && entry.url.includes("image_metadata"))).toBe(true);
  });

  it.each([
    { portfolio: OWNER_A, status: 200 },
    { portfolio: OWNER_B, status: 404 },
    { portfolio: null, status: 404 },
  ])("reorders only owned portfolio images: $status / $portfolio", async ({ portfolio, status }) => {
    fetchLog.length = 0;
    scenario.image = imageRow(portfolio);
    const res = await request(app).post("/api/v1/images/reorder")
      .set("x-admin-key", API_KEY).send({ ordered_ids: [IMAGE_ID] });
    expect(res.status).toBe(status);
    const writes = fetchLog.filter((entry) => entry.method === "PATCH");
    if (status === 200) {
      expect(writes).toHaveLength(1);
      expect(JSON.parse(writes[0].bodyText)).toEqual({ sort_order: 0 });
      expect(new URL(writes[0].url).searchParams.get("id")).toBe(`eq.${IMAGE_ID}`);
    } else {
      expect(writes).toEqual([]);
    }
  });

  it("stamps portfolio_id without the retired user_id on upload", async () => {
    fetchLog.length = 0;
    const res = await request(app)
      .post("/api/v1/images/upload")
      .set("x-admin-key", API_KEY)
      .field("entityType", "projects")
      .attach("file", Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {
        filename: "photo.jpg",
        contentType: "image/jpeg",
      });
    expect(res.status).toBe(200);
    const inserts = fetchLog.filter((e) => e.method === "POST" && e.url.includes("/rest/v1/image_metadata"));
    expect(inserts).toHaveLength(1);
    expect(JSON.parse(inserts[0].bodyText)).not.toHaveProperty("user_id");
    // Tenant stamping: metadata carries portfolio_id and the storage object
    // lives under <portfolioId>/…
    expect(inserts[0].bodyText).toContain(`"portfolio_id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd"`);
    const uploads = fetchLog.filter(
      (e) => e.method === "POST" && e.url.includes("/storage/v1/object/project_images/"),
    );
    expect(uploads).toHaveLength(1);
    expect(decodeURIComponent(uploads[0].url)).toContain("dddddddd-dddd-4ddd-8ddd-dddddddddddd/projects/");
  });
});

describe("DELETE /api/v1/images/:id superadmin bypass", () => {
  let app: Express;

  beforeAll(async () => {
    vi.stubEnv("ADMIN_API_KEY", API_KEY);
    vi.stubGlobal("fetch", stubFetch);
    scenario.requester = { id: "super-1", email: "super@test.com", role: "superadmin" };
    app = await bootApp();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("allows a superadmin to delete another user's image", async () => {
    scenario.image = imageRow(OWNER_B);
    const res = await request(app).delete(`/api/v1/images/${IMAGE_ID}`).set("x-admin-key", API_KEY);
    expect(res.status).toBe(200);
  });
});
