# Changelog

All notable changes to Portfolio-Fixer are documented here.

---

## 2026-06-06 — JWT Expiration Handling, 401 Auto-Refresh, Phase 2 Refactor

### Fixed (Critical)

- **JWT expiration not detected** (TASK-AUTH-08): Added `isJwtExpired()` to decode JWT `exp` claim with a 30-second buffer. Integrated into `isTokenLikelyValid()` — expired tokens are now rejected before the request is sent. Eliminated the "stuck on dashboard with 401 errors" scenario caused by Clerk's ~59-minute token expiry.
- **401 auto-refresh not retrying** (TASK-AUTH-09): `doFetch()` now force-refreshes the token (calls `getClerkToken(true)`) and retries once on 401. Only after the second 401 does it fire the auth-missing handler. The user gets a seamless session refresh instead of an immediate redirect.

### Added

- **`isJwtExpired(token)`** (`auth-token.ts`): Decodes JWT base64url payload, checks `exp` claim with 30-second buffer. Returns `false` on invalid structure (graceful degradation).
- **`getClerkToken(forceRefresh)`** (`auth-token.ts`): New parameter. When `true`, re-invokes Clerk's `getToken()` to bypass any stale session cache. Used by api-client's 401 retry path.
- **`fireAuthMissingFromApiClient()`** (`auth-token.ts`): Public API for other modules to fire the auth-missing handler on server-side 401s. Goes through the same `_authReady` gate and debounce.
- **`doFetch()` 401 retry** (`api-client.ts`): On 401, force-refreshes token and retries once (`MAX_401_RETRIES = 1`). After second 401, fires auth-missing handler.
- **Auth file split** (Phase 2A): `auth.tsx` (375 lines) split into `ClerkAuthBridge.tsx` (120 lines), `ProtectedRoute.tsx` (75 lines), `SignInPage.tsx` (55 lines), `AdminProviders.tsx` (30 lines), `constants.ts` (30 lines), `diag.ts` (10 lines).
- **API resources extraction** (Phase 2A): `api-client.ts` (365 lines) split into `api-client.ts` (~230 lines) + `api-resources.ts` (~133 lines). All 25 import sites continue to work via re-export.
- **QueryClient HMR leak fix** (Phase 2B): Moved `QueryClient` instantiation from module scope to component scope (`useState(() => new QueryClient(...))`) to prevent stale cache on Vite HMR reloads.
- **Overview lazy-loaded** (Phase 2B): `import Overview from "@/pages/Overview"` changed to `lazy(() => import("@/pages/Overview"))` for smaller initial bundle.

### Changed

- **`isTokenLikelyValid()`** now calls `isJwtExpired()` — tokens with `exp` claim in the past are rejected before the request is sent. The docstring was updated to explain the bug history.
- **`getClerkToken()`** now accepts `forceRefresh` parameter. Default is `false` for backward compatibility.
- **`ClerkAuthBridge.tsx`**: Token getter registration updated to pass through `forceRefresh` parameter.
- **`api-client.ts`**: `request()` now exported (was internal). `userIdParam()` moved to `api-resources.ts`.
- **Test count**: 287 → 301 (14 new tests covering JWT expiration, forceRefresh, auth-ready gate, bfcache, kill switch).

### Removed

- **`auth.tsx`**: Replaced by 6 focused component files in `components/` directory.
- **`decodeJwtPayload()`** and `isTokenExpired()`: Removed (replaced by `isJwtExpired()` which is simpler and more reliable).
- **`userIdParam()`** from `api-client.ts`: Moved to `api-resources.ts`.

---

## 2026-06-05 — Auth Hardening, Health Check Rewrite, Master Audit

### Fixed (Critical)

- **Client-side `isTokenExpired` false positive** (TASK-AUTH-01): Removed the `decodeJwtPayload()` and `isTokenExpired()` functions that were incorrectly classifying Clerk JWTs as expired. The server is the source of truth for token validity; server-side 401s now fire the auth-missing handler.
- **Auth-missing handler caused logout loop** (TASK-AUTH-02): Added `setAuthReady` gate that prevents the handler from firing before Clerk confirms `isLoaded && isSignedIn`. Added `AUTH_MISSING_KILL_SWITCH` compile-time flag (default: `false`) as an emergency escape hatch.
- **JWT template not used** (TASK-AUTH-03): Frontend now calls `getToken({ template: 'admin' })` to include the email claim in the JWT. The template name is configurable via `VITE_CLERK_JWT_TEMPLATE` (default: `admin`). Without a configured template, admin requests return 401.
- **bfcache restore returned stale auth state** (TASK-AUTH-04): Added `pageshow` event listener in `ProtectedRoute` that forces a full page reload when the browser restores from back-forward cache.

### Added

- **Server-side 401 detection** (TASK-AUTH-05): `api-client.ts` now detects 401 responses from authenticated requests and fires the auth-missing handler via `fireAuthMissingFromApiClient()`.
- **Auth-missing handler no-cleanup registration** (TASK-AUTH-06): Handler is registered once app-wide with no cleanup to prevent a window where the handler is absent during Clerk's hydration state transitions.
- **Comprehensive auth diagnostic logging** (TASK-AUTH-07): All auth components log their state transitions with `[auth-guard]` and `[auth-token]` prefixes for DevTools debugging.
- **`/api/healthz` endpoint rewrite** (TASK-HEALTH-01): Mounted at `/api` (not `/api/v1`). Supports both GET and HEAD. No auth, no DB ping, no rate limiting, no cache. Returns `{ status, timestamp, uptime, environment }` for liveness probes.

### Changed

- **`auth-token.ts`**: Removed `decodeJwtPayload`, `isTokenExpired`, `_lastExpiredWarn`. Added `setAuthReady()`, `fireAuthMissingFromApiClient()`, `AUTH_MISSING_KILL_SWITCH`.
- **`api-client.ts`**: CSRF guard changed from `if (body && ...)` to `if (STATE_CHANGING.has(method))` (covers bodyless state-changing requests). Added 401 detection. Navigation signal cleanup with `removeEventListener`.
- **`ProtectedRoute`**: Added `pageshow` listener for bfcache defense. Added `useAuth()` hook for `(isLoaded && !isSignedIn)` detection.
- **`SignInPage`**: `forceRedirectUrl` hardcoded to `POST_SIGN_IN_URL`. Added `useEffect` belt-and-braces navigate.
- **`ClerkAuthBridge`**: Token getter now uses JWT template. `setAuthReady` gating. Handler registered without cleanup, using refs for latest values.

### Fixed (Health Check)

- **`/api/v1/healthz` -> `/api/healthz`**: Health check moved from under `/api/v1` to the top-level `/api` prefix so the path is stable across versioning. Legacy path returns 404.
- **HEAD support**: Added `router.head("/healthz", ...)` handler. HEAD requests return 200 with no body per RFC 9110 §9.3.2.
- **No DB ping**: The old health check queried `site_settings` (readiness check). The new check is a pure liveness check: no I/O, ~0.01ms.

### Tests

- **`auth-token.test.ts`**: 20 → 23 tests. Added: handler fires when auth ready, not-ready guard, mid-session arming, shape checks (too short, whitespace, empty).
- **`api-client.test.ts`**: 6 → 9 tests. Added: abort on null token, abort on shape-invalid token, public request unaffected.
- **`ProtectedRoute.auth.test.tsx`**: 5 → 9 tests. Added: bfcache reload, no-reload on normal pageshow, hardcoded `SIGN_IN_URL`/`POST_SIGN_IN_URL` constants.
- **`SignInPage.test.tsx`**: 3 → 5 tests. Added: `forceRedirectUrl` matches `POST_SIGN_IN_URL`, constant is a literal path.
- **`health.test.ts`**: 2 → 10 tests. Added: spec shape, env override, no-auth, no-csrf, request-id, security headers, HEAD body shape, legacy 404.
- **`e2e-routes.test.ts`**: Updated health tests to use `/api/healthz`.
- **`routes/health.test.ts`**: 6 → 6 tests. Rewritten for new contract.
- **`rateLimiter.test.ts`**, **`csrf.test.ts`**: Updated health paths.

### Added (Docs)

- Full Master Audit Report in conversation (score: 82/100, found 3 P0, 7 P1, 8 P2 issues).
- `VITE_CLERK_JWT_TEMPLATE` to `.env.example` with documentation.
- Verified all 287 tests pass across admin, api-server, portfolio.
- Typecheck clean, lint clean.

---

## 2026-06-04 (session 16) — Form Tests Fixed, Audit Log, Preview, Sentry

### Fixed

- **6 pre-existing form-integration test failures** (TASK-031): Updated `ExperienceManager`, `ProjectsManager`, `SkillsManager` tests to match actual button text and element queries — admin now passes 263/263
- **CertificationsSection.tsx type error** (TASK-032): Reverted incorrect field rename; local `Certification` type correctly uses `image_url`/`cert_url`

### Added

- **CSV export for all managers** (TASK-033): `ProjectsManager`, `ExperienceManager`, `CertificationsManager` now have Export buttons
- **Audit log backend + admin UI** (TASK-034): `GET /admin/audit` with pagination + entity filter; new `/audit` admin page
- **Draft preview endpoint** (TASK-035): `GET /admin/preview/:entityType/:entityId` bypasses `is_published` — superadmin-only
- **Sentry integration** (TASK-036): `setCaptureError()` adapter in `@workspace/logging`; wired into both apps behind `VITE_SENTRY_DSN`

---

## 2026-06-04 (session 15) — 30-Task Security & DX Sweep
