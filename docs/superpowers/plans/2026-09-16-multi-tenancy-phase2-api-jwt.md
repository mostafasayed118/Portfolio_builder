# Multi-Tenancy Phase 2 — API Migration to JWT-Scoped Clients

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the service-role key from all request paths in api-server and switch CMS traffic to per-request JWT-scoped Supabase clients (anon key + verified Clerk JWT), so Postgres RLS (Phase 1, migrations 064–067) becomes the real authorization boundary.

**Architecture:** `adminAuth` already verifies the Clerk JWT; it will additionally keep the raw token on the request. A request-scoped client factory (`getRequestSupabaseClient(token)`) builds an anon-key client whose `accessToken` hook returns the caller's Clerk JWT, so RLS evaluates `auth.jwt()->>'sub'` per request. Row ownership previously enforced by app-layer `user_id` scoping moves to RLS; the `user_id` columns, `admin_all_*` policies, and the `is_admin()` GUC fallback are dropped. Public-write routes (contact, analytics) use a plain anon client guarded by the 066 public-insert policies.

**Tech Stack:** Express + @clerk/backend, @supabase/supabase-js v2 (`accessToken` hook), Supabase local CLI 2.109.1, Vitest, pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-09-16-multi-tenancy-design.md` (§6 auth integration, §8 routing/API surface, §10 error handling, §13.2). Phase 1 plan: `docs/superpowers/plans/2026-09-16-multi-tenancy-phase1-schema-rls.md` (completed, merged).

## Global Constraints

- House rules: files ≤ 250 lines; no `any`, no `as` type assertions, no non-null assertions in new code; `catch (err: unknown)`; lint is `--max-warnings=0`.
- API envelope: `{ success: true, data }` / `{ success: false, message, errors }`; errors via `lib/api-response.ts` helpers.
- DB access via `@workspace/db` (`lib/db`) modules — they take `SupabaseClient` as first argument and never create clients.
- Migrations are idempotent, replayable via `supabase db reset` (runs as `postgres`; keep the 064 grant-parity pattern for any new table/function grants).
- Verification loop for DB-touching work: repo root `supabase db reset`, then from `lib\db`: `pnpm vitest run src/rls-multitenant.test.ts`. Full suite on Windows: `pnpm vitest run --no-file-parallelism` (tinypool IPC crash otherwise).
- **Local port conflict:** the Portfolio-Fixer and rosette Supabase stacks share ports 54321–54324. Before any local Supabase work, stop the other stack (`docker ps --format "{{.Names}}"`, stop `supabase_*_rosette` containers) and start Docker Desktop if needed. Restore the rosette stack when done.
- Service-role (`getSupabaseClient()`) is permitted ONLY in: `routes/admin/users.ts`, `routes/admin/arabic-status.ts`, `routes/admin/audit.ts`, `lib/ai/*` (spam scoring + site context), the contact-ingestion pipeline (AI spam + quarantine), and the `x-admin-key` auth path (system scripts). Every other consumer migrates to `req.supabase`.
- Tenant isolation fact from Phase 1: published rows are readable by anyone via public-read policies; only DRAFT content proves isolation. RLS denials surface as PostgREST error code `42501`.

---

### Task 1: Clerk third-party auth config, env, and the JWT client factory

**Files:**

- Modify: `supabase/config.toml:357-361` (`[auth.third_party.clerk]` block)
- Modify: `artifacts/api-server/src/lib/env.ts` (lines 156-158, 241)
- Modify: `artifacts/api-server/src/lib/supabase-client.ts`
- Modify: `artifacts/api-server/src/middleware/adminAuth.ts` (lines 20-23, 156-169)
- Test: `artifacts/api-server/src/test/supabase-client.test.ts` (create)

**Interfaces:**

- Produces: `getRequestSupabaseClient(token?: string): SupabaseClient<Database>` and `getAnonSupabaseClient(): SupabaseClient<Database>` from `lib/supabase-client.ts`; `env.SUPABASE_ANON_KEY` becomes required; `AuthenticatedRequest.clerkToken?: string` (raw Bearer JWT, set by `adminAuth`).
- Consumes: existing `env.SUPABASE_URL`, `env.SUPABASE_SERVICE_ROLE_KEY` (unchanged — system routes keep using them).

- [ ] **Step 1: Write the failing factory test**

Create `artifacts/api-server/src/test/supabase-client.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const createClientMock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));
// test/setup.ts installs a GLOBAL mock of ../lib/supabase-client — bypass it so
// these tests exercise the real factory code.
vi.mock("../lib/supabase-client", async (importOriginal) => {
  return await importOriginal<typeof import("../lib/supabase-client")>();
});

describe("supabase-client factories", () => {
  beforeEach(() => {
    createClientMock.mockClear();
    process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service-key";
    process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
  });

  it("builds a request-scoped client from the anon key with an accessToken hook", async () => {
    const { getRequestSupabaseClient } = await import("../lib/supabase-client");
    getRequestSupabaseClient("clerk-jwt-abc");
    expect(createClientMock).toHaveBeenCalled();
    const [url, key, options] = createClientMock.mock.calls[0] as [
      string,
      string,
      { accessToken?: () => Promise<string> },
    ];
    expect(key).toBe(process.env.SUPABASE_ANON_KEY);
    expect(typeof options.accessToken).toBe("function");
    await expect(options.accessToken?.()).resolves.toBe("clerk-jwt-abc");
  });

  it("returns an anon client with no accessToken hook when no token is given", async () => {
    const { getAnonSupabaseClient } = await import("../lib/supabase-client");
    getAnonSupabaseClient();
    const [, key, options] = createClientMock.mock.calls[0] as [
      string,
      string,
      { accessToken?: () => Promise<string> },
    ];
    expect(key).toBe(process.env.SUPABASE_ANON_KEY);
    expect(options.accessToken).toBeUndefined();
  });

  it("keeps the service-role singleton for system routes", async () => {
    const { getSupabaseClient } = await import("../lib/supabase-client");
    getSupabaseClient();
    expect(createClientMock).toHaveBeenCalled();
    const key = createClientMock.mock.calls[0]?.[1];
    expect(key).toBe(process.env.SUPABASE_SERVICE_ROLE_KEY);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `artifacts\api-server`): `pnpm vitest run src/test/supabase-client.test.ts`
Expected: FAIL — `getRequestSupabaseClient` / `getAnonSupabaseClient` are not exported.

- [ ] **Step 3: Implement the factories and env change**

Replace the contents of `artifacts/api-server/src/lib/supabase-client.ts` with:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@workspace/supabase/types";
import { env } from "./env";

let _client: SupabaseClient<Database> | null = null;

/**
 * Service-role client — SYSTEM ROUTES ONLY (see the plan's Global
 * Constraints). Bypasses RLS; must never serve tenant-scoped request paths.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!_client) {
    _client = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

/**
 * Request-scoped client: anon key + the caller's verified Clerk JWT. RLS
 * evaluates auth.jwt() ->> 'sub' against portfolios.owner_user_id, so every
 * query through this client is tenant-scoped by the database itself.
 */
export function getRequestSupabaseClient(token: string): SupabaseClient<Database> {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    accessToken: async () => token,
  });
}

/** Plain anon client for public (unauthenticated) request paths. */
export function getAnonSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

In `artifacts/api-server/src/lib/env.ts`:

- Line ~156-158: make the `SUPABASE_ANON_KEY` getter **required** (mirror the `SUPABASE_SERVICE_ROLE_KEY` getter's throwing form).
- Line ~241: add `"SUPABASE_ANON_KEY"` to the startup-required list.

In `artifacts/api-server/src/middleware/adminAuth.ts`:

- Extend the interface (lines 20-23):

```ts
export interface AuthenticatedRequest extends Request {
  adminEmail?: string;
  user?: { id: string; email: string; role: string };
  /** Raw verified Clerk JWT (Bearer path only) — feeds the JWT-scoped client. */
  clerkToken?: string;
}
```

- In the Clerk branch (after line 158 `if (verified && ADMIN_EMAILS.includes(verified.email)) {`), add `req.clerkToken = clerkToken;` (the local variable from line 118).

In `supabase/config.toml` (lines 357-361), enable Clerk third-party auth:

```toml
# Use Clerk as a third-party provider alongside Supabase Auth.
[auth.third_party.clerk]
enabled = true
# Production: exact host of the Clerk instance backing ADMIN_EMAILS users.
# Read CLERK_ISSUER from the root .env (e.g. https://clerk.<app>.accounts.dev)
# and set domain to the host without the scheme. Local dev relies on the
# stack's own JWTs (RLS test suite signs with the local JWT secret); Clerk
# tokens are only exercised against production/staging.
domain = "clerk.example.accounts.dev"
```

Use the real domain derived from `CLERK_ISSUER` in the root `.env` (strip `https://`). If `.env` has no `CLERK_ISSUER`, leave `enabled = true` with the placeholder and record the real domain as a production runbook step (Task 7).

- [ ] **Step 4: Run the test to verify it passes**

Run (from `artifacts\api-server`): `pnpm vitest run src/test/supabase-client.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify the local stack still boots with third-party auth enabled**

Run (repo root): `supabase db reset 2>&1 | Select-Object -Last 1` then from `lib\db`: `pnpm vitest run src/rls-multitenant.test.ts`
Expected: reset replays cleanly; RLS suite 16/16 green (the suite signs JWTs with the stack's own secret — third-party auth must not affect them). If the auth service fails to boot with third-party enabled, set `enabled = false` in config.toml, record the deviation in the plan header notes, and rely on the production runbook step in Task 7.

- [ ] **Step 6: Commit**

```bash
git add supabase/config.toml artifacts/api-server/src/lib/env.ts artifacts/api-server/src/lib/supabase-client.ts artifacts/api-server/src/middleware/adminAuth.ts artifacts/api-server/src/test/supabase-client.test.ts
git commit -m "feat(api): JWT-scoped supabase client factory and clerk third-party auth config"
```

---

### Task 2: Request client middleware + active-portfolio resolver

**Files:**

- Create: `artifacts/api-server/src/middleware/requestClient.ts`
- Create: `artifacts/api-server/src/lib/active-portfolio.ts`
- Modify: `artifacts/api-server/src/middleware/adminAuth.ts` (attach `req.supabase`)
- Test: `artifacts/api-server/src/test/request-client.test.ts` (create)

**Interfaces:**

- Consumes: `getRequestSupabaseClient`, `getAnonSupabaseClient`, `getSupabaseClient` (Task 1); `AuthenticatedRequest.clerkToken`.
- Produces:
  - `AuthenticatedRequest.supabase?: SupabaseClient<Database>` — JWT-scoped for Clerk callers, service-role for the `x-admin-key` path.
  - `attachRequestSupabase(req, res, next)` — middleware, mounted immediately after `adminAuth` in `routes/v1/index.ts`.
  - `resolveActivePortfolioId(req, explicit?: string | null): Promise<string>` — explicit validated `portfolioId` if given, else the caller's first portfolio (`SELECT id FROM portfolios ORDER BY created_at LIMIT 1` through `req.supabase`; RLS restricts to owned rows). Throws `NoActivePortfolioError` when the caller owns none. Cached on the request object.

- [ ] **Step 1: Write the failing tests**

Create `artifacts/api-server/src/test/request-client.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/adminAuth";
import { attachRequestSupabase } from "../middleware/requestClient";
import { resolveActivePortfolioId, NoActivePortfolioError } from "../lib/active-portfolio";

function chainable(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const terminal = { ...q, ...{ then: undefined } };
  const builder: Record<string, unknown> = {};
  for (const key of [
    "select",
    "eq",
    "order",
    "limit",
    "range",
    "not",
    "is",
    "or",
    "gte",
    "single",
    "maybeSingle",
    "returns",
  ]) {
    builder[key] = vi.fn(() => builder);
  }
  builder.then = undefined;
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.returns = vi.fn(() => Promise.resolve(result));
  void terminal;
  return builder;
}

function makeReq(clerkToken?: string): AuthenticatedRequest {
  return { headers: {}, query: {}, body: {} } as unknown as AuthenticatedRequest;
}

describe("attachRequestSupabase", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("attaches a JWT-scoped client when a clerk token is present", async () => {
    const supabaseClient = await import("../lib/supabase-client");
    const spy = vi.spyOn(supabaseClient, "getRequestSupabaseClient");
    const req = makeReq();
    req.clerkToken = "tok";
    const res: Partial<Response> = {};
    await new Promise<void>((resolve) => attachRequestSupabase(req, res as Response, resolve));
    expect(spy).toHaveBeenCalledWith("tok");
    expect(req.supabase).toBeDefined();
  });
});

describe("resolveActivePortfolioId", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("prefers the explicit portfolioId from query or body", async () => {
    const { resolveActivePortfolioId } = await import("../lib/active-portfolio");
    const req = makeReq();
    req.query = { portfolioId: "11111111-1111-1111-1111-111111111111" };
    const id = await resolveActivePortfolioId(req);
    expect(id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("falls back to the caller's first owned portfolio via RLS", async () => {
    const { resolveActivePortfolioId } = await import("../lib/active-portfolio");
    const req = makeReq();
    const pfId = "22222222-2222-2222-2222-222222222222";
    req.supabase = {
      from: vi.fn(() => chainable(pfId)),
    } as unknown as AuthenticatedRequest["supabase"];
    const id = await resolveActivePortfolioId(req);
    expect(id).toBe(pfId);
    expect(await resolveActivePortfolioId(req)).toBe(pfId); // cached on req
  });

  it("throws NoActivePortfolioError when the caller owns no portfolio", async () => {
    const { resolveActivePortfolioId, NoActivePortfolioError } =
      await import("../lib/active-portfolio");
    const req = makeReq();
    req.supabase = {
      from: vi.fn(() => chainable(null)),
    } as unknown as AuthenticatedRequest["supabase"];
    await expect(resolveActivePortfolioId(req)).rejects.toThrow(NoActivePortfolioError);
  });
});

function chainable(id: string | null) {
  const builder: Record<string, unknown> = {};
  for (const key of ["select", "eq", "order", "limit", "range", "not", "is", "or", "returns"]) {
    builder[key] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: id === null ? null : { id }, error: null }),
  );
  builder.then = undefined;
  return builder;
}
```

Note: the `chainable` helper pattern above mirrors the existing chained-mock conventions in `artifacts/api-server/src/test/helpers.ts` (terminal method resolves the promise; mid-chain methods return the builder).

- [ ] **Step 2: Run tests to verify they fail**

Run (from `artifacts\api-server`): `pnpm vitest run src/test/request-client.test.ts`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement the middleware and resolver**

Create `artifacts/api-server/src/middleware/requestClient.ts`:

```ts
import type { NextFunction, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@workspace/supabase/types";
import type { AuthenticatedRequest } from "./adminAuth";
import { getSupabaseClient, getRequestSupabaseClient } from "../lib/supabase-client";

declare module "./adminAuth" {
  interface AuthenticatedRequest {
    supabase?: SupabaseClient<Database>;
  }
}

/**
 * Attaches the request's Supabase client:
 * - Clerk callers get an anon-key client scoped to their verified JWT, so
 *   Postgres RLS (migrations 064-067) is the authorization boundary.
 * - The x-admin-key system path keeps the service-role client (no tenant
 *   identity exists for API-key scripts; system routes are allowlisted).
 */
export function attachRequestSupabase(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  req.supabase = req.clerkToken ? getRequestSupabaseClient(req.clerkToken) : getSupabaseClient();
  next();
}
```

Create `artifacts/api-server/src/lib/active-portfolio.ts`:

```ts
import type { AuthenticatedRequest } from "../middleware/adminAuth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Raised when the caller owns no portfolio and none was requested. */
export class NoActivePortfolioError extends Error {
  constructor() {
    super("No portfolio available for this account");
    this.name = "NoActivePortfolioError";
  }
}

/**
 * Resolve the portfolio an CMS write should target:
 * 1. an explicit, valid-UUID portfolioId (query or body) — ownership is then
 *    enforced by RLS (a foreign id yields 42501 → mapped to 404);
 * 2. otherwise the caller's first owned portfolio, read through the
 *    JWT-scoped client (owner_select policy), cached on the request.
 */
export async function resolveActivePortfolioId(req: AuthenticatedRequest): Promise<string> {
  const explicit = (req.query.portfolioId ?? req.body?.portfolioId) as string | undefined;
  if (typeof explicit === "string" && UUID_RE.test(explicit)) return explicit;

  const cached = req.activePortfolioId;
  if (cached) return cached;

  if (!req.supabase) throw new NoActivePortfolioError();
  const { data, error } = await req.supabase
    .from("portfolios")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error !== null || data === null) throw new NoActivePortfolioError();
  const id = data.id;
  if (typeof id !== "string" || !UUID_RE.test(id)) throw new NoActivePortfolioError();
  req.activePortfolioId = id;
  return id;
}
```

Extend `AuthenticatedRequest` in `middleware/adminAuth.ts` with `activePortfolioId?: string;` (add next to `clerkToken`, replacing the `declare module` augmentation in requestClient.ts with a plain field on the interface — simpler and matches the existing pattern).

- [ ] **Step 4: Run tests to verify they pass**

Run (from `artifacts\api-server`): `pnpm vitest run src/test/request-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/middleware/requestClient.ts artifacts/api-server/src/lib/active-portfolio.ts artifacts/api-server/src/middleware/adminAuth.ts artifacts/api-server/src/test/request-client.test.ts
git commit -m "feat(api): request-scoped supabase client and active-portfolio resolver"
```

---

### Task 3: Collection layer goes portfolio-first (RLS replaces user_id scoping)

**Files:**

- Modify: `artifacts/api-server/src/lib/collection-router.ts` (lines 63-101)
- Modify: `artifacts/api-server/src/lib/route-helpers.ts` (lines 35-99)
- Modify: `artifacts/api-server/src/lib/collection-query.ts` (lines 108-192)
- Modify: `lib/db/src/collection.ts` (keep user-scoping machinery ONLY for `theme_presets`)
- Test: `artifacts/api-server/src/test/routes/collection-404.test.ts` and `lib/db/src/collection.test.ts` (update)

**Interfaces:**

- Consumes: `resolveActivePortfolioId` (Task 2).
- Produces:
  - `collectionMutate` insert rows for tenanted tables carry `portfolio_id` (stamped by the router); `theme_presets` continues to carry `user_id`.
  - `runCollectionQuery(req, res, table, options)` — same signature; `options.targetUserId`/`includeOrphans` are ignored for tenanted tables (RLS scopes reads); retained only for the `theme_presets` route.
  - `updateByIdAndUser` / `softDeleteByIdAndUser` — no longer pass `userId` to `collectionMutate` (RLS enforces ownership); 404-on-zero-rows behavior preserved.

**Design decision (recorded):** with JWT-scoped clients, `owner_select_<t>` policies already restrict reads to the caller's portfolios, so the `?userId=` machinery, `includeOrphans` (messages orphans), and superadmin "All users" unfiltered reads are removed from tenanted collections. `theme_presets` is NOT tenanted (spec §4.3) and keeps `user_id` scoping. `messages` ownership becomes portfolio-based: public contact inserts (Task 5) stamp `portfolio_id`, so the admin messages list sees them via RLS without orphans.

- [ ] **Step 1: Update the failing tests first**

In `lib/db/src/collection.test.ts`, change the mutation-scope assertions: `collectionMutate` update calls WITHOUT `userId` must not apply a user filter, and `theme_presets` updates still apply `.eq("user_id", ...)` when `userId` is passed (behavior unchanged — this is the regression guard).

In `artifacts/api-server/src/test/routes/collection-404.test.ts` (and any collection route tests), the mocked chain must now expect:

- POST inserts containing `portfolio_id` (a fixed test UUID) and **no `user_id`**;
- GET queries built without the `user_id.eq` scoping chain calls.

- [ ] **Step 2: Run to verify red**

Run (from `artifacts\api-server`): `pnpm vitest run src/test/routes/collection-404.test.ts` — expect FAIL.
Run (from `lib\db`): `pnpm vitest run src/collection.test.ts` — expect FAIL (signatures/behavior).

- [ ] **Step 3: Implement**

`collection-router.ts` POST handler (lines 67-101) becomes:

```ts
router.post("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = req.supabase;
  if (!supabase) {
    return serverError(res, "Request client not initialized");
  }
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error?.flatten().fieldErrors ?? {});
  }
  const data = result.data as Record<string, unknown>;
  if (opts.findDuplicate) {
    const existing = await opts.findDuplicate(supabase, data, req.user?.id);
    if (existing) {
      return conflict(res, "An item with this name already exists", {
        code: "DUPLICATE_NAME",
        existingId: existing.id,
      });
    }
  }
  const isTenanted = table !== "theme_presets";
  const insertData: Record<string, unknown> = { ...data };
  if (isTenanted) {
    try {
      insertData.portfolio_id = await resolveActivePortfolioId(req);
    } catch (error) {
      if (error instanceof NoActivePortfolioError) {
        return badRequest(res, { portfolioId: ["Create a portfolio first"] });
      }
      throw error;
    }
  } else {
    insertData.user_id = req.user?.id;
  }
  if (insertDefaults) {
    Object.assign(insertData, insertDefaults(data));
  }
  try {
    await collectionMutate(supabase, table, { action: "insert", row: insertData });
  } catch (error) {
    if (isUniqueViolationError(error) && opts.findDuplicate) {
      return conflict(res, "An item with this name already exists", {
        code: "DUPLICATE_NAME",
      });
    }
    return serverError(res, safeErrorMessage(error));
  }
  return created(res);
});
```

Imports change: drop `getSupabaseClient`, add `resolveActivePortfolioId, NoActivePortfolioError` from `./active-portfolio`.

`route-helpers.ts` `updateByIdAndUser` (lines 43-57): replace `const supabase = getSupabaseClient() as SupabaseClient<Database>;` with a guard on `req.supabase` (500 + "Request client not initialized" when missing, matching the router), and drop the `userId` field from the `collectionMutate` call entirely (RLS scopes updates; "no row matched" still yields the existing 404).

`collection-query.ts` `runCollectionQuery`: replace `const supabase = getSupabaseClient();` with a `req.supabase` guard; remove the `resolveTargetUserId`/empty-result block (lines 113-130) and the `targetUserId` filter block (lines 161-171) for tenanted tables. Keep the `userColumn`/`targetUserId` machinery reachable ONLY when `options.userColumn === "user_id" && table === "theme_presets"` — concretely: hoist the theme_presets special case into the route (Task 4) and simplify this function to have no user-scope parameters at all; the theme-presets route builds its own query (it is the only consumer).

`lib/db/src/collection.ts`: keep the `CollectionQueryOptions.userColumn`/`targetUserId`/`includeOrphans` fields (theme_presets + any direct lib consumers), but the default `user_id` scoping no longer applies to inserts made by the router (router decides what to stamp). No signature changes.

`routes/v1/index.ts` mounting: add `attachRequestSupabase` right after `adminAuth` for the `/admin` sub-router and keep `validateQueryUserId` removed from collection routes (it validated the now-removed `?userId=`).

- [ ] **Step 4: Run to verify green**

Run (from `artifacts\api-server`): `pnpm vitest run` — all collection-route suites green.
Run (from `lib\db`): `pnpm vitest run src/collection.test.ts` — PASS.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/collection-router.ts artifacts/api-server/src/lib/route-helpers.ts artifacts/api-server/src/lib/collection-query.ts lib/db/src/collection.ts lib/db/src/collection.test.ts artifacts/api-server/src/test
git commit -m "feat(api): collection layer stamps portfolio_id and relies on RLS scoping"
```

---

### Task 4: Swap CMS route clients to req.supabase + tenant storage paths + 404 mapping

**Files (mechanical sweep — every file calls `getSupabaseClient()` inline today):**

- Modify: `artifacts/api-server/src/routes/admin/` — about.ts, analytics.ts, certifications.ts, contact-info.ts, cv.ts, experience.ts, hero.ts, images.ts, messages.ts, posts.ts, projects.ts, seed.ts, seo-settings.ts, site-settings.ts, section-settings.ts, skills.ts, theme-presets.ts, theme-settings.ts, typography-settings.ts
- Modify: `artifacts/api-server/src/routes/cv.ts`, `artifacts/api-server/src/routes/images.ts`, `artifacts/api-server/src/routes/public/posts.ts`
- Modify: `artifacts/api-server/src/lib/messages/scope.ts`, `bulk.ts`, `reply.ts`, `maintenance.ts` (client passed as arg from the routes above — swap happens at call sites)
- Modify: `artifacts/api-server/src/lib/safe-error.ts` (add `respondDbError`)
- NOT modified (stay service-role, Global Constraints list): `routes/admin/users.ts`, `routes/admin/arabic-status.ts`, `routes/admin/audit.ts`, `lib/ai/*`, `routes/public/contact.ts` (Task 5 switches it to anon + keeps AI service-role pipeline), `lib/user-sync.ts`

**Interfaces:**

- Consumes: `req.supabase`, `resolveActivePortfolioId` (Tasks 1-3).
- Produces: `respondDbError(res, err, logContext): Response` from `lib/safe-error.ts` — maps PostgREST `42501` (RLS denial) → **404** `{ success: false, message: "Not found." }` per spec §10, `23505` → 409 via existing `conflict` (callers that already do this keep their explicit mapping), everything else → 500 with `safeErrorMessage`. CMS route catch blocks use it instead of bare `serverError(res, ...)`.

**Mechanical transformation rule** (apply uniformly; identical shape in every listed file):

```ts
// before
const supabase = getSupabaseClient();
// after
const supabase = req.supabase;
if (!supabase) {
  return serverError(res, "Request client not initialized");
}
```

- In handlers where `getSupabaseClient()` was passed straight into a `@workspace/db` call (e.g. `singletonUpsert(getSupabaseClient(), ...)`, `getArabicTranslationStatus(getSupabaseClient())`), pass `req.supabase` behind the same null-guard.
- Remove the `import { getSupabaseClient } from "../lib/supabase-client"` (or `../../lib/supabase-client`) line in each migrated file.
- `findDuplicate` hook signatures keep `userId` (still used by `theme_presets`); tenanted routers pass `req.user?.id` unchanged (harmless — RLS scopes the probe query).

**Tenant storage paths (REQUIRED — otherwise owner uploads fail the 067 `owner_all_<bucket>` policies):**

- `routes/images.ts` (POST /images/upload, lines ~96-166): the storage upload object name must be `` `${await resolveActivePortfolioId(req)}/${filename}` `` and the `image_metadata.storage_path` insert (line ~161) must carry the same prefixed path plus `portfolio_id` (drop `user_id: req.user?.id ?? null`). The ownership re-checks at lines ~200-206 and ~273-278 (selects of `image_metadata` by path/id) go through `req.supabase` — RLS makes a foreign row invisible, so a miss maps to 404 via `respondDbError`.
- `routes/admin/cv.ts` (lines ~10, 35, 76): the uploaded CV object name becomes `` `${portfolioId}/cv-${Date.now()}.pdf` `` (keep the existing `^cv-\d+\.pdf$` naming rule _within_ the prefix — the storage-RLS object name is `{portfolioId}/cv-N.pdf`, so update the CV regex check to validate the basename before prefixing) and `cv_settings.object_path` stores the prefixed path.

**Safe-error helper** — append to `lib/safe-error.ts`:

```ts
import { notFound } from "./api-response";

/**
 * Central DB-error responder for CMS routes. RLS denials (42501) mean the
 * caller referenced a foreign or nonexistent portfolio — per spec §10 these
 * map to 404 so tenant existence is not revealed. Unique violations map to
 * 409; everything else is a safe 500.
 */
export function respondDbError(res: Response, err: unknown): Response {
  const e = err as { code?: string } | null;
  if (e !== null && typeof e === "object" && e.code === "42501") {
    return notFound(res, "Not found.");
  }
  if (e !== null && typeof e === "object" && e.code === "23505") {
    return res.status(409).json({ success: false, message: safeErrorMessage(err) });
  }
  return serverErrorSafe(res, err);
}
```

Apply `respondDbError` in the catch blocks of every migrated CMS route (replacing `serverError(res, safeErrorMessage(error))` / `serverErrorSafe(res, error)` calls) — including inside `updateByIdAndUser`'s catch (route-helpers.ts:76) and `runCollectionQuery`'s error branch (collection-query.ts:189-190).

- [ ] **Step 1: Migrate the pure-CMS singleton + collection routes first** (about, certifications, contact-info, experience, hero, projects, seed, seo-settings, site-settings, section-settings, skills, theme-settings, typography-settings, posts, messages via lib/messages/\*, theme-presets). Each keeps its existing Zod validation, CSRF, and envelope behavior; only the client source and error responder change.
- [ ] **Step 2: Update that batch's route tests.** In `artifacts/api-server/src/test/helpers.ts`, extend `makeAdminAuth` (lines 41-53) so the mocked middleware also sets `req.supabase = makeMockSupabaseClient()` and `req.clerkToken = "test-clerk-token"`. Suite-level mocks of `../lib/supabase-client` keep working for the system routes that retain the singleton. Per-suite assertions that inspected `getSupabaseClient()` call args move to inspecting `req.supabase` (the same chained mock instance).
- [ ] **Step 3: Migrate images + cv routes** (storage-prefix changes above) and `routes/public/posts.ts` + `routes/cv.ts` (public reads → `getAnonSupabaseClient()` — these are unauthenticated public reads; `public_read` policies cover published portfolios).
- [ ] **Step 4: Verify**

Run (from `artifacts\api-server`): `pnpm vitest run` — all green (route suites + e2e-routes).
Grep gate (repo root, expect only the allowlisted files):

```powershell
Select-String -Path artifacts\api-server\src\routes\**\*.ts,artifacts\api-server\src\lib\**\*.ts -Pattern 'getSupabaseClient\(\)' | Select-Object -ExpandProperty Path | Sort-Object -Unique
```

Expected remaining: `lib/supabase-client.ts`, `lib/user-sync.ts` (via `getDefaultAdminUser`? no — user-sync takes a client; check callers: `adminAuth` keeps it for `syncUserFromClerk` — leave as-is, it is the identity-sync system path), `lib/ai/*`, and the system routes listed above. Record the final list in the Task 7 docs.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src
git commit -m "feat(api): CMS routes use JWT-scoped request clients with RLS-aware storage paths"
```

---

### Task 5: Public surfaces — contact portfolio resolution + frontend analytics portfolio_id

**Files:**

- Modify: `artifacts/api-server/src/routes/public/contact.ts` (insert block, lines ~128-137)
- Modify: `lib/db/src/messages.ts` (`createMessage` gains `portfolioId`)
- Modify: `lib/db/src/analytics.ts` (`trackEvent` gains `portfolioId`)
- Modify: `artifacts/portfolio/src/lib/analytics-portfolio.ts` (create — module-cached resolver)
- Modify call sites: `artifacts/portfolio/src/pages/Home.tsx:48`, `ProjectDetail.tsx:52`, `BlogPost.tsx:53`, `features/hero/hooks/useHero.ts:55`, `features/contact/components/WhatsAppFloat.tsx:34`, `ContactInfoPanel.tsx:68,91`

**Interfaces:**

- Consumes: `getAnonSupabaseClient` (Task 1); `public_portfolios` view (064 — anon-readable for published rows); `public_insert_messages` / `public_insert_analytics` policies (066).
- Produces:
  - `createMessage(supabase, input)` where `input` includes `portfolio_id: string` — the message row is written through the **anon** client and must satisfy `public_insert_messages` (published portfolio, `status='unread'`, `is_spam=false`).
  - `resolveDefaultPortfolioId(supabase): Promise<string | null>` in the portfolio app — queries `public_portfolios` (`.eq("is_published", true).order("created_at").limit(1)`), module-level cached promise; returns null when offline/unpublished (callers then skip analytics silently).

- [ ] **Step 1: Failing test — contact inserts carry a published portfolio_id through the anon client**

Update `artifacts/api-server/src/test/contact.test.ts`: the mocked insert payload must include `portfolio_id`; the client passed to `createMessage` is the anon client (assert via the mocked factory call). Server resolves the portfolio id by querying `public_portfolios` when the request body has no `portfolioId` (root-site interim behavior; Phase 3 passes the slug explicitly).

- [ ] **Step 2: Implement contact changes**

`routes/public/contact.ts` (replace lines 129-137 region):

```ts
const { name, email, message } = result.data;
try {
  const anon = getAnonSupabaseClient();
  const { data: pf, error: pfErr } = await anon
    .from("public_portfolios")
    .select("id")
    .eq("is_published", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (pfErr !== null || pf === null) {
    return serverError(res, "No published portfolio available");
  }
  const inserted = await createMessage(anon, {
    name,
    email,
    message,
    portfolio_id: pf.id as string,
  });
  // AI spam pipeline unchanged — SYSTEM path keeps the service-role client.
  if (isAiConfigured() && env.AI_SPAM_ENABLED) {
    flagSpamIfNeeded({ id: inserted.id, name, email, message }).catch(() => {});
  }
```

`lib/db/src/messages.ts` `createMessage`: accept `portfolio_id` in the input type and pass it through to the insert (`{ ...input, status: "unread" }` already spreads). No `user_id` is written.

- [ ] **Step 3: Frontend analytics portfolio_id**

Create `artifacts/portfolio/src/lib/analytics-portfolio.ts`:

```ts
import { getSupabase } from "@workspace/supabase/client";

let cached: Promise<string | null> | null = null;

/**
 * Resolve the published portfolio this root-site visit belongs to. Cached
 * for the session; Phase 3 replaces this with per-route /p/:slug resolution.
 */
export function resolveDefaultPortfolioId(): Promise<string | null> {
  if (cached) return cached;
  cached = (async () => {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("public_portfolios")
      .select("id")
      .eq("is_published", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error !== null || data === null) return null;
    return typeof data.id === "string" ? data.id : null;
  })();
  return cached;
}
```

`lib/db/src/analytics.ts` `trackEvent` gains a final parameter `portfolioId?: string | null` and includes `portfolio_id: portfolioId ?? null` in the insert. Each portfolio call site resolves once and passes it:

```ts
const portfolioId = await resolveDefaultPortfolioId();
trackEvent(supabase, "page_view", "/", undefined, portfolioId);
```

(Fire-and-forget sites keep their `void`/`.catch` semantics; resolution failure silently skips the event.)

- [ ] **Step 4: Admin direct-Supabase calls gain the JWT hook (spec §6 "admin swaps its service-role client for the anon+JWT pattern")**

The admin app's shared client (`lib/supabase/src/client.ts`, used directly by `artifacts/admin/src/features/cv/components/CvManager.tsx:5` for CV uploads) is anon with no token — under 067 storage RLS an unscoped upload would be denied. Add an optional token hook:

`lib/supabase/src/client.ts` — extend the factory:

```ts
type AccessTokenGetter = () => Promise<string | null>;
let accessTokenGetter: AccessTokenGetter | null = null;

/** Register a Clerk session-token getter (admin mounts this; portfolio does not). */
export function setSupabaseAccessTokenGetter(getter: AccessTokenGetter | null): void {
  accessTokenGetter = getter;
  _client = null; // force re-create so the next client carries the hook
}

function createBrowserSupabase(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    logWarn(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — running in offline mode.",
      "supabase-client",
    );
    return null;
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    ...(accessTokenGetter ? { accessToken: async () => (await accessTokenGetter()) ?? "" } : {}),
  });
}
```

`artifacts/admin/src/features/auth/components/ClerkAuthBridge.tsx` — next to the existing `setAuthTokenGetter` registration (lines 74-92), also register the Supabase hook: `setSupabaseAccessTokenGetter(() => getClerkToken(false))` (import from `src/lib/auth-token.ts`). `resetSupabase()` semantics are unchanged.

- [ ] **Step 5: Verify**

Run (from `artifacts\portfolio`): `pnpm vitest run` — green (update `trackEvent` mocks to assert the extra arg).
Run (from `artifacts\admin`): `pnpm vitest run` — green (ClerkAuthBridge test asserts the new registration).
Run (from `artifacts\api-server`): `pnpm vitest run src/test/contact.test.ts` — green.

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src/routes/public/contact.ts lib/db/src lib/supabase/src artifacts/admin/src/features/auth artifacts/portfolio/src
git commit -m "feat: public writes stamp published portfolio id; admin supabase client carries clerk jwt"
```

---

### Task 6: Migration 069 — drop user*id, admin_all*\*, GUC fallback, analytics NULL branch

**Files:**

- Create: `supabase/migrations/069_retire_app_layer_tenancy.sql`
- Modify: `lib/db/src/rls-multitenant.test.ts` (3 new tests)

**Interfaces:**

- Consumes: Phase 1 schema (064-067); app code no longer writes `user_id` on tenanted tables (Tasks 3-5).
- Produces: `user_id` dropped from all tenanted tables EXCEPT `theme_presets` (global, user-scoped) — spec §4.3; `admin_all_*` policies dropped; `is_admin()` recreated WITHOUT the `app.allow_guc_admin_fallback` GUC path; `public_insert_analytics` requires a published `portfolio_id` (NULL branch removed).

- [ ] **Step 1: Write the failing RLS tests**

Append to the `rls: tenanted table isolation (066)` describe in `lib/db/src/rls-multitenant.test.ts`:

```ts
it("admin email without ownership cannot read other tenants' drafts", async () => {
  const { portfolioA } = await ensureSchema();
  const svc = serviceClient();
  await svc
    .from("users")
    .upsert(
      { clerk_id: "user_test_admin", email: "owner-a@test.local", role: "superadmin" },
      { onConflict: "clerk_id" },
    );
  await svc
    .from("projects")
    .upsert(
      {
        portfolio_id: portfolioA,
        slug: "draft-isolation",
        title: "Draft isolation",
        description: "a decent description",
        is_published: false,
      },
      { onConflict: "id" },
    );
  const adminNotOwner = clientFor({ sub: "user_test_admin" });
  const { data } = await adminNotOwner
    .from("projects")
    .select("title")
    .eq("title", "Draft isolation");
  expect(data).toEqual([]);
});

it("anon analytics inserts require a published portfolio (no NULL branch)", async () => {
  const anon = anonClient();
  const { error } = await anon.from("analytics_events").insert({ type: "page_view", path: "/" });
  expect(error).not.toBeNull();
});
```

Note: `user_test_admin` shares owner-a's email but a different Clerk `sub` — with `admin_all_*` dropped, ownership is decided solely by `portfolios.owner_user_id`, so this test FAILS while those policies exist (red state).

- [ ] **Step 2: Run to verify red**

Run (repo root): `supabase db reset` (069 does not exist yet — this just re-proves the current state), then from `lib\db`: `pnpm vitest run src/rls-multitenant.test.ts`
Expected: the two new tests FAIL (admin reads the draft; NULL analytics insert succeeds through the 066 NULL branch).

- [ ] **Step 3: Write migration 069**

Create `supabase/migrations/069_retire_app_layer_tenancy.sql`:

```sql
-- ============================================================================
-- 069_retire_app_layer_tenancy.sql — Phase 2: RLS is the only boundary
-- Spec: 2026-09-16-multi-tenancy-design.md §6, §13.2
--  1. Drop user_id from the 20 tenanted tables (theme_presets stays global
--     user-scoped per spec §4.3; users keeps its own columns).
--  2. Drop the admin_all_* policies (001) — ownership is owns_portfolio only.
--  3. Rebuild is_admin() without the app.allow_guc_admin_fallback GUC path.
--  4. public_insert_analytics: require a published portfolio_id (NULL branch
--     removed — the portfolio frontend now sends portfolio_id).
-- ============================================================================

-- 1. Drop user_id from tenanted tables.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'theme_settings','typography_settings','site_settings','seo_settings',
    'hero_content','about_content','contact_info','cv_settings',
    'skills','projects','experience','certifications','messages',
    'section_settings','content_snapshots','section_variants',
    'analytics_events','content_health_reports','image_metadata',
    'image_variants','blog_posts'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS user_id', t);
    END IF;
  END LOOP;
END $$;

-- 2. Drop the admin_all_* policies from 001 (13 tables).
DO $$
DECLARE
  pol TEXT;
BEGIN
  FOREACH pol IN ARRAY ARRAY[
    'admin_all_hero','admin_all_about','admin_all_skills','admin_all_projects',
    'admin_all_experience','admin_all_certifications','admin_all_contact',
    'admin_all_theme','admin_all_typography','admin_all_site','admin_all_seo',
    'admin_all_sections','admin_all_variants'
  ] LOOP
    EXECUTE format(
      'DO $$ BEGIN
         IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname=''public'' AND policyname=%L) THEN
           EXECUTE (SELECT format(''DROP POLICY %I ON public.%I'', %L, tablename)
                    FROM pg_policies WHERE schemaname=''public'' AND policyname=%L LIMIT 1);
         END IF;
       END $$;', pol, pol);
  END LOOP;
END $$;

-- 3. is_admin() without the GUC fallback (kept for any residual references;
--    verification block below asserts no policy still depends on it).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_email TEXT;
BEGIN
  BEGIN
    user_email := auth.jwt() ->> 'email';
  EXCEPTION WHEN OTHERS THEN user_email := NULL; END;
  IF user_email IS NULL OR user_email = '' THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE email = lower(user_email) AND role = 'superadmin'
  );
END;
$$;

-- 4. Analytics: no NULL-portfolio tolerance anymore.
DROP POLICY IF EXISTS "public_insert_analytics" ON public.analytics_events;
CREATE POLICY "public_insert_analytics" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.is_published_portfolio(portfolio_id)
    AND type IN ('page_view','project_view','cv_download','contact_click')
    AND char_length(COALESCE(path, '')) <= 512
    AND char_length(COALESCE(section_key, '')) <= 128
    AND char_length(COALESCE(preset_id, '')) <= 255
    AND char_length(COALESCE(referrer, '')) <= 512
  );

-- Verification: no remaining policy may reference is_admin() except through
-- explicit superadmin surfaces; fail the migration if the tenant layer leaks.
DO $$
DECLARE
  leftover INT;
BEGIN
  SELECT count(*) INTO leftover
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname LIKE 'admin_all_%';
  IF leftover > 0 THEN
    RAISE EXCEPTION '069 verification failed: % admin_all_* policies remain', leftover;
  END IF;
END $$;
```

Note: the nested-EXECUTE drop loop is intentionally defensive (policy may live on a renamed table after later migrations). If any `admin_all_*` policy name in 001 has been superseded/renamed by a later migration, first run the audit query below and adjust the array to the real names — never guess:

```sql
SELECT policyname, tablename FROM pg_policies
WHERE schemaname='public' AND policyname LIKE 'admin_all_%';
```

- [ ] **Step 4: Apply and verify green**

Run (repo root): `supabase db reset` — replays 001→069 cleanly.
Run (from `lib\db`): `pnpm vitest run src/rls-multitenant.test.ts` — 18/18 PASS.
Run (from `artifacts\api-server`): `pnpm vitest run` — green (route mocks are not schema-bound, but the contact test's `portfolio_id` assertion stays valid).
Grep gate — no runtime code may reference `user_id` on tenanted tables:

```powershell
Select-String -Path lib\db\src\*.ts,artifacts\api-server\src\lib\*.ts,artifacts\api-server\src\routes\**\*.ts -Pattern 'user_id' | Where-Object { $_.Path -notmatch 'theme|users' }
```

Expected: only `theme_presets`/`users`-related hits remain (collection.ts keeps the generic `userColumn` default but no tenanted caller passes it; `lib/db/src/users.ts` is legitimate).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/069_retire_app_layer_tenancy.sql lib/db/src/rls-multitenant.test.ts
git commit -m "feat(db): drop user_id columns, admin_all_* policies, and analytics NULL-portfolio branch"
```

---

### Task 7: Docs, production runbook, final gates

**Files:**

- Modify: `supabase/migrations/README.md` (append a Phase 2 section)
- Modify: `docs/superpowers/specs/2026-09-16-multi-tenancy-design.md` (§ deviations only if discovered)

**Steps:**

- [ ] **Step 1: README appendix** — document 069 (what it drops and why), the final service-role allowlist (system routes from the Task 4 grep output), the production runbook additions:
  1. Supabase dashboard → Authentication → Third-Party Auth → enable Clerk with the production Clerk domain (from `CLERK_ISSUER`); local config.toml already carries the block.
  2. Set `SUPABASE_ANON_KEY` in the api-server Vercel env (new required var).
  3. After `supabase db push`, keep the Phase 1 owner-binding step (`UPDATE portfolios SET owner_user_id = ... WHERE slug = 'mustafa'`) — still required before any CMS write works.
  4. Admin JWT template: the admin app already requests the `admin` JWT template (`VITE_CLERK_JWT_TEMPLATE`, `artifacts/admin/src/features/auth/components/ClerkAuthBridge.tsx:74-92`) — for the Supabase integration the custom template is NOT required (Supabase accepts the raw session token; `sub` is the Clerk user id), but keep the template name in sync if the Clerk dashboard defines one.
- [ ] **Step 2: Full gates** (repo root): `pnpm typecheck` (0 errors), `pnpm lint` (0 warnings), `supabase db reset` + full `pnpm test` (all workspaces green, `--no-file-parallelism` fallback on Windows tinypool crashes).
- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/README.md docs/superpowers/specs/2026-09-16-multi-tenancy-design.md
git commit -m "docs: phase 2 runbook — clerk third-party auth, service-role allowlist, owner binding"
```

---

## Phase 2 completion checklist

- [ ] Every CMS route resolves its Supabase client from the request (grep gate: `getSupabaseClient()` only in the system-route allowlist).
- [ ] `supabase db reset` replays 001→069 cleanly; RLS suite green including the new admin-bypass and analytics-NULL denials.
- [ ] Full typecheck/lint/test gates green.
- [ ] Production runbook records: Clerk third-party enablement, `SUPABASE_ANON_KEY` env addition, owner binding, admin JWT template note.
- [ ] Handoff to Phase 3 plan (portfolio `/p/:slug` routing + root stub; admin portfolio switcher, create flow, first-portfolio screen — spec §8-§9).

## Known deferred items (intentionally out of scope)

- Admin portfolio switcher + create-portfolio flow + first-portfolio screen — Phase 3 (Phase 2 keeps the resolve-first-portfolio fallback).
- `/p/:slug` tenant routing in the portfolio frontend — Phase 3 (root site resolves the single published portfolio).
- `x-admin-key` system path keeps the service-role client by design (documented deviation, spec §6 "future system routes").
- `theme_presets` stays user-scoped with its `user_id` column (spec §4.3).
- Real JWT round-trip testing against a live Clerk project — Phase 3 E2E (local suite signs its own JWTs; the Clerk integration is config-only in Phase 2).
