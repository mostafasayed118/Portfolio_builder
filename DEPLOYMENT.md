# Deployment Guide

This guide covers deploying the Portfolio-Fixer project to production using Vercel (frontend), Render (API server), and Supabase (database).

## Prerequisites

- Node.js 24 LTS installed locally
- pnpm installed globally (`npm i -g pnpm`)
- A Supabase account and project
- A Vercel account
- A Render account
- Clerk account (for admin auth)

---

## 1. Supabase Setup

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon/public key** from Settings → API

### 1.2 Run Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run all migrations
supabase db push
```

Or run SQL files manually via the Supabase SQL Editor:
- Run files in order: `001_init.sql` through `030_add_soft_delete.sql`

### 1.3 Configure Storage Buckets

In Supabase Dashboard → Storage, create these buckets:
- `images` (public)
- `cv` (public)

### 1.4 Set Environment Variables

From Settings → API, collect:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

---

## 2. API Server Deployment (Render)

### 2.1 Prepare the API Server

1. Connect your GitHub repo to Render
2. Create a new **Web Service**
3. Configure:
   - **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server build`
   - **Start Command:** `pnpm --filter @workspace/api-server start`
   - **Root Directory:** Leave blank (monorepo root)
   - **Node Version:** 24

### 2.2 Environment Variables on Render

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
| `CSRF_SECRET` | Generate a random string (`openssl rand -hex 32`) |
| `NODE_ENV` | `production` |
| `PORT` | `3001` (Render sets this automatically) |
| `VITE_SITE_URL` | Your portfolio URL (e.g., `https://yourportfolio.vercel.app`) |
| `VITE_ADMIN_URL` | Your admin URL (e.g., `https://youradmin.vercel.app`) |

### 2.3 Deploy

Push to your main branch or manually trigger a deploy. Render will build and start the service. Note the service URL (e.g., `https://portfolio-api.onrender.com`).

---

## 3. Portfolio SPA Deployment (Vercel)

### 3.1 Configure Portfolio

1. Connect your GitHub repo to Vercel
2. Create a new project
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `artifacts/portfolio`
   - **Build Command:** `pnpm build`
   - **Output Directory:** `dist`
   - **Install Command:** `cd ../.. && pnpm install --frozen-lockfile`

### 3.2 Environment Variables on Vercel

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_API_URL` | Your Render API URL (e.g., `https://portfolio-api.onrender.com`) |
| `VITE_SITE_URL` | Your Vercel deployment URL |

### 3.3 Deploy

Push to main branch. Vercel will auto-deploy.

---

## 4. Admin SPA Deployment (Vercel)

### 4.1 Configure Admin

1. Create another Vercel project (or use a separate repo)
2. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `artifacts/admin`
   - **Build Command:** `pnpm build`
   - **Output Directory:** `dist`
   - **Install Command:** `cd ../.. && pnpm install --frozen-lockfile`

### 4.2 Environment Variables on Vercel

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key |
| `VITE_API_URL` | Your Render API URL |
| `VITE_SITE_URL` | Your admin Vercel URL |
| `APP_ADMIN_EMAILS` | Comma-separated admin emails |

### 4.3 Clerk Setup

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Configure allowed origins to include your admin URL
3. Set up email/password or social login providers
4. Add the publishable key to Vercel env vars

### 4.4 Deploy

Push to main branch. Vercel will auto-deploy.

---

## 5. Post-Deployment Checklist

- [ ] All migrations applied to Supabase
- [ ] Storage buckets created with correct RLS policies
- [ ] API server responding at `/api/healthz`
- [ ] Portfolio loads and fetches data from Supabase
- [ ] Contact form submits to API server
- [ ] Admin login works with Clerk
- [ ] Admin can CRUD all content types
- [ ] CORS configured correctly (API allows portfolio + admin origins)
- [ ] CSRF secret is set and unique
- [ ] Rate limiting is active (check logs)

---

## 6. Custom Domains

### Vercel
1. Go to your project settings → Domains
2. Add your custom domain (e.g., `yourname.com`)
3. Configure DNS records as instructed by Vercel

### Render
1. Go to your service settings → Custom Domain
2. Add your API domain (e.g., `api.yourname.com`)
3. Update `VITE_API_URL` in both Vercel projects

---

## 7. Monitoring

- **Supabase:** Dashboard → Logs for database queries
- **Render:** Service → Logs for API server output
- **Vercel:** Project → Deployments for build/runtime logs
- **Analytics:** Built-in analytics events tracked to `analytics_events` table

---

## 8. Troubleshooting

### CORS Errors
Ensure `VITE_SITE_URL` and `VITE_ADMIN_URL` on Render match your actual deployed URLs exactly (including `https://`).

### Contact Form Not Submitting
Check that `VITE_API_URL` is set correctly in the portfolio's Vercel env vars and points to your Render API.

### Admin Auth Failing
Verify `APP_ADMIN_EMAILS` includes your email and Clerk keys are correct.

### Database Errors
Run `supabase db push` to ensure all migrations are applied.
