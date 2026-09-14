# Documentation Index

> Master index for Portfolio-Fixer documentation. Canonical, maintained docs are
> listed first; dated session logs and point-in-time reports live in
> [`docs/archive/`](./archive/) (historical record, not maintained).

## Core Documentation (canonical)

| Document                              | Description                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Architecture](./ARCHITECTURE.md)     | System overview, monorepo structure, data flow, feature-based organization, package dependencies |
| [API Reference](./api.md)             | All Express endpoints with methods, paths, auth, and responses                                   |
| [Database Reference](./database.md)   | Full schema — tables, columns, constraints, indexes, RLS policies                                |
| [Validation](./validation.md)         | 4-layer validation: DB constraints, API middleware, Zod schemas, frontend                        |
| [Testing](./testing.md)               | Test framework, commands, writing tests, mock conventions, E2E status                            |
| [Setup Guide](./setup.md)             | Local development setup, prerequisites, environment variables                                    |
| [Authentication](./auth.md)           | Clerk JWT + API key auth, email allowlist, Supabase RLS                                          |
| [Data Access Layer](./data-access.md) | `@workspace/db` module reference — all CRUD functions                                            |
| [File Storage](./storage.md)          | Supabase Storage buckets, CV upload/download, image pipeline                                     |
| [Deployment](./deployment.md)         | Production deploy to Vercel + Supabase                                                           |
| [Security](./security.md)             | Security posture, CSP, rate limiting, sanitization                                               |
| [Contributing](./contributing.md)     | Code conventions, naming, patterns, feature checklist                                            |
| [Changelog](./changelog.md)           | Version history and release notes                                                                |

## Architecture Decision Records

| ADR                                             | Decision                                   | Date       |
| ----------------------------------------------- | ------------------------------------------ | ---------- |
| [001](./decisions/001-supabase-over-convex.md)  | Supabase over Convex                       | 2026-05-12 |
| [002](./decisions/002-clerk-for-auth.md)        | Clerk for admin authentication             | 2026-05-12 |
| [003](./decisions/003-vanilla-ts-validation.md) | Vanilla TypeScript validation (no library) | 2026-05-12 |

## Point-in-Time Reports (kept for reference)

| Document                                        | Description                                             |
| ----------------------------------------------- | ------------------------------------------------------- |
| [Product Requirements](./PRD.md)                | Full product specification document                     |
| [Accessibility Audit](./accessibility-audit.md) | WCAG 2.1 AA compliance audit — portfolio a11y review    |
| [UX Audit](./ux-audit.md)                       | 41 UI/UX issues found in codebase audit                 |
| [Image Pipeline](./feature-image-pipeline.md)   | Image optimization roadmap (spec only, not implemented) |
| [Convex Migration](./migration.md)              | Historical record of Convex → Supabase migration        |
| [Master Audit Report](./MASTER_AUDIT_REPORT.md) | 2026-05 full-repo audit findings                        |

## Root-Level References

| File                                | Description                              |
| ----------------------------------- | ---------------------------------------- |
| [MEMORY_BANK.md](../MEMORY_BANK.md) | Single source of truth for project state |
| [MANIFEST.md](../MANIFEST.md)       | File manifest with migration listing     |
| [SECURITY.md](../SECURITY.md)       | Security policy and auth model           |
| [LICENSE](../LICENSE)               | MIT license                              |

## Artifact READMEs

| File                                                   | Description                                                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| [API Server README](../artifacts/api-server/README.md) | Express + Supabase backend — quickstart, env, architecture, conventions, test instructions, recent reliability fixes |
| [Admin README](../artifacts/admin/README.md)           | Admin CMS — quickstart, env (anon key only), page inventory                                                          |
| [Portfolio README](../artifacts/portfolio/README.md)   | Public portfolio SPA — quickstart, env, structure                                                                    |

## Archive ([`docs/archive/`](./archive/))

Dated session logs and superseded reports — historical record only; do not
update. Newer equivalents live in the sections above.

Session logs: `tasks-done-2026-05-26.md`, `tasks-done-2026-05-27.md`,
`tasks-done-2026-05-27-session2.md`, `tasks-done-2026-06-01.md`,
`tasks-done-2026-06-02.md`, `tasks-done-2026-06-02-session3.md`,
`tasks-done-2026-06-04.md`, `ux-audit-fixed.md`, `VERIFICATION_REPORT.md`.

Superseded reports: `BACKEND_AUDIT_REPORT.md`, `COMPARISON_REPORT.md`,
`FEATURE_INVENTORY.md`, `MANUAL_STEPS.md`, `MEMORY_BANK_AUDIT.md`,
`TECHNICAL_DEBT_REPORT.md`, `TEST_INTEGRITY_SCORECARD.md`.
