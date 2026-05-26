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
6. ProtectedRoute component checks:
   a. Is user signed in? (Clerk session active)
   b. Is user's email in VITE_ADMIN_EMAILS allowlist?
7. If both pass → render admin page
8. If either fails → redirect to sign-in
9. Admin page mounts → React Query hooks use service-role Supabase client
```

## Auth Flow — API Server

```
1. Request arrives at Express server
2. adminAuth middleware extracts:
   a. Bearer token from Authorization header (Clerk JWT)
   b. API key from x-admin-key header
3. If API key present → timing-safe compare against ADMIN_API_KEY
   → If match → request proceeds as "api-key-admin"
4. If Clerk JWT present → verifyToken() from @clerk/backend
   → Extract email from JWT claims
   → Check email against VITE_ADMIN_EMAILS allowlist
   → If match → request proceeds with admin email
   → Sync user to Supabase users table if needed
5. If neither authenticates → 401 Unauthorized
```

## Email Allowlist Guard

The `VITE_ADMIN_EMAILS` environment variable controls who can access admin features. It is a comma-separated list of email addresses:

```
VITE_ADMIN_EMAILS=admin@example.com,other@example.com
```

This is checked at two layers:
- **Frontend** (`admin/src/lib/auth.tsx`): `ProtectedRoute` reads `VITE_ADMIN_EMAILS` and compares against the Clerk user's primary email
- **Backend** (`api-server/middleware/adminAuth.ts`): The middleware parses `VITE_ADMIN_EMAILS` at startup and checks against the verified JWT email

If `VITE_ADMIN_EMAILS` is empty and no `ADMIN_API_KEY` is set, the API server rejects all admin requests with 401.

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
/api/v1/healthz          → Health check
/api/v1/cv GET           → CV download
/api/v1/cv/settings GET  → CV metadata read
/api/v1/contact POST     → Contact form submission
/api/v1/csrf-token GET   → CSRF token generation
/api/v1/images/:id/metadata GET → Image metadata read
```

## Supabase RLS + Clerk JWT

Supabase RLS uses the `is_admin()` function defined in `001_init.sql`:

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    current_setting('request.jwt.claims', true)::jsonb ->> 'email'
    = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

However, in this project the admin CMS bypasses RLS entirely by using the service role key. The `is_admin()` function exists as a defense-in-depth layer — if the service role key were ever compromised or misused, RLS would still enforce access based on the JWT email claim.

## CSRF Protection

The API server uses double-submit cookie pattern via the `csrf-csrf` library:
1. Client requests `GET /api/v1/csrf-token` → server sets a CSRF cookie and returns a token
2. Client includes the token in the `X-CSRF-Token` header on mutating requests
3. Server validates the header token matches the cookie token

All admin mutating routes (POST, PUT, DELETE) require a valid CSRF token.

## Rate Limiting

| Limiter | Window | Max Requests | Applies To |
|---------|--------|-------------|------------|
| `generalLimiter` | 15 min | 100 | All `/api/v1` routes |
| `contactLimiter` | 1 hour | 5 | Contact form submissions |
| `adminLimiter` | 15 min | 200 | Admin CRUD routes |
| `authLimiter` | 15 min | 10 | Auth-related routes |
| `imageMetadataLimiter` | 1 min | 60 | Image metadata reads |
| `uploadLimiter` | 15 min | 30 | File uploads |
| `apiKeyLimiter` | 15 min | 50 | API key authenticated requests |

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

## Adding a New Admin

1. Add their email to `VITE_ADMIN_EMAILS` in both `artifacts/admin/.env` and `artifacts/api-server/.env`
2. They sign in via Clerk (the Clerk app must allow their email)
3. The `adminAuth` middleware syncs them to the `users` table on first authenticated request
4. They can now access all admin features
