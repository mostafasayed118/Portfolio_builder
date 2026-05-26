# ADR-003: Vanilla TypeScript Validation (No Library)

**Date:** 2026-05-18
**Status:** Accepted

## Context

The project needs input validation across all 4 layers: database constraints, API middleware, Supabase RLS, and frontend forms. The question was whether to use a validation library (Zod, Yup, Valibot, etc.) or build a custom validation system in vanilla TypeScript.

The API server (`artifacts/api-server`) initially used Zod for request body validation. The admin frontend used Zod schemas from `@workspace/validation`. A deliberate decision was made to replace the API server's Zod dependency with vanilla TypeScript validators.

## Decision

Use vanilla TypeScript for API server validation (Layer 2). Keep Zod in `lib/validation` for frontend use (Layer 4). The API server has its own validation system in `artifacts/api-server/src/middleware/validate.ts`.

## Rationale

- **Zero dependencies:** Vanilla TS validators have no runtime dependency — no version conflicts, no supply chain risk
- **Simpler debugging:** Validator functions are plain TypeScript — easy to step through in a debugger
- **Smaller bundle:** No validation library in the API server bundle (esbuild output)
- **Type safety:** The `schema()` function returns properly typed results without code generation
- **Educational value:** Understanding validation primitives helps write better code
- **Database is the real validator:** With 20+ CHECK constraints in PostgreSQL, the API validators are a convenience layer, not the last line of defense

## Consequences

### Positive
- Zero external dependencies for API validation
- Validators are simple functions — easy to test, debug, and extend
- No Zod version conflicts between packages
- Smaller API server bundle
- Clear separation: Zod for frontend convenience, vanilla TS for backend simplicity

### Negative
- Must maintain custom validation code instead of leveraging community-maintained library
- No auto-inference of TypeScript types from schemas (Zod provides `z.infer<>`)
- Less expressive than Zod for complex validation rules (e.g., `.refine()`, `.transform()`)
- Team must understand the custom validator API instead of the well-known Zod API

## The 4-Layer System

```
Layer 1: PostgreSQL CHECK constraints (final authority)
Layer 2: Express middleware — vanilla TS validators (api-server/src/middleware/validate.ts)
Layer 3: Supabase RLS policies (is_admin() + policy rules)
Layer 4: React frontend — Zod schemas (lib/validation/) + useFormValidation hook
```

Each layer catches what the previous layer missed. If a request bypasses the API server (direct Supabase access with stolen key), RLS still enforces authorization. If RLS is misconfigured, CHECK constraints still prevent invalid data.

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| **Zod everywhere** | Adds dependency to API server; version conflicts between packages; heavier than needed for simple field validation |
| **Yup** | Heavier than Zod; less TypeScript-native; not as widely adopted |
| **Valibot** | Newer, smaller, but less mature ecosystem; would still add a dependency |
| **io-ts** | Functional approach but steeper learning curve; fp-ts dependency chain |
| **No API validation (DB only)** | Poor user experience — errors would only surface at the database level with cryptic PostgreSQL error messages |
