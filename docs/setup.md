# Local Development Setup

## Prerequisites

| Tool              | Version | Check                                                 |
| ----------------- | ------- | ----------------------------------------------------- |
| Node.js           | 24 LTS  | `node --version`                                      |
| pnpm              | 9.15+   | `pnpm --version`                                      |
| Supabase project  | —       | Create at [supabase.com](https://supabase.com)        |
| Clerk application | —       | Create at [clerk.com](https://clerk.com) (admin only) |

> npm is blocked by the `preinstall` script — you must use pnpm.

## 1. Clone and Install

```bash
git clone <repo-url>
cd Portfolio-Fixer
pnpm install
```

## 2. Environment Variables

Each app has its own `.env` file. Copy the examples and fill in your credentials:

```bash
cp artifacts/portfolio/.env.example artifacts/portfolio/.env
cp artifacts/admin/.env.example artifacts/admin/.env
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

### Complete Environment Variable Reference

| Variable                         | App(s)                | Required | Description                                    | Example                                     |
| -------------------------------- | --------------------- | -------- | ---------------------------------------------- | ------------------------------------------- |
| `VITE_SUPABASE_URL`              | portfolio, admin      | Yes      | Supabase project URL                           | `https://xxx.supabase.co`                   |
| `VITE_SUPABASE_ANON_KEY`         | portfolio, admin      | Yes      | Supabase anon/public key                       | `eyJ...`                                    |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | admin                 | Yes      | Supabase service role key (bypasses RLS)       | `eyJ...`                                    |
| `VITE_API_URL`                   | portfolio, admin      | Yes      | API server base URL                            | `http://localhost:3001`                     |
| `VITE_SITE_URL`                  | portfolio, api-server | Yes      | Portfolio site URL (for CORS)                  | `http://localhost:5173`                     |
| `VITE_ADMIN_URL`                 | admin, api-server     | Yes      | Admin site URL (for CORS)                      | `http://localhost:5174`                     |
| `VITE_CLERK_PUBLISHABLE_KEY`     | admin, api-server     | Yes      | Clerk publishable key                          | `pk_test_...`                               |
| `VITE_CLERK_JWT_TEMPLATE`        | admin                 | No       | Clerk JWT template name (default: `admin`)     | `admin`                                     |
| `VITE_ADMIN_EMAILS`              | admin, api-server     | Yes      | Comma-separated admin emails                   | `admin@example.com`                         |
| `SUPABASE_URL`                   | api-server            | Yes      | Supabase project URL (server-side)             | `https://xxx.supabase.co`                   |
| `SUPABASE_SERVICE_ROLE_KEY`      | api-server            | Yes      | Supabase service role key                      | `eyJ...`                                    |
| `CSRF_SECRET`                    | api-server            | Yes      | Random hex string for CSRF tokens              | `openssl rand -hex 32`                      |
| `CLERK_SECRET_KEY`               | api-server            | Yes\*    | Clerk secret key for JWT verification          | `sk_test_...`                               |
| `CLERK_ISSUER`                   | api-server            | No       | Clerk JWT issuer URL                           | `https://xxx.clerk.accounts.dev`            |
| `ADMIN_API_KEY`                  | api-server            | No       | Admin API key (alternative to Clerk JWT)       | `dev-admin-key-12345`                       |
| `PORT`                           | api-server            | No       | Server port (default: 3001)                    | `3001`                                      |
| `NODE_ENV`                       | api-server            | No       | Environment mode                               | `development`                               |
| `LOG_LEVEL`                      | api-server            | No       | Pino log level (default: `info`)               | `debug`                                     |
| `DISABLE_RATE_LIMIT`             | api-server            | No       | Disable rate limiting (dev only)               | `true`                                      |
| `GEMINI_API_KEY`                 | api-server            | No       | Google Gemini API key for AI assistant feature | `AIzaSy...`                                 |
| `GEMINI_BASE_URL`                | api-server            | No       | Gemini API base URL (override)                 | `https://generativelanguage.googleapis.com` |
| `VITE_TWITTER_HANDLE`            | portfolio             | No       | Twitter/X handle for SEO meta tags             | `@username`                                 |

> `CLERK_SECRET_KEY` is required in production. The server throws on startup if `NODE_ENV=production` and this key is missing.

> `VITE_CLERK_JWT_TEMPLATE` must match a JWT template you create in Clerk Dashboard. The template must include the `email` claim (value: `{{user.primary_email_address}}`). Without it, admin requests return 401.

## 3. Supabase Setup

### 3.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon/public key** from Settings → API
3. Note your **service role key** (keep secret — it bypasses RLS)

### 3.2 Run Migrations

Apply all 43 migration files in order via the Supabase SQL Editor:

```bash
# Option A: Supabase CLI
npm install -g supabase
supabase link --project-ref your-project-ref
supabase db push

# Option B: Manual
# Copy each file from supabase/migrations/ into the SQL Editor and run in order:
# 001_init.sql → 002_fix_rls_policies.sql → 003_constraints.sql → ... → 043_add_section_variants.sql
```

After migration 042 succeeds, verify the admin emails GUC is set:

```sql
SHOW app.admin_emails;
```

### 3.3 Verify Storage Buckets

The migrations create these storage buckets automatically:

- `cv` (private) — CV PDF files
- `project_images` (public) — Project screenshots
- `image_variants` (private) — Processed image variants
- `avatars` (public) — Profile images
- `projects` (public) — Project screenshots
- `certifications` (public) — Certification badge images
- `documents` (private) — General documents

If any are missing, create them in Supabase Dashboard → Storage.

## 4. Clerk Setup (Admin Auth)

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Copy the **Publishable Key** (`pk_test_...`) to `VITE_CLERK_PUBLISHABLE_KEY` in both admin and api-server `.env`
3. Copy the **Secret Key** (`sk_test_...`) to `CLERK_SECRET_KEY` in api-server `.env`
4. Note the **Issuer URL** (e.g. `https://xxx.clerk.accounts.dev`) for `CLERK_ISSUER`
5. Configure allowed origins in Clerk dashboard to include your admin URL
6. Set up email/password or social login providers

### 4.1 Create JWT Template (CRITICAL)

The server extracts user email from the JWT payload. Clerk's default session JWT does NOT include the email claim. You must create a custom JWT template:

1. Open **Clerk Dashboard → JWT Templates**
2. Click **New template**
3. Name it **`admin`** (or match whatever you set `VITE_CLERK_JWT_TEMPLATE` to)
4. In the **Claims** section, add:
   - **Key:** `email`
   - **Value:** `{{user.primary_email_address}}`
5. **Save**
6. Set `VITE_CLERK_JWT_TEMPLATE=admin` in the admin app's `.env.local`

Without this template, ALL admin API requests return 401 because the server cannot match the JWT's email against the admin allowlist.

## 5. Run the Apps

```bash
# All services at once
pnpm dev

# Individual services
pnpm --filter @workspace/portfolio dev   # Port 5173
pnpm --filter @workspace/admin dev       # Port 5174
pnpm --filter @workspace/api-server dev  # Port 3001
```

## 6. Seed Initial Data

The database migrations insert default seed data for all 8 singleton tables and 7 section settings. To populate collection tables:

1. Open the admin dashboard at `http://localhost:5174`
2. Sign in with your Clerk credentials
3. Click "Import Static Data" on the Overview page

This imports skills, projects, experience, and certifications from the static data files in `artifacts/portfolio/src/data/`.

## 7. Verify Setup

```bash
# Type check all packages
pnpm run typecheck

# Run all tests
pnpm run test

# Check portfolio loads
curl http://localhost:5173

# Check API health (liveness check, no auth required)
curl http://localhost:3001/api/healthz

# API server: dedicated verification (typecheck + test + build)
pnpm --filter @workspace/api-server verify
```

The API server reads its env through `src/lib/env.ts`. If any **required**
variable is missing at boot (and `NODE_ENV !== "test"`), the server
prints which vars are missing and `process.exit(1)`s. Required at boot:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CSRF_SECRET`

Tests can override these via `_setOverride()` without touching
`process.env` (which would leak across tests).

## Common Issues

### "Use pnpm instead" error

The `preinstall` script blocks npm. Use `pnpm install`.

### Portfolio shows blank page

The portfolio SPA needs Supabase configured. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set. If Supabase is not configured, the app falls back to static data.

### CORS errors between apps

Ensure `VITE_SITE_URL` and `VITE_ADMIN_URL` in the API server's `.env` match the actual URLs of your running portfolio and admin apps (including port).

### Rate limiting blocks requests in development

Rate limiting is disabled when `NODE_ENV !== "production"`. If you set `NODE_ENV=production` locally, set `DISABLE_RATE_LIMIT=true` as well.

### Clerk JWT verification fails

Ensure `CLERK_SECRET_KEY` and `CLERK_ISSUER` are set in the API server's `.env`. The issuer URL must match your Clerk application's issuer exactly.

### Auth loop after login (sign-out → redirect → sign-out)

This was a bug in an earlier version of the auth-missing handler. Ensure you have the latest `auth-token.ts` and `auth.tsx` with:

- `setAuthReady` gate that only arms on `isLoaded && isSignedIn`
- `AUTH_MISSING_KILL_SWITCH = false` (kill switch off)
- No client-side JWT expiration check
- JWT template `admin` configured in Clerk Dashboard

### Contact form returns 403 with "Origin not allowed"

The public `POST /api/v1/contact` endpoint enforces an origin allowlist
via `VITE_SITE_URL` and `VITE_ADMIN_URL`. Both must be set in the API
server's `.env`. In dev, missing origin is allowed (curl/Postman
support); in production, missing origin returns `403`. See
`docs/api.md` for the full abuse-control matrix.
