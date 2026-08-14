# Security Posture

This document captures the runtime security controls in place across the
three apps. It is the source of truth for "what defends what" — if a
control changes, update this file in the same PR.

## Defense layers

```
                ┌──────────────────────────────────┐
                │  Browser (Portfolio / Admin)    │
                │  - Helmet (api-server responses)│
                │  - CSP meta tag (per index.html)│
                │  - `color-scheme` for native UI  │
                │  - `format-detection: telephone  │
                │    no` to prevent auto-linking   │
                │  - `referrer-policy` header      │
                └─────────────┬────────────────────┘
                              │  HTTPS
                ┌─────────────▼────────────────────┐
                │  Vercel Edge                    │
                │  - HSTS (max-age=31536000)     │
                │  - TLS termination              │
                └─────────────┬────────────────────┘
                              │
                ┌─────────────▼────────────────────┐
                │  api-server (Express 5)        │
                │  ┌─ helmet (CSP, COOP, CORP)    │
                │  ├─ cors (allowlist)            │
                │  ├─ compression                 │
                │  ├─ cookieParser                │
                │  ├─ json/urlencoded (1MB cap)   │
                │  ├─ request ID tracking         │
                │  ├─ pino-http (redacted PII)     │
                │  ├─ generalLimiter  100/15min   │
                │  ├─ adminLimiter    200/15min   │
                │  ├─ contactLimiter    5/hr      │
                │  ├─ imageMetaLimiter 60/min     │
                │  ├─ imageUploadLimiter 10/min   │
                │  ├─ apiKeyLimiter     50/15min   │
                │  ├─ csrf (double-submit)        │
                │  ├─ adminAuth (Clerk JWT + API   │
                │  │   key + syncUserFromClerk)   │
                │  └─ errorHandler (no body leak)  │
                └─────────────┬────────────────────┘
                              │  service-role key
                ┌─────────────▼────────────────────┐
                │  Supabase (PostgreSQL + Storage)│
                │  - RLS on every public table    │
                │  - is_admin() via auth.jwt()    │
                │  - Storage policies per-bucket   │
                │    (admin-only mutations)       │
                └──────────────────────────────────┘
```

## Content Security Policy

Three independent CSP layers, scoped to each app:

1. **api-server** (`src/app.ts`) — `helmet()` middleware with
   `useDefaults: false` and a strict JSON-server policy. `'unsafe-inline'`
   styles are only allowed in dev.
2. **portfolio** (`artifacts/portfolio/index.html`) — `<meta>` tag with
   allowlists for Supabase (REST + Realtime), Google Fonts, and the
   OpenStreetMap iframe (for `ContactInfoPanel`).
3. **admin** (`artifacts/admin/index.html`) — `<meta>` tag with
   allowlists for Supabase, Clerk (`*.clerk.com`, `*.clerk.accounts.dev`,
   `clerk.com`, `clerk.accounts.dev`), and Google Fonts.

All three set `frame-ancestors 'none'` and `object-src 'none'`.

### Production migration to nonces

The current `script-src` for api-server and the two SPAs is
`'self' 'unsafe-inline'`. `'unsafe-inline'` is **required** by Vite-injected
`<script type="module">` and by React 19's hydration helpers. To remove
it, we would need to:

1. Configure Vite to emit a CSP nonce per request.
2. Replace each inline `<script>` with the nonce attribute.
3. Migrate the JSON-LD `<script type="application/ld+json">` blocks
   (currently inlined by `SEO.tsx` via `createPortal`) to data attributes
   that a runtime helper converts to JSON-LD.

That is a follow-up task — see `TECHNICAL_DEBT_REPORT.md`.

## Authentication

| Surface             | Mechanism                                                         | Where                                                         |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| Public portfolio    | None (intentional)                                                | —                                                             |
| Public contact POST | Honeypot + time-trap + rate limit + origin check                  | `public/contact.ts`                                           |
| Admin sign-in       | Clerk JWT template (includes email claim)                         | `lib/auth/src/index.tsx` + `admin/src/features/auth/auth.tsx` |
| Admin API           | Clerk JWT verified server-side + email allowlist (`ADMIN_EMAILS`) | `middleware/adminAuth.ts`                                     |
| API key             | `timingSafeEqual` constant-time compare                           | `middleware/adminAuth.ts`                                     |
| CV download         | Public (anon)                                                     | `routes/cv.ts` (with `is_published` gate on settings)         |

The api-server's `getDefaultAdminUser()` provisions the API-key user with
`role: "user"` (not `superadmin`) by default. Run
`pnpm --filter @workspace/api-server run promote-superadmin -- <email>`
to elevate when truly needed.

### Auth-Missing Handler & Kill Switch

The frontend auth layer (`auth-token.ts` — split into `ClerkAuthBridge.tsx`, `ProtectedRoute.tsx`, `SignInPage.tsx`, `AdminProviders.tsx`) includes a multi-layer defense:

1. **Auth-ready gate** (`setAuthReady`): prevents the auth-missing handler
   from firing before Clerk confirms `isLoaded && isSignedIn`. The handler
   only fires when we have positive evidence the user WAS authenticated
   and suddenly isn't.
2. **Debounce (1s)**: a burst of failed API calls collapses into a single
   sign-out event.
3. **Kill switch** (`AUTH_MISSING_KILL_SWITCH`): compile-time flag (default:
   `false`) that makes `fireAuthMissing` a no-op. Only flip to `true` if
   false-positive sign-outs occur.
4. **bfcache defense**: `pageshow` listener with `event.persisted` check
   forces a full page reload when the browser restores from back-forward
   cache, ensuring Clerk re-validates the session.

## Rate limiting

| Bucket                 | Window | Max | Applies to                        |
| ---------------------- | ------ | --- | --------------------------------- |
| `generalLimiter`       | 15 min | 100 | All `/api/v1/*`                   |
| `adminLimiter`         | 15 min | 200 | `/api/v1/admin/*` (second line)   |
| `contactLimiter`       | 1 hour | 5   | `POST /api/v1/contact`            |
| `imageMetadataLimiter` | 1 min  | 60  | `GET /api/v1/images/:id/metadata` |
| `imageUploadLimiter`   | 1 min  | 10  | `POST /api/v1/images/upload`      |
| `apiKeyLimiter`        | 15 min | 50  | `X-Admin-Key` only                |

Set `DISABLE_RATE_LIMIT=true` to bypass (dev only — guarded by a
warning log).

## Row Level Security (RLS)

Every public table has RLS enabled. The `is_admin()` function:

- Prefers the Supabase-native `auth.jwt() ->> 'email'`.
- Falls back to the legacy `request.jwt.claims` GUC **only** when the
  GUC `app.allow_guc_admin_fallback` is `'on'` (default: OFF).
- Compares against the `app.admin_emails` setting; if missing, the
  function returns FALSE (deny by default).
- The admin email list is set at the database level:
  ```sql
  ALTER DATABASE postgres SET app.admin_emails = 'email1@example.com,email2@example.com';
  ```

Storage buckets follow the same pattern: separate policies for INSERT,
UPDATE, and DELETE, each gated by `is_admin()`. All storage bucket
policies were hardened in migration 037 to use `is_admin()` instead
of the too-permissive `auth.role() = 'authenticated'`.

### Tables with Filtered Public Read

| Table              | Condition                                    |
| ------------------ | -------------------------------------------- |
| `skills`           | `is_visible = true AND deleted_at IS NULL`   |
| `projects`         | `is_published = true AND deleted_at IS NULL` |
| `experience`       | `is_published = true AND deleted_at IS NULL` |
| `certifications`   | `is_published = true AND deleted_at IS NULL` |
| `section_settings` | `is_visible = true`                          |

All other content tables (hero_content, about_content, contact_info, theme_settings, etc.) allow public SELECT without filters.

## CSRF

Double-submit cookie via `csrf-csrf`. Secret comes from `CSRF_SECRET`
(validated at startup). The session identifier is `IP + User-Agent`
for all routes.

CSRF tokens are fetched on every mutating request by `admin/src/lib/api-client.ts`.

## Secrets handling

- **Never** prefix a server-only secret with `VITE_` (it gets inlined
  into the client bundle).
- `.env.example` documents the canonical key list; `.env` and
  `.env.local` are gitignored.
- The api-server validates required env vars at boot (`env.validate()`)
  and exits 1 with an actionable error if anything is missing.
- `SUPABASE_SERVICE_ROLE_KEY` is only used server-side (api-server).
  The frontend admin app never has access to it.
- `CLERK_SECRET_KEY` is only used server-side for JWT verification.

## What to check before deploying

- [ ] `CSRF_SECRET` is a random 64-char hex string (not the dev default).
- [ ] `VITE_API_URL` and `VITE_SITE_URL` are set in the Vercel project.
- [ ] `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` match the target project.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is **server-only** and only on the api-server.
- [ ] `CLERK_ISSUER` is set if Clerk is configured for a custom issuer.
- [ ] `DISABLE_RATE_LIMIT` is unset in production.
- [ ] A JWT template named `admin` exists in Clerk Dashboard with the `email` claim.
- [ ] `VITE_CLERK_JWT_TEMPLATE` matches the template name in Clerk Dashboard.
- [ ] RLS is enabled on every table (`SELECT * FROM pg_tables WHERE
rowsecurity = false;` should return 0 rows in `public`).
- [ ] The `app.admin_emails` GUC is set at the database level.
- [ ] The TestSprite / TestSprite API key in `opencode.json` uses
      `{env:TESTSPRITE_API_KEY}` substitution (not a hardcoded literal).
