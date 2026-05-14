# How to Use Portfolio-Fixer

## Quick Start

```bash
pnpm install
pnpm run typecheck
pnpm run build
```

## Modes of Operation

The portfolio operates in **3 modes** — each unlocks more features:

| Mode | Setup Required | Features |
|---|---|---|
| **Static** | Nothing | Fully functional portfolio with hardcoded data |
| **+ REST API** | PostgreSQL + `.env` | Contact form submissions, message management |
| **+ Convex CMS** | Convex + Clerk | Real-time content editing via Admin panel |

---

## Mode 1: Static Portfolio (Zero Setup)

The portfolio works out of the box with no backend. Edit `artifacts/portfolio/src/data/portfolio.ts` to customize content. Run the dev server:

```bash
pnpm --filter @workspace/portfolio run dev
```

## Mode 2: Enable Contact Form (REST API)

### 1. Set up PostgreSQL
Ensure a PostgreSQL database is available (Replit provisions one automatically). The connection string is read from `DATABASE_URL` env var.

### 2. Push the schema
```bash
pnpm --filter @workspace/db run push
```

### 3. Set environment variables
Create `artifacts/api-server/.env`:
```
DATABASE_URL=postgresql://...
PORT=3001
```

### 4. Start the API server
```bash
pnpm --filter @workspace/api-server run dev
```

### 5. Start the portfolio
```bash
pnpm --filter @workspace/portfolio run dev
```

The contact form will now POST to `/api/contact`.

## Mode 3: Full CMS with Convex + Clerk (Real-time)

### 1. Deploy Convex backend
```bash
npx convex deploy
```
Save the deployment URL (e.g. `https://happy-otter-123.convex.cloud`).

### 2. Set up Clerk auth
1. Sign up at [clerk.com](https://clerk.com) and create an application
2. Enable the **Convex integration** in Clerk Dashboard
3. Copy your **Clerk Frontend API URL** (`https://noun-verb-00.clerk.accounts.dev`)
4. Copy your **Clerk Publishable Key** (starts with `pk_test_`)

### 3. Configure environment variables
In your deployment platform (Replit secrets or `.env`):
```
VITE_CONVEX_URL=https://happy-otter-123.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

In **Convex Dashboard** → Environment Variables:
```
CLERK_JWT_ISSUER_DOMAIN=https://noun-verb-00.clerk.accounts.dev
```

### 4. Run the admin CMS
```bash
pnpm --filter @workspace/admin run dev
```

### 5. Seed initial data
Open the Admin panel → Overview → click **"Seed Data"**.

### 6. Log in with Clerk
Click **Sign In** in the admin panel. Only these emails can manage content:
- `mustafasayedsaeed@outlook.com`
- `mustafasayed20002@gmail.com`

---

## Development Commands

| Command | Description |
|---|---|
| `pnpm run typecheck` | Type-check all packages |
| `pnpm run build` | Type-check + build everything |
| `pnpm --filter @workspace/portfolio run dev` | Start portfolio dev server |
| `pnpm --filter @workspace/admin run dev` | Start admin CMS dev server |
| `pnpm --filter @workspace/api-server run dev` | Start REST API dev server |
| `pnpm --filter @workspace/mockup-sandbox run dev` | Start UI sandbox |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API client from OpenAPI spec |

## Project Structure

```
artifacts/
  portfolio/     # Public portfolio site (React + Vite + Tailwind)
  admin/         # Admin CMS (14 management pages)
  api-server/    # Express 5 REST API (Drizzle + PostgreSQL)
  mockup-sandbox/ # UI prototyping sandbox
convex/          # Convex serverless functions & schema (20+ tables)
lib/
  api-spec/          # OpenAPI spec (source of truth for API)
  api-zod/           # Generated Zod schemas
  api-client-react/  # Generated React Query hooks
  object-storage-web/ # Uppy file upload components
scripts/         # Build/deploy scripts
```

## Customizing Portfolio Content (Static Mode)

Edit `artifacts/portfolio/src/data/portfolio.ts`:

- **Hero**: `name`, `roles[]`, social URLs, CV filename
- **About**: bio, education, languages, stats
- **Skills**: 35+ skills with categories, proficiency levels
- **Projects**: 8 projects with tech stacks, metrics, links
- **Experience**: 3 timeline entries
- **Certifications**: 11 certifications
- **Contact**: email, phone, location, social links
- **Theme**: dark/light colors, glassmorphism, fonts
- **SEO**: OG tags, JSON-LD, meta tags

## Deployment

The project is designed for **Replit**. Deploy by pushing to a Replit repo and configuring the build command as `pnpm run build` and run command to start all artifacts.

For other platforms (Vercel, Netlify, etc.), each `artifacts/*` app can be deployed independently as a static site (portfolio, admin) or Node server (api-server).
