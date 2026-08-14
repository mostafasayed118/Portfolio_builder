/**
 * Vercel Routing Middleware — applies a nonce-based Content Security Policy
 * to every HTML response of the admin SPA.
 *
 * The admin is a static Vite build: its HTML lives as a cached file, so a
 * nonce-based CSP (which needs a *fresh nonce per response*) can be neither a
 * static header nor a meta tag (meta CSP ignores nonces). This middleware:
 *
 *   1. generates a random nonce,
 *   2. fetches the requested URL (routed to the SPA by the vercel.json
 *      rewrite),
 *   3. stamps the nonce into any `__CSP_NONCE__` placeholder in the HTML,
 *   4. returns the HTML with the matching Content-Security-Policy header.
 *
 * The internal fetch is guarded by an `x-csp-transform` header so the
 * subrequest never re-enters this middleware (which would recurse). If the
 * platform short-circuits subrequests instead, the guard is simply never
 * observed and the fetch returns the raw HTML directly — both paths work.
 * If the upstream fetch fails, the middleware passes through (no CSP), which
 * is today's behavior and never breaks the site.
 *
 * NOTE: this file must stay self-contained (no imports). Vercel's edge
 * middleware compiler emits the middleware to its own output directory and
 * local imports are not emitted with it. The CSP policy helpers also live in
 * src/lib/csp.ts (unit-tested); keep both copies in sync.
 */

/** Placeholder replaced with a per-request nonce by this middleware. */
const NONCE_PLACEHOLDER = "__CSP_NONCE__";

/** Supabase project the admin reads/writes its data from. */
const SUPABASE_URL = "https://txnuvpxhghxiwynhtbvo.supabase.co";
/** API server (CV generation, contact endpoints, CSP reports). */
const API_URL = "https://portfolio-builder-api-six.vercel.app";
/** CSP violation reports are POSTed here (rate-limited, unauthenticated). */
const CSP_REPORT_URL = `${API_URL}/api/v1/csp-report`;

const INTERNAL_HEADER = "x-csp-transform";
const FETCH_TIMEOUT_MS = 7000;

/** Cryptographically-random CSP nonce (Math.random fallback for odd runtimes). */
function generateNonce(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * Strict, nonce-based CSP for the admin SPA. Clerk is the only third party:
 * it loads resources from the frontend API (`*.clerk.accounts.dev`), injects
 * hosted sign-in frames and fetches user/org data. No 'unsafe-inline' in
 * script-src — inline event-handler attributes and non-nonce'd inline
 * scripts are blocked.
 */
function buildCsp(nonce: string): string {
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

/** Stamps the nonce into `__CSP_NONCE__` placeholders (no-op when absent). */
function transformHtml(html: string, nonce: string): string {
  if (!html.includes(NONCE_PLACEHOLDER)) return html;
  return html.split(NONCE_PLACEHOLDER).join(nonce);
}

/**
 * True only for document-style requests: GET requests for extensionless
 * paths, which the SPA rewrite maps to index.html. Filtering is in-function
 * (not via `config.matcher`) because regex matchers are Next.js-specific;
 * the middleware runs for every route and returns undefined immediately
 * otherwise, letting the platform serve the asset untouched.
 */
function isHtmlDocumentRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith("/assets/") || pathname.startsWith("/_vercel/")) {
    return false;
  }
  const lastSegment = pathname.split("/").pop() ?? "";
  if (lastSegment.includes(".")) return false; // favicon, manifest, hashed assets
  return true;
}

export default async function middleware(
  request: Request,
): Promise<Response | undefined> {
  if (!isHtmlDocumentRequest(request)) return undefined;
  if (request.headers.get(INTERNAL_HEADER) === "1") return undefined;

  const headers = new Headers(request.headers);
  headers.set(INTERNAL_HEADER, "1");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(request.url, { headers, signal: controller.signal });
  } catch {
    // Upstream hiccup — serve as-is rather than break the site.
    return undefined;
  } finally {
    clearTimeout(timer);
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !contentType.includes("text/html")) {
    // Error page or non-HTML — pass through untouched.
    return upstream;
  }

  const nonce = generateNonce();
  const body = transformHtml(await upstream.text(), nonce);

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-length");
  responseHeaders.set("content-type", "text/html; charset=utf-8");
  responseHeaders.set("content-security-policy", buildCsp(nonce));
  // The nonce is unique per response — never let the CDN cache it.
  responseHeaders.set("cache-control", "private, no-store");

  return new Response(body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
