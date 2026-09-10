/**
 * Nonce-based Content Security Policy for the portfolio SPA.
 *
 * The portfolio is a static Vite build served from Vercel's CDN, so the CSP
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

/** Supabase project the portfolio reads its content from. */
const SUPABASE_URL = "https://txnuvpxhghxiwynhtbvo.supabase.co";
/** API server powering the contact form and CV download. */
const API_URL = "https://portfolio-builder-api-six.vercel.app";
/** CSP violation reports are POSTed here (rate-limited, unauthenticated). */
const CSP_REPORT_URL = `${API_URL}/api/v1/csp-report`;
/** Cloudflare Turnstile (contact-form bot protection, when configured). */
const TURNSTILE_URL = "https://challenges.cloudflare.com";

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
 * Builds the strict, nonce-based CSP header value for the portfolio.
 *
 * - script-src: `'self'` covers the Vite bundles; `'nonce-*'` covers inline
 *   scripts that carry the middleware-injected nonce. No `'unsafe-inline'`,
 *   so inline event-handler attributes (e.g. `onload=`) are blocked.
 * - style-src keeps `'unsafe-inline'` — required for inline style
 *   attributes across the UI (styles cannot execute code).
 * - frame-src allows the OpenStreetMap embed and the Turnstile widget.
 * - connect-src lists the Supabase project (REST + realtime) and the API.
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
    `script-src 'self' 'nonce-${nonce}' ${TURNSTILE_URL}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' ${SUPABASE_URL} wss://${supabaseHost} ${API_URL} ${TURNSTILE_URL}`,
    `frame-src 'self' https://www.openstreetmap.org ${TURNSTILE_URL}`,
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
