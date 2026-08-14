# Portfolio-Fixer — Memory Bank

> **Last Updated:** 2026-06-06
> **Audit Score:** 84/100 (master audit conducted 2026-06-05, JWT fix applied 2026-06-06)
> **Current Test Count:** 301 passing across 53 admin + 33 api-server + 35 portfolio files
> **Project:** Portfolio-Fixer — pnpm monorepo (3 artifacts, 7 shared libs)
> **Primary Dev:** Mustafa Sayed (Data Engineer, Cairo, Egypt)
> **Stack:** React 19 · Vite 7 · TailwindCSS v4 · Supabase · Express 5 · Clerk · pnpm

---

## 1. Project Purpose

Portfolio-Fixer is a full-stack portfolio CMS. The public portfolio SPA (`artifacts/portfolio`) showcases Mustafa's skills, projects, experience, and certifications to recruiters. The admin dashboard (`artifacts/admin`) is a Clerk-authenticated CMS for managing all portfolio content. The Express 5 API server (`artifacts/api-server`) handles CV generation, image uploads, contact form ingestion, and admin CRUD operations. Supabase (PostgreSQL) is the database and storage backend.

---

## 2. Monorepo Structure

```
Portfolio-Fixer/
├── artifacts/
│   ├── portfolio/        # Public SPA — Vite + React 19 (port 5173)
│   ├── admin/            # Admin CMS — Vite + React 19 + Clerk (port 5174)
│   └── api-server/       # Express 5 REST API (port 3001)
├── lib/
│   ├── supabase/         # @workspace/supabase — client/server/admin factories + types
│   ├── db/               # @workspace/db — 14 entity data-access modules
│   ├── validation/       # @workspace/validation — Zod schemas
│   ├── api-zod/          # @workspace/api-zod — API response Zod schemas
│   ├── api-spec/         # @workspace/api-spec — OpenAPI 3.1 spec (partial)
│   ├── auth/             # @workspace/auth — AuthContext + useAuthUser
│   ├── logging/          # @workspace/logging — logDebug/logWarn/logError
│   ├── ui/               # @workspace/ui — 56 Radix UI primitives + hooks
│   ├── api-client-react/ # @workspace/api-client-react — generated TanStack hooks
│   └── integrations/     # External integrations (if any)
├── docs/                 # 39 markdown files + 3 decisions
├── e2e/                  # 9 Playwright spec files + auth.setup.ts
├── supabase/             # config.toml + 43 migrations
├── scripts/              # generate-sitemap.ts, verify-migrations.ts
└── specs/                # Specification files
```

---

## 3. Dependencies between modules

| Package                 | Depends On                            |
| ----------------------- | ------------------------------------- |
| `@workspace/portfolio`  | supabase, db, logging, ui, validation |
| `@workspace/admin`      | auth, logging, supabase, ui           |
| `@workspace/api-server` | api-zod, supabase                     |
| `@workspace/db`         | supabase                              |
| `@workspace/supabase`   | logging                               |
| `@workspace/ui`         | validation (devDep)                   |

> Admin does NOT depend on `@workspace/db` — it uses `@/lib/api-client` to call the API server.

---

## 4. Authentication Architecture

The auth system has been hardened over multiple iterations. Current architecture:

### Layers

1. **AdminProviders** — mounts `ClerkProvider` + `ClerkAuthBridge`
2. **ClerkAuthBridge** (`components/ClerkAuthBridge.tsx`) — sets token getter with JWT template, arms `setAuthReady` gate, registers auth-missing handler
3. **ProtectedRoute** (`components/ProtectedRoute.tsx`) — renders children only when Clerk confirms `isSignedIn && isAdmin`
4. **SignInPage** (`components/SignInPage.tsx`) — Clerk `<SignIn>` wrapper with `forceRedirectUrl`
5. **auth-token.ts** (module singleton) — manages token retrieval, JWT expiration check, auth-missing detection, kill switch

### Auth file structure (split from former 375-line auth.tsx)

```
features/auth/
  components/
    constants.ts        — POST_SIGN_IN_URL, SIGN_IN_URL, BUNDLE_VERSION, ADMIN_EMAILS
    diag.ts             — Diagnostic logging helper [auth-guard]
    ClerkAuthBridge.tsx — Clerk session management + auth-ready gate + handler registration
    ProtectedRoute.tsx  — Route guard + bfcache defense
    SignInPage.tsx      — Clerk <SignIn> wrapper + redirect
    AdminProviders.tsx  — Composition root (ClerkProvider + ClerkAuthBridge)
    index.ts            — Barrel re-exports
```

### Key state machine

```
Clerk hydrating → authReady=false, handler suppressed
Clerk loaded (signed out) → authReady=false, ProtectedRoute redirects to /sign-in
Clerk loaded (signed in) → authReady=true, handler armed, Pass to children
API call succeeds → token returned, request proceeds
API returns 401 → force-refresh token → retry once → second 401 → fireAuthMissing → sign out
Client-side JWT expired → isTokenLikelyValid() rejects → no request sent → handler fires
```

### JWT expiration handling (2026-06-06)

- `isJwtExpired(token)` decodes the JWT payload and checks `exp` with a 30-second buffer
- `isTokenLikelyValid()` calls `isJwtExpired()` — expired tokens are rejected before the request is sent
- `getClerkToken(forceRefresh)` supports a `forceRefresh` parameter for 401 auto-refresh
- `doFetch()` in api-client.ts force-refreshes token and retries once on 401 before firing auth-missing

### Security controls

| Control              | Location          | Purpose                                          |
| -------------------- | ----------------- | ------------------------------------------------ |
| Auth-ready gate      | `auth-token.ts`   | Prevents handler firing before Clerk loads       |
| Kill switch          | `auth-token.ts`   | Emergency no-op for the handler                  |
| bfcache defense      | `ProtectedRoute`  | Reloads page on bfcache restore                  |
| JWT template         | `ClerkAuthBridge` | Includes email claim in token                    |
| Server-401 detection | `api-client.ts`   | Fires handler on genuine session expiry          |
| JWT expiration check | `auth-token.ts`   | `isJwtExpired()` checks `exp` with 30s buffer    |
| 401 auto-refresh     | `api-client.ts`   | Force-refresh token and retry once on 401        |
| Force refresh        | `auth-token.ts`   | `getClerkToken(true)` bypasses stale token cache |
| Handler no-cleanup   | `ClerkAuthBridge` | Prevents gap in handler during re-render         |

### Rate limiters

| Limiter              | Max | Window |
| -------------------- | --- | ------ |
| generalLimiter       | 100 | 15 min |
| adminLimiter         | 200 | 15 min |
| contactLimiter       | 5   | 1 hour |
| imageMetadataLimiter | 60  | 1 min  |
| imageUploadLimiter   | 10  | 1 min  |
| apiKeyLimiter        | 50  | 15 min |

---

## 5. Critical Configuration

### Environment variables (admin app)

| Variable                     | Required | Notes                                                        |
| ---------------------------- | -------- | ------------------------------------------------------------ |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes      | From Clerk Dashboard                                         |
| `VITE_CLERK_JWT_TEMPLATE`    | No       | Default: `admin`. Must match JWT template in Clerk Dashboard |
| `ADMIN_EMAILS`               | Yes      | Comma-separated admin email allowlist                        |
| `VITE_API_URL`               | Yes      | API server URL (default: `http://localhost:3002`)            |
| `VITE_SUPABASE_URL`          | Yes      | Supabase project URL                                         |

### Environment variables (api-server)

| Variable                    | Required | Notes                                      |
| --------------------------- | -------- | ------------------------------------------ |
| `SUPABASE_URL`              | Yes      | Supabase project URL                       |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Server-only, bypasses RLS                  |
| `CLERK_SECRET_KEY`          | Yes\*    | Required for production                    |
| `CSRF_SECRET`               | Yes      | Random 64-char hex, `openssl rand -hex 32` |
| `CLERK_ISSUER`              | No       | e.g., `https://xxx.clerk.accounts.dev`     |

### JWT template in Clerk Dashboard

Must create a template named `admin` (or match `VITE_CLERK_JWT_TEMPLATE`) with:

- Key: `email`
- Value: `{{user.primary_email_address}}`

### Database RLS

The `is_admin()` function uses `auth.jwt() ->> 'email'` with `app.admin_emails` GUC.
Set admin emails via:

```sql
ALTER DATABASE postgres SET app.admin_emails = 'admin1@example.com,admin2@example.com';
```

---

## 6. Test Suite Status

| Area       | Files   | Tests             | Status                              |
| ---------- | ------- | ----------------- | ----------------------------------- |
| admin      | 53      | 287               | ✅ All passing (2026-06-05)         |
| api-server | 33      | 270               | ✅ All passing                      |
| portfolio  | 35      | (included in 287) | ✅ All passing                      |
| E2E        | 9 specs | —                 | ✅ auth.setup + specs               |
| Typecheck  | —       | —                 | ✅ Clean (2026-06-05)               |
| Lint       | —       | —                 | ✅ 0 errors, 1 pre-existing warning |

---

## 7. Deployment Notes

- Portfolio and Admin are deployed to Vercel as SPAs
- API server is deployed to Render as an Express web service
- Supabase project with 43 migrations, 7 storage buckets
- All storage bucket policies were hardened in migration 037 to use `is_admin()`
- Health check at `GET /api/healthz` (not `/api/v1/healthz`)
- Health check supports HEAD method (preferred by Docker/k8s)
- Must set `app.admin_emails` GUC at database level after migration 042

---

## 8. Known Issues / Tech Debt

1. **No admin_emails table** — GUC-based RLS is fragile (single-point-of-failure on `ALTER DATABASE`)
2. **Hand-written types** (`lib/supabase/src/types.ts`, 1170 lines) — not auto-generated, drifts from migrations 039-043
3. **`route-helpers.ts` 267 lines** — approaching God File threshold
4. **`useEntityQuery` lacks mutation cache invalidation** — mutations rely on manual `refetch()`
5. **9 E2E specs but none cover the full admin CRUD lifecycle** — only smoke/integration
6. **`ViewingUserProvider` has zero unit tests** — untested critical path for superadmin workflows
7. **`image_metadata.entity_id` FK is projects-only** — other entity types use NULL (polymorphic anti-pattern)
8. **`@workspace/auth` has no `sideEffects: false`** — tree-shaking miss
