/**
 * Nonce-based Content Security Policy for the admin SPA.
 *
 * The admin is a static Vite build served from Vercel's CDN, so the CSP
 * cannot be baked into the bundle or set once: every HTML response needs a
 * *fresh* nonce. `middleware.ts` at the project root generates one per
 * request, stamps it into inline scripts that use the `__CSP_NONCE__`
 * placeholder, and attaches the policy built here as the
 * `Content-Security-Policy` header.
 *
 * This module is deliberately dependency-free: Vercel bundles it into the
 * edge middleware at deploy time, so it must not import workspace packages
 * or rely on Vite-specific aliases.
 */

/** Placeholder replaced with a per-request nonce by the routing middleware. */
export const NONCE_PLACEHOLDER = "__CSP_NONCE__";

/** Supabase project the admin reads/writes its data from. */
const SUPABASE_URL = "https://txnuvpxhghxiwynhtbvo.supabase.co";
/** API server (CV generation, contact endpoints, CSP reports). */
const API_URL = "https://portfolio-builder-api-six.vercel.app";
/** CSP violation reports are POSTed here (rate-limited, unauthenticated). */
const CSP_REPORT_URL = `${API_URL}/api/v1/csp-report`;

/**
 * Returns a cryptographically-random CSP nonce. Falls back to a
 * Math.random-based value only on runtimes without Web Crypto.
 */
export function generateNonce(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * Builds the strict, nonce-based CSP header value for the admin SPA.
 *
 * Clerk (authentication) is the only third party: it loads resources from
 * the frontend API (`*.clerk.accounts.dev`), injects hosted sign-in frames
 * and fetches user/org data. The policy follows Clerk's own CSP guidance.
 * No `'unsafe-inline'` in script-src — inline event-handler attributes and
 * non-nonce'd inline scripts are blocked.
 */
export function buildCsp(nonce: string): string {
  const supabaseHost = new URL(SUPABASE_URL).host;
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    `script-src 'self' 'nonce-${nonce}' https://*.clerk.accounts.dev`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.clerk.accounts.dev",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: https://img.clerk.com https://*.clerk.accounts.dev",
    `connect-src 'self' ${SUPABASE_URL} wss://${supabaseHost} https://*.clerk.accounts.dev https://api.clerk.com https://clerk.com ${API_URL}`,
    "frame-src 'self' https://*.clerk.accounts.dev https://accounts.clerk.com",
    "worker-src 'self' blob:",
    `report-uri ${CSP_REPORT_URL}`,
  ];
  return directives.join("; ");
}

/**
 * Stamps a per-request nonce into any script tag that uses the
 * `__CSP_NONCE__` placeholder. Returns the input unchanged when the
 * placeholder is absent.
 */
export function transformHtml(html: string, nonce: string): string {
  if (!html.includes(NONCE_PLACEHOLDER)) return html;
  return html.split(NONCE_PLACEHOLDER).join(nonce);
}
