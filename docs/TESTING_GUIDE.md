# Testing Guide

> **Audience:** anyone joining this repo who needs to run, write, or fix tests.
> **Last updated:** 2026-06-05 (after auth hardening — 287 tests across 53 + 33 + 35 files, typecheck clean, lint clean).

This guide focuses on **how to be productive with the test suite day-to-day**. The deeper "why" lives in `docs/testing.md` and the in-file test docstrings.

## TL;DR

```bash
# All component tests (admin + portfolio + libs)
pnpm run test

# Just one project
pnpm run test -- --project @workspace/admin
pnpm run test -- --project @workspace/portfolio
pnpm run test -- --project @workspace/api-server

# Typecheck
pnpm run typecheck

# E2E smoke
pnpm exec playwright test e2e/admin-cv-upload.smoke.spec.ts --project=admin

# Auth setup (writes playwright/.auth/admin.json)
pnpm exec playwright test --project=setup

# All E2E
pnpm test:e2e
```

## Architecture at a glance

| Layer            | Tool                                 | Lives in                                                       | What it covers                                                                                   |
| ---------------- | ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Component / hook | **Vitest** + Testing Library + jsdom | `artifacts/{admin,portfolio}/src/test/`, `src/hooks/*.test.ts` | All admin features, all portfolio features, hooks, validation, a11y (287 tests across 121 files) |
| API              | **Vitest** + supertest               | `artifacts/api-server/src/`                                    | All Express routes, middleware (auth, CSRF, rate limit)                                          |
| End-to-end       | **Playwright**                       | `e2e/*.spec.ts`                                                | Critical user flows that span Browser → API → Supabase                                           |

There is **no shared test fixture layer** — each project keeps its own mocks. This is intentional: the apps are independent deployables and the cost of shared fixtures is higher than the cost of duplicated 5-line `vi.mock` calls.

## Conventions

### Error handling in UI components

**Always route user-visible errors through `getErrorMessage` from `@/lib/error-messages`.** Never render raw `error.message` or `err.message` directly.

```tsx
// ✅ Right
import { getErrorMessage } from "@/lib/error-messages";
toast({ title: "Save failed", description: getErrorMessage(err), variant: "destructive" });
<p>{getErrorMessage(error)}</p>;

// ❌ Wrong
toast({ title: `Save failed: ${err.message}`, variant: "destructive" });
<p>{error instanceof Error ? error.message : "Unknown error"}</p>;
```

`getErrorMessage` maps common patterns (`401`, `403`, `404`, `network`, `fetch`, `aborted`, `timeout`) to user-friendly copy. Anything unrecognised falls through to the raw message, so it's never worse than doing nothing.

### Mocking `SmartEmptyState`

There is **no global mock** in `setup.ts`. The real component renders type-specific copy (`"No messages yet"`, `"No skills added"`, etc.) and several tests assert on that copy. Mock locally in test files that need to control props; leave un-mocked everywhere else to get the real UI.

```tsx
// Only when you need to control the CTA click
vi.mock("@/components/SmartEmptyState", () => ({
  SmartEmptyState: ({ type, onAction }: { type: string; onAction?: () => void }) => (
    <div data-testid="smart-empty-state" data-type={type}>
      <p>{type}</p>
      {onAction && (
        <button data-testid="cta" onClick={onAction}>
          Add {type}
        </button>
      )}
    </div>
  ),
}));
```

### Feature-based imports in tests

Tests import components via barrel files from feature folders:

```tsx
// ✅ Correct (admin)
import { HeroEditor } from "@/features/hero-content";
import { SkillsManager } from "@/features/skills";

// ✅ Correct (portfolio)
import { HeroSection } from "@/features/hero";
import { ProjectsSection } from "@/features/projects";
```

### React Query state coverage

Every page that uses `useQuery` should have at least three tests:

1. `isLoading` → skeleton/loader
2. `isError` → friendly error message + Retry
3. `isEmpty` (data is `[]`) → empty state

See `artifacts/admin/src/test/SkillsManager.states.test.tsx` for the canonical pattern.

### Mocking Clerk in admin component tests

`artifacts/admin/src/test/helpers.tsx` provides:

- `renderAdmin(ui, partialClerkState)` — wraps in `QueryClientProvider` and sets the per-test Clerk state
- `setClerk({...})` — mutates the hoisted Clerk state ref before each test
- `MockProviders` — passthrough for simple cases

Use it for any component that reads `useAuth` or `useAuthUser`.

### Auth test specifics

The auth module (`auth-token.ts`) uses module-level singletons. Tests must call `_resetAuthTokenGetter()` in `beforeEach` to reset the state. The kill switch (`AUTH_MISSING_KILL_SWITCH`) is set to `false` by default — tests that expect the handler to fire will pass; tests that expect the kill switch to suppress must flip it.

Key test files for the auth layer:

- `src/lib/auth-token.test.ts` (23 tests) — getter, shape checks, auth-ready gate, debounce, kill switch
- `src/lib/api-client.test.ts` (9 tests) — abort on null token, public request unaffected, CSRF, timeout, network error
- `src/test/ProtectedRoute.auth.test.tsx` (9 tests) — loading/signed-in/access-denied/bfcache/constants
- `src/test/SignInPage.test.tsx` (5 tests) — loading/signed-in/forceRedirectUrl/POST_SIGN_IN_URL

### 🚨 NO MODULE MOCKING for internal contracts (Strict Rule)

> **Historical proof:** [`TEST_INTEGRITY_SCORECARD.md`](../TEST_INTEGRITY_SCORECARD.md) — Phase 2 found 3 tests that were **passing on the wrong layer** because they mocked the very module they were supposed to be testing. They looked green in CI but would not have caught a single bug in the real client.

**Rule (must-follow):**

1. **Never mock internal modules you own** (e.g. `@/lib/api-client`, `@workspace/auth`, `@/lib/csrf`, `artifacts/api-server/src/lib/env`) directly with `vi.mock("@/lib/api-client", () => ({ api: { ... } }))`.
   - This is the **hallucinated-test anti-pattern.** You end up asserting against your mock, not your code. The mock is the oracle, so the test can never fail even when the real code is broken.
2. **Always intercept at the network boundary** — `vi.stubGlobal("fetch", ...)` or MSW. The real client code (URL construction, header assembly, body serialization, response parsing, error handling) must run.
3. **For auth, use a structurally-valid JWT** — header.payload.signature, decodable payload, future `exp`. A hardcoded `"mock-token"` string is a smell.
4. **For setup files (e.g. `src/test/setup.ts`):** mocks of shared libraries are fine, but **never globally mock the library a specific test is supposed to be exercising.** The per-test `vi.mock("@workspace/auth", ...)` override in `ProtectedRoute.auth.test.tsx` exists precisely because the setup's global mock was hiding the bug. If you need to unmock in a specific test, do it explicitly with `vi.mock("@workspace/auth", async (importOriginal) => importOriginal())` and add a comment explaining why.

**Allowed exceptions (where module mocking is fine):**

- Mocking **third-party libraries** you don't own (`@supabase/supabase-js`, `@clerk/clerk-react`'s UI surface when you need to control `useAuth`/`useUser` return shape) — you ARE testing your integration with their API surface, and the boundary is well-defined.
- Mocking **infrastructure adapters** (`supabase-client.ts` at the network layer, the `cv-generator` PDF builder) — these are external-world interfaces, not the unit under test.
- Mocking for **specific render-output control** (e.g. `SmartEmptyState` so the test can assert on the CTA's `onAction` wiring without re-rendering the entire empty state machine).

**Self-check before opening a PR with new tests:**

- [ ] Did I `vi.mock("@/lib/<X>")` where `<X>` is the unit I'm testing? → **Refactor to fetch-level interception.**
- [ ] Does the test still pass if I introduce a real bug in the unit under test? → **Mutate the source and re-run. If the test still passes, it's hallucinated.**
- [ ] Do my shape assertions use `toEqual` (or value-level checks) for response payloads? → **Required.** `toHaveProperty("field")` is not enough — see the `updatedAt: "BUG"` mutation in TEST_INTEGRITY_SCORECARD.md Phase 3.
- [ ] For dynamic fields (timestamps, IDs), use a regex / type check, not exact equality — but still **assert the field's type and shape**.

## Clerk E2E auth setup

The Admin UI is gated by Clerk. In CI / a fresh sandbox without Clerk credentials, the page mounts and stays in its **"Loading…"** state forever (the Clerk auth bridge waiting on `isLoaded`).

### 4-step remediation for CI

1. **Add a Clerk dev test user** in your Clerk dashboard. Note the email and password.
2. **Configure repo secrets** in GitHub: `Settings → Secrets → Actions`:
   - `CLERK_TEST_EMAIL` = the test user's email
   - `CLERK_TEST_PASSWORD` = the test user's password
3. **Run the auth setup** locally (or wait for CI):
   ```bash
   pnpm exec playwright test --project=setup
   ```
   This drives the real Clerk sign-in form, captures the cookies, and writes `playwright/.auth/admin.json`.
4. **Add `test.use({ storageState })`** to any spec that needs the signed-in UI:
   ```ts
   import { resolve } from "path";
   const STORAGE_STATE = resolve(process.cwd(), "playwright/.auth/admin.json");
   test.use({ storageState: STORAGE_STATE });
   ```

### Fallback behavior

If the env vars are missing or Clerk's API is unreachable, `auth.setup.ts` writes a **stub** storage state with a `__clerk_test_mode_reason` localStorage entry documenting why. The dependent spec still runs; it lands on the "Loading…" state and the spec's tolerant assertion accepts it (Loading / sign-in / form are all valid terminal states for `/cv-manager`).

This means the E2E suite is **never broken** by an unreachable Clerk — it gracefully degrades from full-flow to API-contract-only verification.

## Vitest config gotcha

The monorepo's `@workspace/ui` source files contain `import { jsxDEV } from "react/jsx-dev-runtime"` and `import * as React from "react"`. Vite 7's resolver cannot find these from the lib workspace's context. Both `artifacts/admin/vitest.config.ts` and `artifacts/portfolio/vitest.config.ts` therefore need:

```ts
// In test config
server: { deps: { inline: [/^@workspace\//, /@radix-ui\//, /react-hook-form/, /recharts/] } },

// In resolve.alias (pointing at the pnpm-resolved react entry)
react: "<root>/node_modules/.pnpm/react@19.1.0/node_modules/react",
"react-dom": "<root>/node_modules/.pnpm/react-dom@19.1.0_react@19.1.0/node_modules/react-dom",
"react/jsx-dev-runtime": "<root>/node_modules/.pnpm/react@19.1.0/node_modules/react/jsx-dev-runtime",
"react/jsx-runtime": "<root>/node_modules/.pnpm/react@19.1.0/node_modules/react/jsx-runtime",
```

Without this, **every test file that imports from `@workspace/ui` fails to load** with `Failed to resolve import "react/jsx-dev-runtime"`. Don't remove these aliases during a "cleanup" — they're load-bearing.

## Pre-commit hooks (husky + lint-staged)

The repo uses **husky** and **lint-staged** to enforce quality gates before every commit:

- **`pre-commit`**: runs lint-staged (ESLint fix + typecheck on staged `.ts/.tsx` files, Prettier format on `.json/.md`)
- **`commit-msg`**: enforces conventional commit format via commitlint (`@commitlint/config-conventional`)

Installation is automatic via `pnpm install` (the `prepare` script runs `husky`). To bypass hooks (emergency only):

```bash
git commit --no-verify -m "fix: urgent hotfix"
```

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every PR:

1. **typecheck** — `pnpm run typecheck` (libs + all 3 apps)
2. **component-tests** — `pnpm run test` against the full monorepo (287 tests across 121 files)
3. **bundle-analysis** — builds portfolio + admin, reports bundle sizes, fails if any JS chunk exceeds 300KB
4. **e2e** — spins up `api-server`, `admin`, and `portfolio` dev servers, waits for them to bind, runs the Playwright `setup` project, then the E2E suite

On failure, test reports, screenshots, and bundle analysis are uploaded as workflow artifacts (7-day retention).

## Pre-existing stderr noise (safe to ignore)

These are jsdom and React limitations — they appear in stderr but do not affect test outcomes:

- `Error: Not implemented: window.scrollTo` — jsdom limitation in `ProjectDetail.smoke.test.tsx`
- `Error: Not implemented: navigation (except hash changes)` — jsdom limitation in `HeroSection.cv-download.test.tsx`
- `React does not recognize the 'validationRules' prop` — pre-existing UI primitive behavior in `ContactSection.test.tsx`

If a new noise pattern appears, file it as a test-infra ticket; don't suppress it in production code.
