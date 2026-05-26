# ADR-001: Supabase over Convex

**Date:** 2026-05-08
**Status:** Accepted

## Context

The original project used Convex as its backend — a serverless BaaS (Backend-as-a-Service) with real-time sync, built-in auth integration, and a TypeScript-first schema system. Convex handled the database, file storage (via Replit Object Storage), and real-time data subscriptions.

The project needed to migrate to a more traditional stack for several reasons:
- Convex's serverless model made complex queries and data relationships harder to manage
- The team needed direct SQL access for debugging and optimization
- File storage was tied to Replit's proprietary Object Storage
- Convex's pricing model and vendor lock-in were concerns
- The admin CMS needed fine-grained access control that Convex's auth model didn't easily support

## Decision

Migrate the entire backend from Convex to Supabase (PostgreSQL + Storage).

## Rationale

- **PostgreSQL:** Industry-standard relational database with full SQL support, mature tooling, and extensive ecosystem
- **Row Level Security:** Built-in authorization at the database level — policies defined in SQL, enforced by the database engine
- **Supabase Storage:** S3-compatible file storage with integrated RLS policies
- **Self-hosting option:** Supabase can be self-hosted if needed
- **TypeScript SDK:** `@supabase/supabase-js` provides typed client access
- **Cost:** Generous free tier, predictable pricing for production

## Consequences

### Positive
- Full SQL access for debugging, optimization, and complex queries
- Row Level Security provides defense-in-depth authorization
- Supabase Storage replaces proprietary Replit Object Storage
- 18 tables with proper constraints, indexes, and foreign keys
- Migration files provide version-controlled schema changes
- Service role key allows admin operations to bypass RLS cleanly

### Negative
- Lost real-time sync from Convex (replaced with polling via React Query)
- Must manage RLS policies manually in migration files
- Supabase client requires more boilerplate than Convex's `useQuery(api.module.fn)` pattern
- Must handle connection pooling and client lifecycle

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| **Firebase** | NoSQL model doesn't fit relational data well; weaker query capabilities; Google vendor lock-in |
| **PlanetScale** | MySQL-based (team prefers Postgres); no built-in storage or auth |
| **Neon** | Serverless Postgres but no built-in storage or auth — would need additional services |
| **Keep Convex** | Real-time sync was convenient but the trade-offs in flexibility and control were too high |
| **Self-hosted Postgres** | More operational overhead; Supabase provides managed hosting with batteries included |
