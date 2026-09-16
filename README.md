# Portfolio-Fixer

A full-stack portfolio CMS monorepo built with React 19, Supabase, Express 5, and TailwindCSS v4.

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment files
cp artifacts/portfolio/.env.example artifacts/portfolio/.env
cp artifacts/admin/.env.example artifacts/admin/.env
cp artifacts/api-server/.env.example artifacts/api-server/.env

# 3. Fill in your Supabase credentials and Clerk keys in each .env file

# 4. Start all services in parallel
pnpm dev
```

## Scripts

| Script                    | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| `pnpm dev`                | Start portfolio, admin, and API server in parallel      |
| `pnpm dev:portfolio`      | Start portfolio only (port 5173)                        |
| `pnpm dev:admin`          | Start admin only (port 5174)                            |
| `pnpm dev:api`            | Start API server only (port 3001)                       |
| `pnpm build`              | Typecheck + build all artifacts                         |
| `pnpm typecheck`          | Run TypeScript type checking                            |
| `pnpm test`               | Run all tests (Vitest — 1,500+ tests across ~195 files) |
| `pnpm test:e2e`           | Run E2E tests (Playwright)                              |
| `pnpm lint`               | Run ESLint                                              |
| `pnpm run typecheck:libs` | Typecheck shared libs only (fast)                       |

## Apps

| App        | URL                            | Description           |
| ---------- | ------------------------------ | --------------------- |
| Portfolio  | http://localhost:5173          | Public portfolio site |
| Admin CMS  | http://localhost:5174          | Admin dashboard       |
| API Server | http://localhost:3001          | REST API              |
| API Docs   | http://localhost:3001/api-docs | OpenAPI docs          |

## Project Structure

```
Portfolio-Fixer/
├── artifacts/
│   ├── portfolio/       # Public portfolio SPA (Vite + React 19)
│   │   └── src/features/  # Feature-based: hero/, skills/, projects/, contact/, about/ (navbar lives in src/components/navbar/)
│   ├── admin/           # Admin CMS dashboard (Vite + React 19)
│   │   └── src/features/  # Feature-based: auth/, hero-content/, skills/, projects/, etc.
│   ├── api-server/      # Express 5 REST API
├── lib/
│   ├── db/              # Supabase query modules
│   ├── supabase/        # Supabase client + hand-maintained types
│   ├── validation/      # Zod-based client form schemas (drift-tested against lib/api-zod)
│   ├── auth/            # Auth context providers
│   ├── ui/              # 55+ shadcn-style UI components
│   ├── api-spec/        # OpenAPI 3.1 spec (source of truth for API clients)
│   ├── api-client-react/ # Generated React Query hooks
│   ├── api-zod/         # Generated Zod schemas
│   ├── logging/         # Shared logging utility
│   ├── app-infra/       # Shared SPA infra (logger, CSRF handshake)
│   └── test-utils/      # Shared test helpers
├── supabase/
│   └── migrations/      # 61 SQL migration files
├── scripts/             # Workspace scripts
├── docs/                # Extended documentation
├── package.json         # Root workspace
├── pnpm-workspace.yaml  # pnpm config
├── .github/workflows/   # CI pipeline (typecheck, tests, bundle analysis, E2E)
└── tsconfig.json        # TypeScript config
```

## Tech Stack

| Category         | Technology                                               |
| ---------------- | -------------------------------------------------------- |
| Framework        | React 19                                                 |
| Build Tool       | Vite 7                                                   |
| CSS              | TailwindCSS v4                                           |
| Database         | Supabase (PostgreSQL)                                    |
| API Server       | Express 5                                                |
| Auth             | Clerk                                                    |
| State            | TanStack Query                                           |
| Forms            | react-hook-form                                          |
| Validation       | Zod                                                      |
| AI (LLM)         | Groq (free tier, OpenAI-compatible, proxied server-side) |
| Routing          | wouter                                                   |
| Animations       | framer-motion                                            |
| Icons            | lucide-react                                             |
| Testing          | Vitest + Testing Library                                 |
| Logging (server) | pino                                                     |
| Security         | helmet, csrf-csrf, express-rate-limit                    |

## Documentation

- [Memory Bank](./MEMORY_BANK.md)
- [Changelog](./docs/changelog.md)
- [API Reference](./docs/api.md)
- [API Server README](./artifacts/api-server/README.md) — architecture, env, conventions, test instructions
- [Replit Deployment Guide](./replit.md)
- [Contributing Guide](./docs/contributing.md) — conventions, pre-commit hooks, TypeScript rules
- [Testing Guide](./docs/testing.md) — Vitest, Playwright, mock conventions
- [Validation System](./docs/validation.md) — 4-layer defense-in-depth
- [Architecture Overview](./docs/ARCHITECTURE.md) — data flow, RLS, package deps

Superseded point-in-time reports ([Technical Debt](./docs/archive/TECHNICAL_DEBT_REPORT.md), [Backend Audit](./docs/archive/BACKEND_AUDIT_REPORT.md), [Feature Inventory](./docs/archive/FEATURE_INVENTORY.md)) live in `docs/archive/`.

See [docs/README.md](./docs/README.md) for the full documentation index.
