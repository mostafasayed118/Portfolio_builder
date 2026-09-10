# Post-Audit Batch Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the highest-impact residual issues from the 2026-09 audit + deep scan across security, envelope, validation, DB, perf, and tests in one safe batch.

**Architecture:** Small isolated edits per task with no cross-task file overlap, each with failing-test-first verification. DB changes are additive migrations only. API envelope changes preserve wire shape except where explicitly standardizing to `paginated()`.

**Tech Stack:** TypeScript 5.9 strict, Express 5 api-server, Supabase Postgres (57 migrations, 18 tables), Zod v3, Vitest (8 projects), pnpm 9.15.0 Node 24.

**Spec:** Prior audit scores Maint 6.5 / Arch 6.0 / Qual 6.5 / Sec 8.0 / Perf 6.5 + 5-domain deep scan outputs in session history.

## Global Constraints

- pnpm monorepo, Node 24, TypeScript strict, ESLint `--max-warnings=0`, no `any`, no `as` assertions in new code, no non-null assertions.
- Files capped 250 lines, main components under 100 lines, one component per file, barrel imports only `@/features/<feature>`.
- API envelope `{ success, data }` or `{ success:false, message, errors }`; pagination via `paginated()` shape `{ data, pagination:{total,limit,offset,hasMore} }`.
- First-party modules must not be mocked with `vi.mock`; stub network via `vi.stubGlobal("fetch")` or MSW.
- Tests must assert exact schema error messages, cover loading/error/empty states for React Query pages.
- `VITE_*` vars are public — never put service-role keys or allowlists in them.

---

### Task 1: Docs + Env Fail-Closed (security footguns)

**Files:**
- Modify: `replit.md:32,70-71`
- Modify: `artifacts/admin/src/lib/env.ts:5-28,44,61`
- Modify: `artifacts/portfolio/src/lib/env.ts:5-26`
- Modify: `artifacts/api-server/src/lib/env.ts:159`
- Modify: `artifacts/api-server/scripts/show-admin-emails.mjs:47-50`
- Test: `artifacts/api-server/src/test/env-guards.test.ts` (new)

**Interfaces:**
- Consumes: existing `getEnv()` / `getRawEnv()` accessors.
- Produces: `throw` on missing prod URL/anon key; server accepts only `ADMIN_EMAILS` (no `VITE_` fallback); masked email log `count + ***@domain`.

- [ ] **Step 1: Write the failing test**

```ts
// artifacts/api-server/src/test/env-guards.test.ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
describe("env guards", () => {
  it("replit.md never mentions VITE service-role key", () => {
    const md = fs.readFileSync("replit.md", "utf8");
    expect(md).not.toContain("VITE_SUPABASE_SERVICE_ROLE_KEY");
  });
  it("server env rejects VITE_ADMIN_EMAILS fallback", async () => {
    const src = fs.readFileSync("artifacts/api-server/src/lib/env.ts", "utf8");
    expect(src).not.toContain("VITE_ADMIN_EMAILS");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run artifacts/api-server/src/test/env-guards.test.ts`
Expected: FAIL (replit.md still contains the key, env.ts still has fallback)

- [ ] **Step 3: Write minimal implementation**

```md
<!-- replit.md: delete VITE_SUPABASE_SERVICE_ROLE_KEY rows, replace with: -->
| `SUPABASE_SERVICE_ROLE_KEY` | server-only, api-server env, never `VITE_` prefixed |
```

```ts
// artifacts/admin/src/lib/env.ts: require URL + anon key, throw in prod
if (import.meta.env.PROD && (!parsed.VITE_SUPABASE_URL || !parsed.VITE_SUPABASE_ANON_KEY))
  throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
// remove hardcoded https://portfolio-builder-api-six.vercel.app fallback, return "" + surface config error
```

```ts
// artifacts/api-server/src/lib/env.ts:159 — delete VITE_ADMIN_EMAILS fallback
const raw = get("ADMIN_EMAILS") ?? "";
```

```js
// show-admin-emails.mjs:47-50 — mask
console.log(`admin count=${list.length} domains=${[...new Set(list.map(e=>e.split("@")[1]))].map(d=>"***@"+d).join(",")}`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run artifacts/api-server/src/test/env-guards.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add replit.md artifacts/admin/src/lib/env.ts artifacts/portfolio/src/lib/env.ts artifacts/api-server/src/lib/env.ts artifacts/api-server/scripts/show-admin-emails.mjs artifacts/api-server/src/test/env-guards.test.ts
git commit -m "fix(security): close VITE service-key docs footgun and fail-closed env"
```

---

### Task 2: Envelope Standardization

**Files:**
- Modify: `artifacts/api-server/src/app.ts:126,146`
- Modify: `artifacts/api-server/src/routes/admin/seed.ts:56`
- Modify: `artifacts/api-server/src/routes/admin/users.ts:17,37`
- Modify: `artifacts/api-server/src/lib/collection-query.ts:117,183`
- Modify: `artifacts/api-server/src/middleware/validateUuid.ts:15,29`
- Modify: `artifacts/api-server/src/middleware/errorHandler.ts:23,28,34,54`
- Test: `artifacts/api-server/src/test/envelope-shape.test.ts` (new)

**Interfaces:**
- Consumes: `ok/created/paginated/badRequest/notFound/forbidden/unauthorized/serverError` from `lib/api-response.ts`.
- Produces: all listed routes return canonical envelope; `users` returns `paginated()` shape.

- [ ] **Step 1: Write the failing test**

```ts
// artifacts/api-server/src/test/envelope-shape.test.ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
describe("envelope", () => {
  it("no raw res.status().json in target files", () => {
    for (const f of ["artifacts/api-server/src/app.ts","artifacts/api-server/src/middleware/validateUuid.ts","artifacts/api-server/src/middleware/errorHandler.ts"]) {
      const src = fs.readFileSync(f, "utf8");
      expect(src).not.toMatch(/res\.status\(\d+\)\.json/);
    }
  });
  it("users route uses paginated()", () => {
    const src = fs.readFileSync("artifacts/api-server/src/routes/admin/users.ts", "utf8");
    expect(src).toContain("paginated(");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run artifacts/api-server/src/test/envelope-shape.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
// app.ts:126
import { ok, notFound } from "./lib/api-response.js";
app.get("/api/v1/csrf", (req, res) => ok(res, { csrfToken: generateCsrfToken(req, res) }));
// app.ts:146
app.use((req, res) => notFound(res));
// seed.ts:56
return ok(res, { summary, errors });
// users.ts:17
return unauthorized(res, "Not authenticated");
// users.ts:37
return paginated(res, data ?? [], count ?? 0, limit, offset);
// collection-query.ts:117,183
return paginated(res, data ?? [], count ?? 0, limit, offset);
// validateUuid.ts
return badRequest(res, { userId: ["Invalid userId format — must be a valid UUID"] });
return badRequest(res, { id: ["Invalid id format — must be a valid UUID"] });
// errorHandler.ts
return forbidden(res, "Invalid or missing CSRF token");
return badRequest(res, { _form: [err.message] });
return badRequest(res, { _form: ["Invalid JSON in request body"] });
return serverError(res);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run artifacts/api-server/src/test/envelope-shape.test.ts`
Expected: PASS; also run `pnpm --filter api-server exec vitest run src/test/routes/users.test.ts src/test/routes/seed.test.ts` and update snapshots from `{items,total}` to `{data,pagination}`.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/app.ts artifacts/api-server/src/routes/admin/seed.ts artifacts/api-server/src/routes/admin/users.ts artifacts/api-server/src/lib/collection-query.ts artifacts/api-server/src/middleware/validateUuid.ts artifacts/api-server/src/middleware/errorHandler.ts artifacts/api-server/src/test/envelope-shape.test.ts
git commit -m "fix(api): standardize envelope and pagination shapes"
```

---

### Task 3: Validation Drift Alignment

**Files:**
- Modify: `lib/api-zod/src/admin.ts:93-105` (skill proficiency min 0→1, sort_order range)
- Modify: `lib/validation/src/schemas.ts:27-37` (add experience location+type, certification date)
- Modify: `lib/api-zod/src/admin.ts:107-127` (live_url https decision documented) OR `lib/validation/src/schemas.ts:20-25`
- Test: `lib/api-zod/src/drift-guard.test.ts`, `lib/validation/src/drift-guard.test.ts` (new)

**Interfaces:**
- Consumes: Zod schemas + frontend `RuleFn[]`.
- Produces: matching bounds/messages; shared `CV_MAX_MB=5`, `CV_EXT=".pdf"` const.

- [ ] **Step 1: Write the failing test**

```ts
// lib/api-zod/src/drift-guard.test.ts
import { describe, it, expect } from "vitest";
import { skillSchema } from "./admin.js";
describe("skill bounds", () => {
  it("rejects proficiency 0", () => {
    const r = skillSchema.safeParse({ name: "x", proficiency: 0 });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/api-zod/src/drift-guard.test.ts`
Expected: FAIL (currently min(0) accepts 0)

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/api-zod/src/admin.ts
proficiency: z.coerce.number().int().min(1, "Proficiency must be between 1 and 100").max(100, "Proficiency must be between 1 and 100"),
sort_order: z.coerce.number().int().min(0).max(9999).optional(),
```

```ts
// lib/validation/src/schemas.ts — add to experienceSchema
location: [required("Location")],
type: [required("Type")],
// add to certificationSchema
date: [required("Date")],
```

```ts
// shared const (lib/validation/src/constants.ts new, imported by both cv schemas)
export const CV_MAX_MB = 5;
export const CV_EXT = ".pdf";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/api-zod/src/drift-guard.test.ts lib/validation/src/drift-guard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/api-zod/src/admin.ts lib/validation/src/schemas.ts lib/validation/src/constants.ts lib/api-zod/src/drift-guard.test.ts
git commit -m "fix(validation): align skill/experience/certification bounds and messages"
```

---

### Task 4: Images Scoping + N+1 Fix

**Files:**
- Modify: `artifacts/api-server/src/routes/images.ts:192-260,284-310`
- Modify: `artifacts/api-server/src/lib/user-scope.ts` (fail-closed UUID validation)
- Modify: `artifacts/api-server/src/lib/collection-query.ts:111,156`
- Test: `artifacts/api-server/src/test/routes/images-scope.test.ts` (new)

**Interfaces:**
- Consumes: `resolveTargetUserId(req)`, `getSupabaseClient()`.
- Produces: reorder/delete scoped by `user_id` for non-superadmin; single `.in("id", ids)` ownership check; invalid `userId` → 400 not filter injection.

- [ ] **Step 1: Write the failing test**

```ts
// images-scope.test.ts
import { describe, it, expect } from "vitest";
describe("images scoping", () => {
  it("rejects filter-injection userId", async () => {
    const res = await request(app).get("/api/v1/admin/images?userId=1),user_id.eq.x").set(authHeaders);
    expect(res.status).toBe(400);
  });
  it("non-owner cannot delete image", async () => {
    const res = await request(app).delete(`/api/v1/admin/images/${otherUserImageId}`).set(authHeaders);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api-server exec vitest run src/test/routes/images-scope.test.ts`
Expected: FAIL (200/deleted or 500 instead of 400/404)

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/user-scope.ts — validate inside helper
export function resolveTargetUserId(req: Request) {
  const raw = req.query.userId as string | undefined;
  if (!raw) return req.user!.id;
  if (!isUuid(raw)) throw new BadRequestError("Invalid userId");
  if (!req.user!.isSuperadmin && raw !== req.user!.id) throw new ForbiddenError();
  return raw;
}
```

```ts
// routes/images.ts reorder ownership check — single query
const { data: rows } = await supabase.from("image_metadata").select("id,entity_type,entity_id,user_id").in("id", orderedIds);
if (rows.length !== orderedIds.length) return notFound(res);
if (!isSuperadmin && rows.some(r => r.user_id !== req.user.id)) return notFound(res);
// delete
await supabase.from("image_metadata").delete().eq("id", id).eq("user_id", req.user.id); // non-superadmin
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api-server exec vitest run src/test/routes/images-scope.test.ts src/test/routes/images.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/routes/images.ts artifacts/api-server/src/lib/user-scope.ts artifacts/api-server/src/lib/collection-query.ts artifacts/api-server/src/test/routes/images-scope.test.ts
git commit -m "fix(security): scope image reorder/delete by user and fail-closed userId"
```

---

### Task 5: DB Indexes + RLS + Hot SELECTs

**Files:**
- Create: `supabase/migrations/058_post_audit_perf_rls.sql`
- Modify: `lib/db/src/projects.ts:14,23,99`
- Modify: `lib/db/src/posts.ts:24` (list columns, keep detail `content`)
- Modify: `artifacts/api-server/src/utils/cv-data.ts:41-54`
- Test: `lib/db/src/posts.test.ts` (extend list-projection test)

**Interfaces:**
- Consumes: Supabase tables `projects, experience, certifications, skills, blog_posts, messages, users, image_metadata`.
- Produces: composite indexes, locked-down anon SELECT policies, narrower payloads.

- [ ] **Step 1: Write the failing test**

```ts
// lib/db/src/posts.test.ts — add
it("listPosts selects excerpt columns without content", async () => {
  const rows = await listPosts(supabase);
  expect(Object.keys(rows[0])).not.toContain("content");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/db/src/posts.test.ts`
Expected: FAIL (content present via SELECT *)

- [ ] **Step 3: Write minimal implementation**

```sql
-- 058_post_audit_perf_rls.sql
CREATE INDEX IF NOT EXISTS idx_projects_pub_sort_alive ON projects(is_published, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_experience_pub_sort_alive ON experience(is_published, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_certifications_pub_sort_alive ON certifications(is_published, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_skills_vis_sort_alive ON skills(is_visible, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_pub_alive ON blog_posts(is_published, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status_alive_created ON messages(status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_user_status_alive ON messages(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_image_entity_sort ON image_metadata(entity_type, entity_id, sort_order, created_at);
-- RLS: replace USING(true) with published/alive predicates (example projects; repeat per table)
DROP POLICY IF EXISTS public_read_projects ON projects;
CREATE POLICY public_read_projects ON projects FOR SELECT TO anon, authenticated USING (is_published = TRUE AND deleted_at IS NULL);
```

```ts
// lib/db/src/projects.ts
.select("id,slug,title,description,category,tech_stack,tags,featured,image_url,sort_order,is_published")
// lib/db/src/posts.ts list
.select("id,slug,title,excerpt,cover_image_url,tags,is_published,published_at")
// cv-data.ts — explicit cols + .is("deleted_at", null).eq("is_published", true) + .limit(100)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/db/src/posts.test.ts` + `supabase db reset` locally to apply migration
Expected: PASS, `supabase migration list` shows 058 applied

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/058_post_audit_perf_rls.sql lib/db/src/projects.ts lib/db/src/posts.ts artifacts/api-server/src/utils/cv-data.ts
git commit -m "perf(db): composite indexes, locked RLS, narrow hot selects"
```

---

### Task 6: Frontend Perf + Modularity

**Files:**
- Modify: `artifacts/portfolio/src/pages/Home.tsx:9`
- Modify: `artifacts/portfolio/src/App.tsx:11-12`
- Create: `artifacts/portfolio/src/features/chat/index.ts`
- Create: `artifacts/admin/src/features/ai/index.ts`
- Modify: `artifacts/admin/src/lib/use-entity-query.ts:63,81-118` (MAX_BATCHES cap)
- Delete: `scripts/src/hello.ts`
- Test: `artifacts/admin/src/lib/use-entity-query-cap.test.tsx` (new)

**Interfaces:**
- Consumes: `BackToTop`, `ChatWidget`, `AiTextButton`, `useAllMessages`.
- Produces: lazy-loaded motion path, barrels, capped fetch-all with `hasMore`.

- [ ] **Step 1: Write the failing test**

```tsx
it("useAllMessages caps at MAX_BATCHES and surfaces hasMore", async () => {
  vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ success: true, data: Array(200).fill({}), pagination: { total: 5000, limit: 200, offset: 0, hasMore: true } })));
  const { result } = renderHook(() => useAllMessages(), { wrapper });
  await waitFor(() => expect(result.current.data?.length).toBeLessThanOrEqual(2000));
  expect(result.current.hasMore).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin exec vitest run src/lib/use-entity-query-cap.test.tsx`
Expected: FAIL (fetches unbounded / no hasMore)

- [ ] **Step 3: Write minimal implementation**

```tsx
// Home.tsx
const BackToTop = lazy(() => import("@/components/BackToTop"));
// App.tsx
const ChatWidget = lazy(() => import("@/features/chat").then(m => ({ default: m.ChatWidget })));
// features/chat/index.ts
export { default as ChatWidget } from "./components/ChatWidget";
// features/ai/index.ts
export { default as AiTextButton } from "./components/AiTextButton";
// use-entity-query.ts
const MAX_BATCHES = 10;
for (let b = 0; b < MAX_BATCHES; b++) { /* fetch */ if (batch.length < 200) break; }
return { data, hasMore: batches === MAX_BATCHES };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter admin exec vitest run src/lib/use-entity-query-cap.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add artifacts/portfolio/src/pages/Home.tsx artifacts/portfolio/src/App.tsx artifacts/portfolio/src/features/chat/index.ts artifacts/admin/src/features/ai/index.ts artifacts/admin/src/lib/use-entity-query.ts
git rm scripts/src/hello.ts
git commit -m "perf(frontend): lazy motion path, barrels, cap message fetch-all"
```

---

### Task 7: Test Gaps (db posts + api-zod + admin states)

**Files:**
- Create: `lib/db/src/posts.test.ts` (if missing — extend)
- Create: `lib/api-zod/src/chat.test.ts`, `lib/api-zod/src/cv.test.ts`, `lib/api-zod/src/theme-presets.test.ts`
- Create: `artifacts/admin/src/features/analytics/analytics.states.test.tsx`
- Test: same files

**Interfaces:**
- Consumes: `listPosts`, `chatSchema`, `cvSettingsUpdateSchema`, analytics page.
- Produces: CRUD + is_published filter + exact-message assertions + loading/error/empty tests.

- [ ] **Step 1: Write the failing test**

```ts
// lib/api-zod/src/chat.test.ts
import { describe, it, expect } from "vitest";
import { chatSchema } from "./chat.js";
describe("chat schema", () => {
  it("rejects empty messages", () => {
    const r = chatSchema.safeParse({ messages: [] });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/api-zod/src/chat.test.ts`
Expected: FAIL (file missing)

- [ ] **Step 3: Write minimal implementation**

```ts
// add the three test files with accept/reject + exact message assertions
// analytics.states.test.tsx — mirror SkillsManager.states pattern with real api-client + stubGlobal fetch:
// loading skeleton, error + retry, empty CTA
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/api-zod/src/chat.test.ts lib/api-zod/src/cv.test.ts lib/api-zod/src/theme-presets.test.ts lib/db/src/posts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/db/src/posts.test.ts lib/api-zod/src/chat.test.ts lib/api-zod/src/cv.test.ts lib/api-zod/src/theme-presets.test.ts artifacts/admin/src/features/analytics/analytics.states.test.tsx
git commit -m "test: close db posts, api-zod, and analytics state gaps"
```

---

### Task 8: Rate-Limit Hardening

**Files:**
- Modify: `artifacts/api-server/src/middleware/rateLimiter.ts:9,23-94`
- Modify: `artifacts/api-server/src/lib/env.ts:105-110,218`
- Test: `artifacts/api-server/src/test/rate-limit-guards.test.ts` (new)

**Interfaces:**
- Consumes: `env.DISABLE_RATE_LIMIT`, `env.IS_PRODUCTION`, `int()` parser.
- Produces: per-request skip evaluation, clamped int parsing, tight anonymous-auth limiter, Redis-store hook with startup warning.

- [ ] **Step 1: Write the failing test**

```ts
describe("rate limit guards", () => {
  it("clamps CONTACT_RATE_LIMIT_MAX to >=1", async () => {
    const { int } = await import("../lib/env.js");
    expect(int("CONTACT_RATE_LIMIT_MAX", 5, { min: 1, max: 1000 })).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api-server exec vitest run src/test/rate-limit-guards.test.ts`
Expected: FAIL (int() has no clamp args)

- [ ] **Step 3: Write minimal implementation**

```ts
// env.ts
export function int(key: string, def: number, opts?: { min: number; max: number }) {
  const v = parseInt(get(key) ?? "", 10);
  if (Number.isNaN(v)) return def;
  return Math.min(opts?.max ?? 1000, Math.max(opts?.min ?? 1, v));
}
// rateLimiter.ts — evaluate per-request, add store hook
skip: (req) => env.DISABLE_RATE_LIMIT && !env.IS_PRODUCTION,
...(process.env.REDIS_URL ? { store: new RedisStore(...) } : {}),
if (!process.env.REDIS_URL && env.IS_PRODUCTION) logger.warn("rate-limit per-instance only");
// tight anon auth limiter on /admin/verify + login routes: 10/15min
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api-server exec vitest run src/test/rate-limit-guards.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/middleware/rateLimiter.ts artifacts/api-server/src/lib/env.ts artifacts/api-server/src/test/rate-limit-guards.test.ts
git commit -m "fix(security): clamp rate-limit env, per-request skip, anon auth limiter"
```
