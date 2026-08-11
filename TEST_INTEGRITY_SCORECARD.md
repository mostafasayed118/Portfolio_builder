# Test Integrity Audit — Scorecard

**Date:** 2026-06-03
**Author:** opencode (minimax-m3)
**Scope:** 3 critical tests + 1 mutation challenge + connection fix

---

## Phase 1 — Connection RCA

### Symptom

"Failed to load dashboard stats / Connection error" reappeared in the admin browser.

### Root Cause

**Port 3001 was held by `Dolphin Anty.exe` (PID 47588, an antidetect browser), NOT the api-server.**
The api-server had crashed at startup because it could not bind to 3001. The admin and portfolio Vite dev servers were still running on 5174 and 5173 respectively, so the browser rendered the UI but every `fetch()` to `http://localhost:3001` returned a 401 from Dolphin Anty instead of the api-server's responses.

### Proof

```
Get-CimInstance Win32_Process | Where-Object ProcessId -EQ 47588
  Name        : Dolphin Anty
  Path        : C:\Program Files\Dolphin Anty\Dolphin Anty.exe
  CommandLine : "C:\Program Files\Dolphin Anty\Dolphin Anty.exe "

Get-NetTCPConnection -LocalPort 3001
  LocalPort OwningProcess State
  3001     47588         Listen
```

### Fix

Moved api-server to **port 3002** (free, confirmed). Three files changed:

- `artifacts/api-server/.env` — `PORT=3002`
- `.env.local` — `VITE_API_URL=http://localhost:3002`
- `artifacts/admin/.env.local` — `VITE_API_URL=http://localhost:3002`

Admin + portfolio Vite dev servers were restarted to pick up the new env.

### Verification

| Check                                                    | Result                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| `GET http://localhost:3002/api/v1/healthz`               | `200 {"status":"ok","db":{"status":"ok","latency_ms":990}}`  |
| `GET http://localhost:5174/src/lib/env.ts` (Vite-served) | `VITE_API_URL: "http://localhost:3002"`                      |
| CORS preflight from `Origin: http://localhost:5174`      | `204` + `Access-Control-Allow-Origin: http://localhost:5174` |
| `GET /api/v1/csrf-token` with admin origin               | `200`, `ACAO: http://localhost:5174`                         |

---

## Phase 2 — Test Integrity Audit

### Audit Target 1: `ContactForm.validation.test.tsx`

**Verdict: MOSTLY REAL, but with a critical masking bug.**

The test correctly uses the real `useFormValidation` hook and real `contactFormSchema`. The network tests intercept `fetch` at the global level. **However**, the email validation test asserted only `/valid email/i` — which matches the `SmartInput` component's LOCAL hardcoded message (`"Please enter a valid email"`), not the schema's real message (`"Email is not a valid email address"`).

**Mutation test before fix:** Changed `lib/validation/src/rules.ts` `email()` to return `"Email is broken"`. Test still PASSED. The test was NOT catching schema-level mutations because it matched the wrong layer.

**Fix:** Replaced `/valid email/i` with an exact assertion against the schema's message in the `<p id="error-email">` element.

**Mutation test after fix:** Same mutation now FAILS the test.

**New test count:** 17 (was 16). The new test `rejects an invalid email after blur (asserts REAL schema message)` proves the form is bound to the real schema.

---

### Audit Target 2: `SkillsManager.states.test.tsx`

**Verdict: FAKE — the test was testing the component's reaction to a fake function.**

The test mocked `@/lib/api-client` at the MODULE level, injecting a `vi.fn()` for `api.skills.list()`. The real `api-client.ts` (URL construction, header assembly, body serialization, response parsing) **never ran**. Any bug in api-client would not be caught.

**Fix:** Removed the `vi.mock("@/lib/api-client", ...)` and replaced it with `vi.stubGlobal("fetch", ...)` — intercepting at the network boundary. The real `api.skills.list()` now runs end-to-end.

**New test:** `INTEGRITY: the real api-client constructs the correct URL, method, and accepts the real response shape` — asserts on the actual fetch URL and method, ensuring the real client code is exercised.

**Mutation test:** Changed `api-client.ts` `urlPrefix` from `/api/v1/admin` to `/api/v1/WRONG-PREFIX`. Test FAILED — the URL didn't match the expected pattern, so the data never loaded. **Bug caught.**

**New test count:** 5 (was 4).

---

### Audit Target 3: `ProtectedRoute.auth.test.tsx`

**Verdict: FAKE on two layers.**

1. Mocked `@workspace/auth` at the module level, returning hardcoded `{ user: "admin@test.com", isAdmin: true }`. The real `ClerkAuthBridge` (which derives `isAdmin` from the email allowlist, fetches DB role, etc.) **never ran**.
2. The setup file `src/test/setup.ts` ALSO globally mocks `@workspace/auth` with the same hardcoded values — so the test would pass even if the bridge broke.

**Fix:**

- Override the setup's global mock of `@workspace/auth` in the test file via `vi.mock("@workspace/auth", async (importOriginal) => importOriginal())` so the real `AuthContext` is used.
- Mock Clerk at its own boundary (`@clerk/clerk-react` — `useAuth`, `useUser`, `getToken`) with realistic data shape.
- Use a structurally-valid JWT for the token getter (3 parts, decodable payload, future `exp`).

**Mutation test:** Changed `auth.tsx` `if (!isAdmin)` to `if (!isAdmin || true)`. Test FAILED — the access denied page now always renders, so the test expecting the protected child broke. **Bug caught.**

**New test count:** 5 (was 5, but rewritten with deeper assertions).

---

## Phase 3 — Mutation Challenge on `cv.ts`

| #   | Mutation                                                                      | Expected    | Caught?                     | Test that caught it                                                                                           |
| --- | ----------------------------------------------------------------------------- | ----------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | `res.status(200)` → `res.status(500)` in GET /cv success path                 | Should fail | **YES**                     | `GET /api/v1/cv > returns PDF with correct headers when generateCvPdf succeeds`                               |
| 2   | Remove `fileName: settings?.file_name ?? null` from GET /cv/settings response | Should fail | **YES**                     | `GET /api/v1/cv/settings > returns correct response shape`                                                    |
| 3   | `res.setHeader("Content-Type", "application/pdf")` → `"text/html"`            | Should fail | **YES**                     | `GET /api/v1/cv > returns PDF with correct headers when generateCvPdf succeeds`                               |
| 4   | `updatedAt: settings?.updated_at` → `updatedAt: "BUG"`                        | Should fail | **YES (after Phase 7 fix)** | `GET /api/v1/cv/settings > returns correct response shape` AND `> returns null values when no settings exist` |

**Mutation #4 follow-up (Phase 7):** Replaced `toHaveProperty("updatedAt")` with a strict `toEqual({...})` shape assertion. For the "no settings" case, where `updatedAt` is dynamic (`new Date().toISOString()`), used a regex against the ISO 8601 format plus a `Number.isNaN(new Date(...).getTime())` sanity check. Both `updatedAt: "BUG"` mutations are now caught by both relevant tests.

**Final mutation score: 4/4 caught.**

---

## Final Scorecard

| Test                              | Before Audit                   | After Audit | Mutation Caught?        | Notes                                                        |
| --------------------------------- | ------------------------------ | ----------- | ----------------------- | ------------------------------------------------------------ |
| `ContactForm.validation.test.tsx` | Mixed (passed on wrong layer)  | **REAL**    | YES (schema email rule) | Now asserts against `<p id="error-email">` exact text        |
| `SkillsManager.states.test.tsx`   | **FAKE** (module mock)         | **REAL**    | YES (URL prefix)        | Now intercepts at `fetch` boundary; integrity test added     |
| `ProtectedRoute.auth.test.tsx`    | **FAKE** (workspace/auth mock) | **REAL**    | YES (access check)      | Overrides setup's global mock; uses realistic JWT            |
| `cv.test.ts` (mutation sample)    | **PARTIALLY REAL**             | **REAL**    | **4/4 caught**          | Phase 7: `toEqual` shape + ISO regex for dynamic `updatedAt` |

**Test counts after audit:**

- ContactForm: 16 → 17 (+1)
- SkillsManager: 4 → 5 (+1)
- ProtectedRoute: 5 → 5 (rewritten, no count change)
- cv (mutation target): 15 → 15 (assertions strengthened; mutation #4 now caught)

**Net integrity score: 3/3 audit targets fixed from FAKE/MIXED → REAL.**

---

## How to re-verify

```bash
# Phase 1: connection
curl http://localhost:3002/api/v1/healthz
# → {"status":"ok","db":{"status":"ok",...}}

# Phase 2: re-run all 3 audited tests
cd artifacts/portfolio && pnpm exec vitest run src/test/ContactForm.validation.test.tsx
cd artifacts/admin && pnpm exec vitest run src/test/SkillsManager.states.test.tsx src/test/ProtectedRoute.auth.test.tsx

# Phase 3: re-run mutation target
cd artifacts/api-server && pnpm exec vitest run src/test/routes/cv.test.ts
```

**Expected: 17 + 5 + 5 + 15 = 42 tests, all green.**
