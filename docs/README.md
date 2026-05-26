# Documentation Index

> Master index for all Portfolio-Fixer documentation.

## Core Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System overview, monorepo structure, data flow, package dependencies |
| [Setup Guide](./setup.md) | Local development setup, prerequisites, environment variables |
| [API Reference](./api.md) | All Express endpoints with methods, paths, auth, and responses |
| [Database Reference](./database.md) | Full schema — 22 tables, columns, constraints, indexes, RLS policies |
| [Authentication](./auth.md) | Clerk JWT + API key auth, email allowlist, Supabase RLS |
| [Validation](./validation.md) | 4-layer validation: DB constraints, API middleware, RLS, frontend |
| [File Storage](./storage.md) | Supabase Storage buckets, CV upload/download, image pipeline |
| [Deployment](./deployment.md) | Production deploy to Vercel + Render + Supabase |
| [Contributing](./contributing.md) | Code conventions, naming, patterns, feature checklist |
| [Changelog](./changelog.md) | Version history and release notes |

## Supplementary Documentation

| Document | Description |
|----------|-------------|
| [Testing](./testing.md) | Test framework, commands, writing tests, E2E status |
| [Data Access Layer](./data-access.md) | `@workspace/db` module reference — all CRUD functions |
| [Product Requirements](./prd.md) | Full product specification document |
| [UX Audit](./ux-audit.md) | 41 UI/UX issues found in codebase audit |
| [UX Audit Resolution](./ux-audit-fixed.md) | 29 issues fixed with file-level details |
| [Image Pipeline](./feature-image-pipeline.md) | Image optimization roadmap (spec only, not implemented) |
| [Convex Migration](./migration.md) | Historical record of Convex → Supabase migration |

## Architecture Decision Records

| ADR | Decision | Date |
|-----|----------|------|
| [001](./decisions/001-supabase-over-convex.md) | Supabase over Convex | 2026-05-12 |
| [002](./decisions/002-clerk-for-auth.md) | Clerk for admin authentication | 2026-05-12 |
| [003](./decisions/003-vanilla-ts-validation.md) | Vanilla TypeScript validation (no library) | 2026-05-12 |

## Root-Level References

| File | Description |
|------|-------------|
| [MEMORY_BANK.md](../MEMORY_BANK.md) | Single source of truth for project state |
| [MANIFEST.md](../MANIFEST.md) | File manifest with migration listing |
| [SECURITY.md](../SECURITY.md) | Security policy and auth model |
| [FEATURE_INVENTORY.md](../FEATURE_INVENTORY.md) | Complete feature list per app |
| [LICENSE](../LICENSE) | MIT license |
