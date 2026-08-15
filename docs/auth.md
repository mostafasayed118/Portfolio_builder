# Authentication

## Overview

Portfolio-Fixer uses a split authentication model:

- **Clerk** handles admin user authentication (login, sessions, JWT tokens)
- **Supabase RLS** enforces data access policies based on the JWT email claim
- **API Server** acts as the trusted backend, verifying Clerk JWTs and using the service role key

The public portfolio has no authentication. It uses the Supabase anon key with public-read RLS policies.

## Auth Flow — Admin CMS

```
1. User visits http://localhost:5174/admin
2. ClerkProvider (wrapping the app) checks for existing session
3. If no session → Clerk SignIn component renders
4. User authenticates (email/password or social login)
5. Clerk issues a JWT token
6. Auth bridge (`ClerkAuthBridge`) runs:
   a. Sets the token getter via `setAuthTokenGetter(() => getToken({ template: 'admin' }))`
   b. Arms the auth-ready gate via `setAuthReady(true)` when `isLoaded && isSignedIn`
   c. Registers the auth-missing handler (sign-out + redirect to /sign-in)
   d. Fetches `/users/me` to determine the user's role
7. ProtectedRoute component checks:
   a. Is user signed in? (Clerk session active)
   b. Is isAdmin = true (from auth context, derived from the server's /users/me response)?
8. If all pass → render admin page
9. If any fails → "Access Denied" screen or redirect to /sign-in
```

### JWT Expiration Handling

Clerk session tokens expire after ~59 minutes (Clerk's default). The client refreshes them proactively:

1. **`isTokenLikelyValid()`** calls `isJwtExpired()` which decodes the JWT payload and checks `exp` with a 30-second buffer.
2. **`getClerkToken(forceRefresh)`** requests a fresh Clerk token when a cached token is expired or near expiry. When `forceRefresh` is `true`, it bypasses Clerk's token cache.
3. **401 auto-refresh in `doFetch()`**: When a server returns 401, the api-client force-refreshes the token, reuses that exact token for one retry, and only fires the auth-missing handler if refresh and retry both fail.
4. **`auth-token.ts` file structure**: `ClerkAuthBridge.tsx`, `ProtectedRoute.tsx`, `SignInPage.tsx`, `AdminProviders.tsx` — split from the former 375-line `auth.tsx`.

### JWT Template Requirement

Clerk's default session JWT does NOT include the `email` claim. The server's `adminAuth` middleware extracts the email from the JWT payload to verify admin access. Therefore, a **Clerk JWT template** must be configured:

1. Open Clerk Dashboard → JWT Templates
2. Create a new template named `admin` (or match `VITE_CLERK_JWT_TEMPLATE`)
3. Add claim: `email` = `{{user.primary_email_address}}`
4. Save

The frontend now uses `getToken({ template: 'admin' })` to request a token with the email claim. If the template is missing, `getToken` returns null and the auth-token layer retries once, then falls back to the default session token (which will still 401 on the server). The template name is configurable via `VITE_CLERK_JWT_TEMPLATE` (default: `admin`).

### Auth-Ready Gate

The `auth-token.ts` module has an `_authReady` gate (default: `false`) that prevents the auth-missing handler from firing before Clerk has positively confirmed `isLoaded && isSignedIn`. This is the safeguard against premature sign-out during Clerk's hydration window.

### Auth-Missing Kill Switch

A compile-time `AUTH_MISSING_KILL_SWITCH` flag (default: `false`) in `auth-token.ts` makes `fireAuthMissing` a complete no-op when set to `true`. This exists as an emergency escape hatch if the auth-missing handler produces false-positive sign-outs. ProtectedRoute's natural `<Redirect to="/sign-in" />` branch still works independently.

## Auth Flow — API Server

```
1. Request arrives at Express server
2. adminAuth middleware (artifacts/api-server/src/middleware/adminAuth.ts) extracts:
   a. Bearer token from Authorization header (Clerk JWT)
   b. API key from x-admin-key header
3. If API key present → timing-safe compare against ADMIN_API_KEY
   → If match → request proceeds as "api-key-admin"
   → Gets user from getDefaultAdminUser() (lib/user-sync.ts)
4. If Clerk JWT present → verifyToken() from @clerk/backend
   → Extract email from JWT claims (email or emailAddress)
   → If no email in JWT, fall back to clerkClient.users.getUser(clerkId)
   → Check email against ADMIN_EMAILS allowlist
   → If match → request proceeds with admin email
   → Sync user via syncUserFromClerk() (lib/user-sync.ts)
     - Lookup by clerk_id → by email → auto-create
     - Retries on transient errors via withRetry()
5. If neither authenticates → 401 Unauthorized
```

The user-sync logic (lookup by clerk_id → by email → auto-create, with retry) was extracted from the middleware into `lib/user-sync.ts` to keep the middleware focused on auth verification.

### CLERK_SECRET_KEY Requirement

If `CLERK_SECRET_KEY` is not set, `verifyClerkJWT` returns null immediately. The fallback (`x-admin-key`) then becomes the only working path. A missing `CLERK_SECRET_KEY` causes the server to log "AUTH: Clerk auth skipped" and return 401 for all non-API-key requests.

### API Key Fallback

If Clerk JWT verification fails but a valid `x-admin-key` header is present, the middleware falls back to API key auth. This is logged as a warning to detect unexpected auth patterns.

## Email Allowlist Guard

The `ADMIN_EMAILS` environment variable controls who can access admin features. It is a comma-separated list of email addresses:

```
ADMIN_EMAILS=admin@example.com,other@example.com
```

This allowlist is server-only (the `VITE_` prefix was removed so it is never inlined into the client bundle). It is enforced at the API server:

- **Backend** (`api-server/middleware/adminAuth.ts`): The middleware checks the verified JWT email against the allowlist
- **Frontend** (`admin/src/features/auth/components/ClerkAuthBridge.tsx`): `isAdmin` is derived from the server (`/users/me`, which is gated by the allowlist) rather than a bundled email list

If `ADMIN_EMAILS` is empty and no `ADMIN_API_KEY` is set, the API server rejects all admin requests with 401.

## Protected Routes

All admin API routes are behind the `adminAuth` middleware. From `artifacts/api-server/src/routes/v1/index.ts`:

```
/api/v1/admin/*          → All admin CRUD routes (hero, about, skills, projects, etc.)
/api/v1/cv/settings PUT  → CV metadata update
/api/v1/images/upload    → Image upload
/api/v1/images/:id DELETE → Image deletion
```

Public routes (no auth required):

```
/api/healthz             → Health check
/api/v1/cv GET           → CV download
/api/v1/cv/settings GET  → CV metadata read
/api/v1/contact POST     → Contact form submission
/api/v1/csrf-token GET   → CSRF token generation
/api/v1/images/:id/metadata GET → Image metadata read
```

## Supabase RLS + Clerk JWT

Supabase RLS uses the `is_admin()` function defined in migration `039_fix_is_admin_function.sql`:

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  allowlist TEXT;
  allow_guc_fallback TEXT;
BEGIN
  -- Prefer Supabase-native JWT claim
  BEGIN
    user_email := auth.jwt() ->> 'email';
  EXCEPTION WHEN OTHERS THEN
    user_email := NULL;
  END;

  -- Legacy GUC fallback only when app.allow_guc_admin_fallback = 'on'
  IF user_email IS NULL OR user_email = '' THEN
    BEGIN
      allow_guc_fallback := current_setting('app.allow_guc_admin_fallback', true);
    EXCEPTION WHEN OTHERS THEN
      allow_guc_fallback := NULL;
    END;
    IF allow_guc_fallback = 'on' THEN
      BEGIN
        user_email := current_setting('request.jwt.claims', true)::jsonb ->> 'email';
      EXCEPTION WHEN OTHERS THEN
        user_email := NULL;
      END;
    END IF;
  END IF;

  IF user_email IS NULL OR user_email = '' THEN RETURN FALSE; END IF;

  allowlist := current_setting('app.admin_emails', true);
  IF allowlist IS NULL OR allowlist = '' THEN RETURN FALSE; END IF;

  RETURN lower(user_email) = ANY(string_to_array(lower(allowlist), ','));
END;
$$ LANGUAGE plpgsql STABLE;
```

The admin emails are set via a database-level GUC (migration `042_full_setup.sql`):

```sql
ALTER DATABASE postgres SET app.admin_emails = 'admin1@example.com,admin2@example.com';
```

However, the admin CMS bypasses RLS entirely by using the service role key. The `is_admin()` function exists as a defense-in-depth layer — if the service role key were ever compromised or misused, RLS would still enforce access based on the JWT email claim.

## CSRF Protection

The API server uses double-submit cookie pattern via the `csrf-csrf` library:

1. Client requests `GET /api/v1/csrf-token` → server sets a CSRF cookie and returns a token
2. Client includes the token in the `X-CSRF-Token` header on mutating requests
3. Server validates the header token matches the cookie token

The session identifier is `IP + User-Agent` (not the Clerk JWT `sub` claim). All admin mutating routes (POST, PUT, DELETE, PATCH) require a valid CSRF token.

## Rate Limiting

| Limiter                | Window | Max Requests | Applies To                     |
| ---------------------- | ------ | ------------ | ------------------------------ |
| `generalLimiter`       | 15 min | 100          | All `/api/v1` routes           |
| `contactLimiter`       | 1 hour | 5            | Contact form submissions       |
| `adminLimiter`         | 15 min | 200          | Admin CRUD routes              |
| `imageMetadataLimiter` | 1 min  | 60           | Image metadata reads           |
| `imageUploadLimiter`   | 1 min  | 10           | Image upload endpoint          |
| `apiKeyLimiter`        | 15 min | 50           | API key authenticated requests |

All limiters are disabled in development (`NODE_ENV !== "production"`) unless `DISABLE_RATE_LIMIT=true` is explicitly set.

## Security Headers

The API server uses Helmet with CSP directives:

- `defaultSrc: 'self'`
- `scriptSrc: 'self' 'unsafe-inline'` (nonce-based CSP planned)
- `styleSrc: 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `imgSrc: 'self' data: blob: https://*.supabase.co`
- `connectSrc: 'self' https://*.supabase.co wss://*.supabase.co`
- `frameSrc: 'none'`, `objectSrc: 'none'`
- HTTPS upgrade enforced in production

CSP is applied via three independent layers:

1. **api-server** (`src/app.ts`) — `helmet()` middleware
2. **portfolio** (`index.html`) — `<meta>` tag with Supabase + Google Fonts + OSM allowlists
3. **admin** (`index.html`) — `<meta>` tag with Supabase + Clerk (_.clerk.com, _.clerk.accounts.dev) + Google Fonts

## Adding a New Admin

1. Add their email to the `app.admin_emails` database GUC (via Supabase SQL: `ALTER DATABASE postgres SET app.admin_emails = '...,new@email.com'`)
2. Add their email to `ADMIN_EMAILS` in `artifacts/api-server/.env`
3. Invite them to the Clerk application
4. The admin must create a JWT template named `admin` (or match `VITE_CLERK_JWT_TEMPLATE`) with the `email` claim
5. They sign in via Clerk
6. The `adminAuth` middleware syncs them to the `users` table on first authenticated request
7. They can now access all admin features
