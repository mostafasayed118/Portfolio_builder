# Verification Report — P0/P1 Fixes

**Date:** 2026-06-05  
**Scope:** 5 issues from the Master Audit Report (P0-1 through P1-11)  
**Overall Status:** ✅ All verified

---

## Issue-by-Issue Verification

### P0-1: CV Settings Auth Mismatch

**Status: ✅ ALREADY FIXED**

📁 File: `artifacts/admin/src/lib/api-client.ts`  
📍 Lines: 335-339  
💻 Code:

```ts
cv: {
  getSettings: () => request<CvSettings>("GET", "/cv/settings"),          // ✅ uses request() (authenticated)
  updateSettings: (data: { objectPath: string; fileName: string }) =>
    request<CvSettings>("PUT", "/cv/settings", data),                     // ✅ uses request() (authenticated)
  deleteSettings: () => request<void>("DELETE", "/cv/settings"),          // ✅ uses request() (authenticated)
},
```

📁 File: `artifacts/api-server/src/routes/admin/cv.ts`  
📍 Lines: 1-7 (router setup)  
💻 Code:

```ts
const router: IRouter = Router();
router.get("/settings", async (_req: Request, res: Response) => { ... });
router.put("/settings", doubleCsrfProtection, async (req: Request, res: Response) => { ... });
router.delete("/settings", doubleCsrfProtection, async (req: Request, res: Response) => { ... });
```

📁 File: `artifacts/api-server/src/routes/admin/index.ts`  
📍 Lines: 21, 28  
💻 Code:

```ts
import cvRouter from "./cv"; // ← resolves to routes/admin/cv.ts (NOT public cv.ts)
router.use("/cv", cvRouter); // ← behind adminAuth middleware
```

✅ Proof: All three CV operations use `request()` (authenticated path → `/api/v1/admin/cv/settings`). The server's `admin/cv.ts` routes are mounted under the admin router which has `adminAuth` middleware applied (line 19: `router.use("/admin", adminAuth, adminRouter)`). The public CV download is a separate route in `routes/cv.ts` (unauthenticated, as intended).

---

### P0-2: Abort Signal Placement

**Status: ✅ ALREADY FIXED**

📁 File: `artifacts/admin/src/lib/api-client.ts`  
📍 Lines: 144-152 (BEFORE fetch), 171-175 (CLEANUP in finally)  
💻 Code (before fetch):

```ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

// Link the per-navigation signal so navigation aborts in-flight requests
const navSignal = getActiveSignal();
const onAbort = () => controller.abort();
if (navSignal) {
  navSignal.addEventListener("abort", onAbort, { once: true }); // ✅ registered BEFORE fetch
}

// ... fetch ...
```

💻 Code (cleanup):

```ts
} finally {
  clearTimeout(timeoutId);
  if (navSignal) {
    navSignal.removeEventListener("abort", onAbort);              // ✅ cleaned up in finally
  }
}
```

✅ Proof: Navigation signal is registered BEFORE `fetch()` is called (line 151) and properly cleaned up in the `finally` block (line 174). The abort handler fires for in-flight requests during navigation.

---

### P1-10: CSRF on DELETE Requests

**Status: ✅ ALREADY FIXED**

📁 File: `artifacts/admin/src/lib/api-client.ts`  
📍 Lines: 138-141  
💻 Code:

```ts
if (STATE_CHANGING.has(method)) {
  // ✅ no body check — DELETE is included
  const csrfToken = await getCsrfToken();
  headers[CSRF_HEADER] = csrfToken;
}
```

Where `STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"])` (line 101).

✅ Proof: The condition is `STATE_CHANGING.has(method)` — no `body &&` guard. DELETE (bodyless) is included in the set. CSRF token is fetched and attached for all state-changing methods including DELETE.

---

### P1-11: Experience Zod vs DB Mismatch

**Status: ✅ ALREADY FIXED**

📁 File: `lib/api-zod/src/admin.ts`  
📍 Lines: 130-131  
💻 Code:

```ts
location: z.string().min(1, "Location is required").max(150),   // ✅ required (min(1), no .optional())
period: z.string().min(1, "Period is required").max(50),        // ✅ required (min(1), no .optional())
```

✅ Proof: Both fields are `z.string().min(1).max(...)` with no `.optional()` or `.or(z.null())`. The database also requires these (`NOT NULL` in migration). Schema matches DB constraint. Additionally, the test file now includes validation assertions for missing fields.

---

### P1-1 to P1-5: Missing RLS Policies

**Status: ✅ ALREADY FIXED**

Confirmed via migration files `001_init.sql` through `043_add_section_variants.sql`:

| Table                    | Policy Name                                                   | Status                |
| ------------------------ | ------------------------------------------------------------- | --------------------- |
| `analytics_events`       | `public_insert_analytics` + `admin_all_analytics_events`      | ✅ Present (001/042)  |
| `users`                  | `admin_all_users`                                             | ✅ Present (043)      |
| `content_health_reports` | `admin_all_content_health_reports`                            | ✅ Present (043)      |
| `section_variants`       | `public_read_section_variants` + `admin_all_section_variants` | ✅ Present (043)      |
| `reorder_sections` RPC   | `is_admin()` check                                            | ✅ Present (038, 043) |

✅ Proof: All tables have RLS policies. Storage buckets use `is_admin()` (migration 037). The `reorder_sections` RPC validates authorization before executing.

---

## Test Results Summary

| Project               | Files | Tests | Status                                           |
| --------------------- | ----- | ----- | ------------------------------------------------ |
| @workspace/admin      | 53    | 287   | ✅ All passing                                   |
| @workspace/api-server | 33    | 270   | ✅ All passing                                   |
| @workspace/api-zod    | 1     | 29    | ✅ All passing (including fixed experience test) |
| Full typecheck        | —     | —     | ✅ Clean (tsc --build + per-app --noEmit)        |

**Pre-existing failures (NOT related to P0/P1):**  
3 tests in `lib/db/src/siteSettings.test.ts` — these test `updateLanguageSettings` and `upsertSiteSettings` which have mismatched error messages between tests and source code. These were failing before the audit and are a separate issue.

---

## One Real Fix Applied

**lib/api-zod/src/admin.test.ts** — Updated the `experienceSchema` test for "accepts all three type values" to include `location` and `period` fields (which are now required by the schema). Added 2 new validation tests for missing required fields.

---

## Manual Verification Checklist

⚠️ **MANUAL VERIFICATION CHECKLIST — Run these in the browser:**

### CV Manager

- [ ] Open admin → CV Manager → click "Load Settings" → no 401 error
- [ ] Upload a new CV PDF → success, file appears in list
- [ ] Click "Delete" on uploaded CV → success, file disappears

### Skills Manager

- [ ] Open admin → Skills → delete a skill → no 403 CSRF error
- [ ] Network tab: `DELETE /api/v1/admin/skills/:id` has `x-csrf-token` header

### Experience Editor

- [ ] Open admin → Experience → click "Add" → save with empty location → validation error (not 500)
- [ ] Save with empty period → validation error (not 500)
- [ ] Save with valid data → success

### Supabase Dashboard (SQL Editor)

- [ ] Run: `SELECT tablename, policyname FROM pg_policies WHERE schemaname='public';`
- [ ] Confirm `analytics_events`, `users`, `content_health_reports`, `section_variants` have policies
- [ ] Test `reorder_sections` RPC with non-admin key → should fail with "Unauthorized"

### Auth Flow

- [ ] Open admin in new tab → redirected to `/admin/sign-in`
- [ ] Sign in via Clerk → redirected to `/admin/overview`
- [ ] Open admin in a different tab → lands on `/admin/overview` (not sign-in)
- [ ] Hard refresh → lands on `/admin/overview` (bfcache defense working)
