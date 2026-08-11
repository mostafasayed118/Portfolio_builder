# Phase 2 Tasks - 30 Tasks

## TASK-001 ✅ | [lib/db] Add barrel export (index.ts)

- **What**: Missing barrel export in lib/db/src prevents clean imports
- **Where**: lib/db/src/
- **Fix**: Create index.ts exporting all functions

## TASK-002 ✅ | [lib/validation] Add barrel export (index.ts)

- **What**: Missing barrel export in lib/validation/src
- **Where**: lib/validation/src/
- **Fix**: Create index.ts exporting all functions

## TASK-003 🟡 | [api-server] Remove CSP TODO comment or implement nonce-based CSP

- **What**: CSP has TODO for nonce-based CSP migration
- **Where**: artifacts/api-server/src/app.ts:32
- **Fix**: Evaluate if nonce CSP is needed or remove the TODO

## TASK-004 🔴 | [api-client] Remove duplicate User interface

- **What**: User interface defined locally while also imported
- **Where**: artifacts/admin/src/lib/api-client.ts:84-91
- **Fix**: Remove duplicate interface definition

## TASK-005 🟡 | [route-helpers] Remove `as unknown as Response` casts

- **What**: Type safety casts in runCollectionQuery
- **Where**: artifacts/api-server/src/lib/route-helpers.ts:155,197
- **Fix**: Refactor to use explicit returns

## TASK-006 🔴 | [CvManager] Fix handleRemove to use DELETE endpoint

- **What**: handleRemove calls updateSettings with empty string
- **Where**: artifacts/admin/src/pages/CvManager.tsx:97-112
- **Fix**: Use api.cv.deleteSettings() if endpoint exists

## TASK-007 🟡 | [storage.ts] Add AbortSignal to uploadFileWithProgress

- **What**: Uploads cannot be cancelled
- **Where**: lib/db/src/storage.ts:93-148
- **Fix**: Accept and handle AbortSignal

## TASK-008 🟡 | [supabase/client.ts] Use logWarn instead of console.warn

- **What**: Inconsistent logging
- **Where**: lib/supabase/src/client.ts:13
- **Fix**: Import from @workspace/logging

## TASK-009 🟡 | [admin/env.ts] Use logWarn instead of console.warn

- **What**: Inconsistent logging
- **Where**: artifacts/admin/src/lib/env.ts:23,55
- **Fix**: Import from @workspace/logging

## TASK-010 🟡 | [portfolio/env.ts] Use logWarn instead of console.warn

- **What**: Inconsistent logging
- **Where**: artifacts/portfolio/src/lib/env.ts
- **Fix**: Import from @workspace/logging

## TASK-011 🔴 | [ProjectsSection] Fix completedAt mapping

- **What**: Uses current year instead of DB value
- **Where**: artifacts/portfolio/src/components/ProjectsSection.tsx:73
- **Fix**: Map from dbProject.completed_at

## TASK-012 🔴 | [seed.ts] Parallelize DB operations

- **What**: Sequential DB calls slow seed performance
- **Where**: artifacts/api-server/src/routes/admin/seed.ts
- **Fix**: Use Promise.all for independent operations

## TASK-013 🟡 | [auth-token.ts] Reduce initial wait time

- **What**: 3s wait is too long for first API call
- **Where**: artifacts/admin/src/lib/auth-token.ts:66
- **Fix**: Change to 750ms with 250ms retry

## TASK-014 🟡 | [singleton-upsert] Document any cast rationale

- **What**: `as unknown as SupabaseClient<any>` escape hatch
- **Where**: artifacts/api-server/src/lib/singleton-upsert.ts:42
- **Fix**: Add detailed comment explaining why it's safe

## TASK-015 🟡 | [adminAuth.ts] Remove debug logging in production

- **What**: JWT verification logs at info level
- **Where**: artifacts/api-server/src/middleware/adminAuth.ts:210-217
- **Fix**: Change to debug level

## TASK-016 ✅ | [auth-token.ts] Syntax error - extra closing brace

- **What**: Extra `}` caused Vite build failure
- **Where**: artifacts/admin/src/lib/auth-token.ts:102
- **Status**: Already fixed

## TASK-017 ✅ | [api-client.ts] User imported from types

- **What**: Add User to type imports
- **Where**: artifacts/admin/src/lib/api-client.ts:1
- **Status**: Already fixed in uncommitted changes

## TASK-018 ✅ | [vitest.config.*] React alias for pnpm compatibility

- **What**: Vite 7 resolver can't find react/jsx-runtime in pnpm store
- **Where**: artifacts/admin/vitest.config.ts, artifacts/portfolio/vitest.config.ts
- **Status**: Already fixed in uncommitted changes

## TASK-019 🔴 | [route-helpers] Add UUID validation to resolveTargetUserId

- **What**: Non-UUID userId causes unindexed DB scan
- **Where**: artifacts/api-server/src/lib/route-helpers.ts:51
- **Fix**: Add z.string().uuid() validation

## TASK-020 🟡 | [cv.ts] Add deleteSettings to api-client

- **What**: Missing method for CV deletion
- **Where**: artifacts/admin/src/lib/api-client.ts
- **Fix**: Add cv.deleteSettings() method

## TASK-021 🟡 | [api-response] Add more helper functions

- **What**: Common response patterns could be extracted
- **Where**: artifacts/api-server/src/lib/api-response.ts
- **Fix**: Add wrap/result pattern if beneficial

## TASK-022 🟡 | [error-messages] Create centralized error message helper

- **What**: Error messages scattered in admin components
- **Where**: artifacts/admin/src/lib/error-messages.ts
- **Status**: Already exists - check if used consistently

## TASK-023 🟡 | [errorHandler] Stack trace redaction

- **What**: Stack traces in production error logs
- **Where**: artifacts/api-server/src/middleware/errorHandler.ts
- **Fix**: Redact stack in production

## TASK-024 🟡 | [query-keys.ts] Ensure consistent React Query keys

- **What**: Query keys should be centralized
- **Where**: artifacts/admin/src/lib/query-keys.ts
- **Check**: Verify usage across codebase

## TASK-025 🔴 | [api-server] Move getSupabaseClient into route handlers

- **What**: Some routes call getSupabaseClient at module scope
- **Where**: Various admin routes
- **Fix**: Move to handler level

## TASK-026 🟡 | [storage.ts] Add missing tests

- **What**: Storage functions lack testing
- **Where**: lib/db/src/storage.test.ts
- **Fix**: Add tests for uploadFileWithProgress abort

## TASK-027 🟡 | [api-zod] Add delete schema for cv settings

- **What**: Need schema for DELETE endpoint
- **Where**: lib/api-zod/src/cv.ts
- **Fix**: Add delete schema or handle empty body

## TASK-028 🟡 | [cv.ts] Add DELETE /cv/settings endpoint

- **What**: No proper endpoint to delete CV
- **Where**: artifacts/api-server/src/routes/cv.ts
- **Fix**: Add endpoint that removes storage + DB row

## TASK-029 🟡 | [adminAuth] Superadmin check for API key users

- **What**: API key users should NOT be auto superadmin
- **Where**: artifacts/api-server/src/middleware/adminAuth.ts:188
- **Fix**: Change role to "user"

## TASK-030 🟡 | [seed.ts] Parallelize SELECT checks

- **What**: Sequential selects for existing rows
- **Where**: artifacts/api-server/src/routes/admin/seed.ts
- **Fix**: Use Promise.all for parallel checks

## Execution Notes

Tasks marked ✅ are already complete in uncommitted changes.
Tasks marked 🔴 are critical bugs/security issues.
Tasks marked 🟡 are quality improvements.

Starting execution from TASK-001.
