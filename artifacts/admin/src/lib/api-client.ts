/**
 * Public API surface for the admin transport layer.
 *
 * Re-exports the resource definitions (`api`) and the low-level transport
 * helpers. The internals live in `request-core.ts` (fetch + auth + retry +
 * navigation abort) and `csrf.ts` (CSRF token fetch); this barrel exists so
 * existing `import ... from "@/lib/api-client"` call sites and test mocks
 * keep working unchanged.
 */
export { api } from "./api-resources";
export { request, publicRequest, beginRequestGroup, abortAllRequests } from "./request-core";
export { getCsrfToken } from "./csrf";
export type { CvSettings } from "./request-core";
export type { User } from "@workspace/supabase/types";
