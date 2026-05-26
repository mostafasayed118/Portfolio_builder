# ADR-002: Clerk for Admin Authentication

**Date:** 2026-05-08
**Status:** Accepted

## Context

The admin CMS dashboard needs authentication to protect content management operations. The original Convex-based project used Clerk with Convex JWT integration. After migrating to Supabase, a decision was needed on whether to:

1. Switch entirely to Supabase Auth (built into Supabase)
2. Keep Clerk for authentication
3. Use a custom auth solution

The admin CMS is a single-user system (the portfolio owner) with a small allowlist of admin emails. Auth needs are simple: verify identity, check email allowlist, issue JWT for API calls.

## Decision

Keep Clerk for admin authentication. Supabase handles data access (RLS), Clerk handles identity.

## Rationale

- **Already integrated:** Clerk was already wired into the admin app via `@clerk/clerk-react`
- **Drop-in UI:** Clerk provides pre-built sign-in/sign-up components with no custom UI needed
- **JWT verification:** `@clerk/backend` provides `verifyToken()` for server-side JWT verification
- **Separation of concerns:** Auth (identity) is separate from data access (Supabase RLS)
- **Email allowlist:** Simple to implement — just compare JWT email against a configured list
- **No Supabase Auth overhead:** Supabase Auth would add complexity (email confirmation, password reset flows) that isn't needed for a single-admin system

## Consequences

### Positive
- Clean separation: Clerk owns identity, Supabase owns data
- Pre-built UI components for sign-in (no custom auth forms)
- JWT tokens are standard and well-understood
- Email allowlist is a simple, effective authorization model
- API key alternative for programmatic access (`x-admin-key` header)

### Negative
- External dependency on Clerk service (if Clerk is down, admin can't log in)
- Clerk adds a dependency to both frontend and backend
- Must manage Clerk keys alongside Supabase keys
- Two auth systems to understand (Clerk for identity, Supabase RLS for data access)

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| **Supabase Auth** | Built-in but adds email confirmation, password reset, and session management complexity that a single-admin system doesn't need. Would couple auth to the database layer. |
| **Custom JWT auth** | Would need to implement sign-in UI, token refresh, password hashing, and session management from scratch. High effort for minimal benefit. |
| **NextAuth.js** | Framework-specific (Next.js); project uses Vite + wouter, not Next.js |
| **No auth (API key only)** | Simpler but less secure — no user identity, no session management, shared secret |
