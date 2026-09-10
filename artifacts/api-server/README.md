# Portfolio API Server

Express + Supabase backend for the portfolio + admin apps. Owns the
public contact form, admin CRUD endpoints, CV generation, image
metadata, and `/healthz`.

## Quick start

```bash
# From the workspace root
pnpm install
cp .env.example .env       # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CSRF_SECRET
pnpm --filter @workspace/api-server dev
```

The server boots on `PORT` (default `3001`).

## Verification

API-only checks (typecheck + tests + build) live in a single command:

```bash
pnpm --filter @workspace/api-server verify
```

This is what CI runs. It is the canonical "is this server ready to ship"
check.

Individual steps:

| Command              | What it does                            |
| -------------------- | --------------------------------------- |
| `pnpm typecheck`     | `tsc --noEmit` against the API tsconfig |
| `pnpm test`          | Runs the full Vitest suite (236 tests)  |
| `pnpm test:watch`    | Vitest in watch mode                    |
| `pnpm test:coverage` | Vitest with coverage report             |
| `pnpm build`         | esbuild bundle to `dist/index.mjs`      |
| `pnpm start`         | Run the built bundle                    |
| `pnpm verify`        | typecheck + test + build (the CI gate)  |
| `pnpm lint`          | Reserved for future linter integration  |

## Environment

All env access goes through `src/lib/env.ts`. Required at startup:

| Var                         | Purpose                              |
| --------------------------- | ------------------------------------ |
| `SUPABASE_URL`              | Supabase project URL                 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role JWT (admin)    |
| `CSRF_SECRET`               | Secret for double-submit CSRF tokens |

Optional but commonly used:

| Var                                                          | Purpose                                                                                                          |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `CLERK_SECRET_KEY`                                           | Enables Clerk JWT verification                                                                                   |
| `CLERK_ISSUER`                                               | Clerk issuer (optional)                                                                                          |
| `ADMIN_API_KEY`                                              | X-Admin-Key bypass for non-browser auth                                                                          |
| `ADMIN_EMAILS`                                               | Comma-separated allowlist of admin emails (server-only; do not use a `VITE_` prefix)                             |
| `VITE_SITE_URL` / `VITE_ADMIN_URL`                           | CORS allowed origins                                                                                             |
| `VERCEL_URL`                                                 | Auto-added CORS origin on Vercel                                                                                 |
| `PORT`                                                       | Server port (default 3001)                                                                                       |
| `DISABLE_RATE_LIMIT`                                         | `true` disables all rate limiters (dev)                                                                          |
| `LOG_LEVEL`                                                  | pino log level (default `info`)                                                                                  |
| `AI_API_KEY`                                                 | Groq API key (free at console.groq.com) — enables the AI chatbot, writing helper, and spam scoring (server-only) |
| `AI_BASE_URL` / `AI_MODEL`                                   | OpenAI-compatible endpoint (default `https://api.groq.com/openai/v1`) and model (`llama-3.3-70b-versatile`)      |
| `AI_SPAM_MODEL`                                              | Model used for spam classification (default `llama-3.3-70b-versatile`)                                           |
| `AI_CHAT_ENABLED` / `AI_WRITING_ENABLED` / `AI_SPAM_ENABLED` | Feature toggles (spam defaults to `false`)                                                                       |
| `AI_SPAM_THRESHOLD`                                          | Score at/above which a message is quarantined as spam (default 75)                                               |

The server `process.exit(1)` at boot if any required var is missing in
non-test environments. Tests can override values via `_setOverride()`.

## Architecture

```
src/
  index.ts            # Boot: validate env, start HTTP server, graceful shutdown
  app.ts              # Express app: helmet, CORS, JSON, CSRF, rate limit, /api/v1
  preload-env.ts      # Boot-time .env loader (runs before any other module)

  lib/
    env.ts            # Centralised env validation (typed accessors)
    supabase-client.ts # Lazy Supabase client (created on first use)
    api-response.ts   # Response helpers: ok(), created(), notFound(), serverError(), etc.
    route-helpers.ts  # Shared pagination, user-scoping, error-logging helpers
    logger.ts         # pino logger
    singleton-upsert.ts # Settings-table upsert helper

  middleware/
    adminAuth.ts      # Auth: Clerk JWT OR x-admin-key (superadmin only)
    rateLimiter.ts    # general / contact / admin / image / apiKey limiters
    csrf.ts           # double-submit cookie CSRF
    errorHandler.ts   # Global error handler (logs route context)
    validate.ts       # Zod body validation
    validateUuid.ts   # UUID param/query validators
    requireSuperadmin.ts

  routes/
    health.ts         # GET/HEAD /healthz (mounted at /api and /api/v1, uncached liveness)
    cv.ts             # CV download (PDF)
    images.ts         # Image upload + metadata
    v1/index.ts       # v1 router (mounts admin, public, health, etc.)
    admin/            # All /admin/* routes (require auth)
    public/chat.ts    # POST /chat + GET /chat/config (public, rate limited)
    public/contact.ts # POST /contact (public, rate limited, honeypot)
    admin/ai.ts       # POST /admin/ai/generate + /improve (real LLM writing helper)

  lib/ai/
    client.ts         # Provider-agnostic chat-completions client (plain fetch)
    prompts.ts        # Chat / writing / spam prompt templates
    context.ts        # "About the owner" site-content builder (cached)
    spam.ts           # Spam classification + quarantine of flagged messages
```

## AI

All AI calls proxy through this server (the provider key never reaches the
browser). Backed by any OpenAI-compatible endpoint — Groq (free tier) by
default (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`).

- **Chatbot** — `POST /api/v1/chat` answers visitors **only about the site
  owner**, grounded in the live site content (`lib/ai/context.ts`).
  `GET /api/v1/chat/config` reports whether it is enabled.
- **Writing helper** — `POST /api/v1/admin/ai/generate` and `/improve` power
  the admin "✨ Improve" buttons on text fields.
- **Spam scoring** — when `AI_SPAM_ENABLED=true`, accepted contact messages
  are classified fire-and-forget; high scores set `is_spam` (quarantined in the
  admin "Spam" tab), never deleted.

When `AI_API_KEY` is unset all features no-op (`/chat/config` returns
`enabled: false`, chat/admin AI return 503, spam is skipped).

## API conventions

All responses follow the same shape:

```json
{ "success": true,  "data": ... }              // 2xx
{ "success": false, "message": "..." }          // 4xx/5xx
{ "success": false, "errors": { field: [...] } // 400 validation
```

Helpers live in `src/lib/api-response.ts`. New routes should import
those instead of constructing `res.status(500).json(...)` inline.

### Auth

- **Public routes** (`/api/healthz` and `/api/v1/healthz`, `/contact`, `/cv`, `/images`): no auth
- **Admin routes** (everything under `/api/v1/admin/*`): require
  - `Authorization: Bearer <clerk_jwt>` (verified against `CLERK_SECRET_KEY`) AND
    email in `ADMIN_EMAILS`, **or**
  - `x-admin-key: <ADMIN_API_KEY>` (machine-to-machine)

  Admin JWTs map to a row in `users` (auto-provisioned on first login).

### Rate limits

| Route group              | Limit   | Window | Skip if                                   |
| ------------------------ | ------- | ------ | ----------------------------------------- |
| `/api/v1/*`              | 100 req | 15 min | `DISABLE_RATE_LIMIT=true`                 |
| `/contact`               | 5 req   | 1 hour | `DISABLE_RATE_LIMIT=true`                 |
| `/chat`                  | 20 req  | 15 min | `DISABLE_RATE_LIMIT=true`                 |
| `/admin/*`               | 200 req | 15 min | `DISABLE_RATE_LIMIT=true`                 |
| `/images`                | 60 req  | 1 min  | `DISABLE_RATE_LIMIT=true`                 |
| `/admin/*` (x-admin-key) | 50 req  | 15 min | only when `x-admin-key` header is present |

### CSRF

Admin mutating routes (POST/PUT/PATCH/DELETE) require a valid
double-submit cookie. The CSRF token is fetched from
`GET /api/v1/csrf-token`.

## Testing

407 tests across 48 files. Key test categories:

- `test/middleware/` — auth, rate limit, CSRF, error handling
- `test/routes/` — one file per route module
- `test/global-error.test.ts` — global error handler
- `test/contact.test.ts` — public contact form
- `test/routes/collection-404.test.ts` — 404 regression (TASK-010)

Run a single test file:

```bash
pnpm --filter @workspace/api-server test -- src/test/routes/skills.test.ts
```

## Deployment

- Build: `pnpm --filter @workspace/api-server build`
- Output: `dist/index.mjs` (ESM bundle, source-mapped)
- Start: `node --enable-source-maps ./dist/index.mjs`
- Health check: `GET /api/v1/healthz` (also served at `/api/healthz`; returns 200 with
  `{ status: "ok", timestamp, uptime, environment }` while the process is alive — it is a pure
  liveness check and never returns 503)

Deploy to Vercel via the workspace `vercel.json` (the API server runs
as a serverless function).

---

## Recent reliability fixes (2026-06-01)

A 12-task batch plan landed to tighten the API server. All changes are
covered by the test suite (236 tests, 0 failures).

| Area              | What changed                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reliability       | `getSupabaseClient()` is no longer called at module import time in any route — it now runs inside the handler, so missing env vars surface with a clear error at first request, not at boot                                                  |
| Health check      | `/healthz` now uses `.maybeSingle()` against `site_settings` so an empty table no longer marks the DB unhealthy                                                                                                                              |
| Auth / Rate limit | `apiKeyLimiter` already correctly skipped when `x-admin-key` was absent (`skip: (req) => !req.headers["x-admin-key"]`); confirmed no change needed for Clerk users                                                                           |
| Data correctness  | All `PUT /:id` and `DELETE /:id` collection routes now call `.select("id")` and return **404** when the row doesn't exist (or the user doesn't own it) — was previously returning 200 for `DELETE` and silently 200 for `PUT` even on 0 rows |
| Public contact    | Added honeypot (`website` field), 2-second time-trap (`_formLoadedAt` timestamp), input normalization (trim + lowercase email + strip control chars), and structured abuse logging — origin-only check was insufficient                      |
| Error shape       | Standardised on `{ success, message }` / `{ success, errors }`; added `forbidden()`, `unauthorized()`, `rateLimited()` helpers; rate limiters now use `message` not `error`                                                                  |
| Architecture      | New `src/lib/route-helpers.ts` with `parsePagination`, `resolveTargetUserId`, `logSupabaseError`, and `runCollectionQuery` — 5 collection GET handlers refactored to a single one-liner each                                                 |
| TypeScript        | `singletonUpsert` `any` cast is now confined to a local `_call()` helper inside the function, instead of leaking through the whole client                                                                                                    |
| Env validation    | New `src/lib/env.ts` replaces ad-hoc `process.env` reads with typed accessors, startup validation (calls `process.exit(1)` if required vars missing in non-test), and a `_setOverride()` test hook                                           |
| Tests             | New `src/test/routes/collection-404.test.ts` (14 tests) covers the 404-on-missing-row behavior for every collection route                                                                                                                    |
| Logging           | `errorHandler` and `logSupabaseError` capture route context (`route`, `method`, `ip`, `userId`, `targetTable`, `targetId`) — never the request body (PII)                                                                                    |
| DX                | `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`, and `pnpm verify` scripts (the last one runs typecheck + test + build — what CI uses)                                                                                                  |

### 2026-06-01 follow-up improvements

| Area                 | What changed                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth resilience      | `syncUserFromClerk` now wraps all 3 Supabase calls in `withRetry` (3 attempts, exponential backoff 100→200→400ms with ±30% jitter). Only retries on transient errors (5xx, 408/429, network, transient PostgREST codes); 4xx and business-rule violations throw immediately. New `src/lib/retry.ts` (110 lines) + 14 unit tests.                                                                     |
| API client stability | `lib/logging` was an orphan (0 consumers). Both `portfolio/src/lib/logger.ts` and `admin/src/lib/logger.ts` now re-export from `@workspace/logging` with Vite-aware env injection. **Also fixed a silent bug in the admin logger** — it was using `if (import.meta.env.DEV) console.*` for everything, meaning the production build emitted **nothing** to logs. Now prod logs go to stdout as JSON. |

### 404 on missing rows — the contract

Every `PUT /:id` and `DELETE /:id` collection route now follows the same pattern:

```typescript
const { error, count } = await withRetry(
  () =>
    supabase
      .from(table)
      .update(result.data)
      .eq("id", req.params.id)
      .eq("user_id", req.user!.id) // or omitted for superadmin
      .select("id"), // <-- this is the key
  { opName: "updateById", maxAttempts: 3 },
);

if (error) return serverError(res, error.message);
if (!count || count === 0) return notFound(res, "<Resource> not found");
return ok(res, null);
```

Clients can now rely on `404` to distinguish "you don't have access"
or "row doesn't exist" from "the update succeeded". And the update
will be retried automatically on transient Supabase outages.

### Contact abuse controls (cheat sheet)

The `POST /api/v1/contact` endpoint silently drops requests that fail any of:

- Origin missing in production (403)
- Origin not in `VITE_SITE_URL` / `VITE_ADMIN_URL` allowlist (403)
- `website` honeypot field non-empty (200 — looks like success to the bot)
- `_formLoadedAt` timestamp is < 2 seconds old (200 — same)
- `_formLoadedAt` is > 1 hour old (400 — stale form)
- Per-IP rate limit exceeded (5/hour)

All rejection paths are logged via `logAbuse()` with IP, UA, origin, and
the rejection reason — but **not** the message content (PII).

### Retry helper (2026-06-01 add)

```typescript
import { withRetry, isTransientError } from "../lib/retry";

// Auto-retries on 5xx, 408, 429, network errors, and transient PostgREST
// codes. Does NOT retry on 4xx (auth, permission, not found, etc.).
const result = await withRetry(
  () => supabase.from("users").select("id, email, role").eq("id", id).single(),
  { opName: "userLookup", maxAttempts: 3, baseDelayMs: 100 },
);
```

Transient error detection:

```typescript
isTransientError({ status: 503 }); // true
isTransientError({ status: 401 }); // false
isTransientError({ code: "23505" }); // false (unique violation)
isTransientError({ code: "57014" }); // true  (statement timeout)
isTransientError({ message: "fetch failed" }); // true
isTransientError({ message: "ECONNRESET" }); // true
```
