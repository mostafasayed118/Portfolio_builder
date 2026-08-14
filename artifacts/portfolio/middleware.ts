/**
 * Vercel Routing Middleware — applies a nonce-based Content Security Policy
 * to every HTML response of the portfolio SPA.
 *
 * The portfolio is a static Vite build: its HTML lives as a cached file, so a
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
 */

// Note: explicit `.js` extension required — Vercel compiles middleware with
// `--moduleResolution nodenext`, which rejects extensionless relative imports.
import {
  buildCsp,
  generateNonce,
  transformHtml,
} from "./src/lib/csp.js";

export const config = {
  // Run only on document-style paths: skip static assets, dotfiles
  // (favicon, manifest, sitemap, ...) and Vercel internals.
  matcher: ["/((?!assets/|_vercel/|.*\\.).*)"],
};

const INTERNAL_HEADER = "x-csp-transform";
const FETCH_TIMEOUT_MS = 7000;

export default async function middleware(
  request: Request,
): Promise<Response | undefined> {
  if (request.method !== "GET") return undefined;
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
    // Asset or error page — pass through untouched.
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
