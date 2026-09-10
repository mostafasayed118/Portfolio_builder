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
  mini.use((req, _res, next) => {
    Object.assign(req, { user: { id: "user-1", email: "admin@test.com", role: "superadmin" } });
    next();
  });
  mini.get("/t", (req, res) => {
    void runCollectionQuery(req, res, "skills");
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
    return json(scenario.requester);
  }
  if (raw.includes("/rest/v1/image_metadata")) {
    if (method === "GET") {
      if (!scenario.image) return json({ code: "PGRST116", message: "zero rows" }, 406);
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
    user_id: owner,
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

  it("checks ownership inside the single metadata SELECT (no extra lookup)", async () => {
    fetchLog.length = 0;
    scenario.image = imageRow(OWNER_A);
    const res = await request(app).delete(`/api/v1/images/${IMAGE_ID}`).set("x-admin-key", API_KEY);
    expect(res.status).toBe(200);
    const selects = fetchLog.filter((e) => e.method === "GET" && e.url.includes("/rest/v1/image_metadata"));
    expect(selects).toHaveLength(1);
    expect(decodeURIComponent(selects[0].url)).toContain("user_id");
  });

  it("stamps user_id on upload", async () => {
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
    expect(inserts[0].bodyText).toContain(`"user_id":"${OWNER_A}"`);
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
