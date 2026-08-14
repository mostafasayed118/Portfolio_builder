/**
 * Shared constants and configuration for the auth feature.
 *
 * Kept as a separate file so ClerkAuthBridge, ProtectedRoute, and
 * SignInPage can all import the same values without circular deps.
 */

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

/**
 * Hardcoded post-login destination. The spec is explicit:
 * "After Successful Login: ALWAYS redirect to `/admin/dashboard`"
 * — regardless of which page the user was on before, no `?redirect_url=`
 * passthrough, no last-route memory. `/overview` is the Admin app's
 * dashboard route (full URL: `/admin/overview`).
 */
export const POST_SIGN_IN_URL = "/overview";

/**
 * Hardcoded sign-in route. The Admin app is mounted at `/admin` (see
 * `import.meta.env.BASE_URL` in `App.tsx`), so the full URL is
 * `/admin/sign-in`. Kept as a constant so the guard and the post-login
 * fallback share a single source of truth.
 */
export const SIGN_IN_URL = "/sign-in";

/**
 * Bundle version marker for cache-busting verification.
 * Logged on mount so DevTools can confirm the latest source is running.
 */
export const BUNDLE_VERSION = "auth-fix-2026-06-05-jwt-template";

export { clerkPublishableKey };
