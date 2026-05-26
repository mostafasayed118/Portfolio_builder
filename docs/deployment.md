# Deployment

## Build Commands

| App | Build Command | Output |
|-----|---------------|--------|
| Portfolio | `pnpm --filter @workspace/portfolio build` | `artifacts/portfolio/dist/public/` |
| Admin | `pnpm --filter @workspace/admin build` | `artifacts/admin/dist/public/` |
| API Server | `pnpm --filter @workspace/api-server build` | `artifacts/api-server/dist/` |
| All | `pnpm run build` | Typechecks then builds all |

## Environment Variables (Production)

See [Setup Guide](./setup.md#complete-environment-variable-reference) for the full table. Production-specific notes:

| Variable | Production Note |
|----------|----------------|
| `NODE_ENV` | Must be `production` — enables HTTPS upgrade, strict CORS, rate limiting |
| `CSRF_SECRET` | Generate with `openssl rand -hex 32` — do NOT use the dev default |
| `CLERK_SECRET_KEY` | Required — server throws on startup without it |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Keep secret — never expose to client bundle (Vite only bundles `VITE_` prefixed vars in client code) |
| `VITE_SITE_URL` | Must match your deployed portfolio URL exactly |
| `VITE_ADMIN_URL` | Must match your deployed admin URL exactly |

## Portfolio Deployment (Vercel)

The portfolio is a static Vite SPA. Deploy to any static hosting:

**Vercel:**
1. Connect GitHub repo to Vercel
2. Set root directory to `artifacts/portfolio`
3. Framework preset: Vite
4. Build command: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @workspace/portfolio build`
5. Output directory: `dist/public`
6. Add environment variables in Vercel dashboard

**vercel.json** is already configured in `artifacts/portfolio/vercel.json`.

## Admin Deployment (Vercel)

Same as portfolio but with root directory `artifacts/admin`. Additional considerations:
- Clerk requires the deployed URL added as an allowed origin in Clerk dashboard
- `VITE_CLERK_PUBLISHABLE_KEY` must match the production Clerk app

## API Server Deployment (Render)

1. Connect GitHub repo to Render
2. Create a **Web Service**
3. Configure:
   - **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server build`
   - **Start Command:** `pnpm --filter @workspace/api-server start`
   - **Root Directory:** Leave blank (monorepo root)
   - **Node Version:** 24
4. Add all environment variables from the API server's `.env.example`

The API server uses esbuild for building. The entry point is `artifacts/api-server/src/index.ts`, compiled to `dist/index.mjs`.

## Supabase Production Setup

1. Create a production Supabase project (separate from development)
2. Run all 40 migration files in order via SQL Editor or CLI
3. Verify storage buckets were created (7 buckets)
4. Generate a new service role key for production
5. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in all deployment environments
6. Configure RLS — migrations handle this automatically

## CORS Configuration

The API server validates origins against:
- `VITE_SITE_URL` — portfolio URL
- `VITE_ADMIN_URL` — admin URL
- `VERCEL_URL` — auto-detected on Vercel deployments
- Localhost URLs are only allowed when `NODE_ENV !== "production"`

## Health Check

```
GET /api/v1/healthz
```

Returns server status, uptime, and database latency. Use for monitoring and load balancer health checks.
