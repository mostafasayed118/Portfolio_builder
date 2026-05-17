# Portfolio-Fixer

A full-stack portfolio CMS monorepo built with React 19, Supabase, Express 5, and TailwindCSS v4.

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment files
cp artifacts/portfolio/.env.example artifacts/portfolio/.env
cp artifacts/admin/.env.example artifacts/admin/.env
cp artifacts/api-server/.env.example artifacts/api-server/.env

# Fill in your Supabase credentials and Clerk keys

# Start all services
pnpm dev
```

## Project Structure

```
Portfolio-Fixer/
├── artifacts/
│   ├── portfolio/       # Public portfolio SPA (Vite + React 19)
│   ├── admin/           # Admin CMS dashboard (Vite + React 19)
│   └── api-server/      # Express 5 REST API
├── lib/
│   ├── db/              # 23 Supabase query files
│   ├── supabase/        # Supabase clients + generated types
│   ├── validation/      # Zod validation schemas
│   ├── auth/            # Auth context providers
│   ├── ui/              # 55+ shadcn-style UI components
│   ├── api-client-react/ # Generated React Query hooks from OpenAPI
│   ├── api-zod/         # Generated Zod schemas from OpenAPI
│   └── api-spec/        # OpenAPI 3.1 specification (5 endpoints)
├── supabase/
│   └── migrations/      # 25 SQL migration files
├── package.json         # Root workspace
├── pnpm-workspace.yaml  # pnpm config
└── tsconfig.json        # TypeScript config
```

## Apps

| App | URL | Description |
|---|---|---|
| Portfolio | http://localhost:5173 | Public portfolio site |
| Admin CMS | http://localhost:5174 | Admin dashboard |
| API Server | http://localhost:3001 | REST API |
| API Docs | http://localhost:3001/api-docs | OpenAPI docs |

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 19 |
| Build Tool | Vite 7 |
| CSS | TailwindCSS v4 |
| Database | Supabase (PostgreSQL) |
| API Server | Express 5 |
| Auth | Clerk |
| State | TanStack Query |
| Forms | react-hook-form |
| Validation | Zod |
| Routing | wouter |
| Animations | framer-motion |
| Icons | lucide-react |
| Testing | Vitest + Testing Library |
| Logging (server) | pino |
| Security | helmet, csrf-csrf, express-rate-limit |

## Documentation

- [Technical Debt Report](./TECHNICAL_DEBT_REPORT.md)
- [Feature Inventory](./FEATURE_INVENTORY.md)
- [Memory Bank](./MEMORY_BANK.md)
- [Replit Deployment Guide](./replit.md)
