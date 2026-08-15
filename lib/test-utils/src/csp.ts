import { describe, expect, it } from "vitest";

/**
 * The CSP helpers (`buildCsp`/`generateNonce`/`transformHtml`) are
 * intentionally duplicated per app — Vercel compiles each app's
 * `middleware.ts` standalone, so the CSP builder must stay self-contained.
 * Their behavioral guarantees are identical, however, so this shared suite
 * runs the common assertions against whatever CSP API the caller passes in.
 * The per-app `csp.test.ts` files add only their app-specific origins
 * (Clerk for admin, Turnstile/OpenStreetMap for portfolio).
 */
export interface CspHelpers {
  generateNonce: () => string;
  buildCsp: (nonce: string) => string;
  transformHtml: (html: string, nonce: string) => string;
  noncePlaceholder: string;
}

export function describeSharedCspBehavior(helpers: CspHelpers): void {
  const { generateNonce, buildCsp, transformHtml, noncePlaceholder } = helpers;

  describe("shared CSP behavior", () => {
    it("generates a unique nonce on every call", () => {
      const a = generateNonce();
      const b = generateNonce();
      expect(a).toBeTruthy();
      expect(a).not.toBe(b);
    });

    it("embeds the nonce into script-src", () => {
      const csp = buildCsp("abc123");
      expect(csp).toContain("script-src 'self' 'nonce-abc123'");
    });

    it("never allows inline scripts via unsafe-inline", () => {
      const csp = buildCsp("n1");
      const scriptSrc = csp
        .split("; ")
        .find((d) => d.startsWith("script-src"))!;
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain("'unsafe-eval'");
    });

    it("locks down object-src, base-uri and frame-ancestors", () => {
      const csp = buildCsp("n1");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("frame-ancestors 'self'");
    });

    it("wires violation reports to the API endpoint", () => {
      expect(buildCsp("n1")).toContain(
        "report-uri https://portfolio-builder-api-six.vercel.app/api/v1/csp-report",
      );
    });

    it("replaces the nonce placeholder in inline scripts", () => {
      const html = `<script nonce="${noncePlaceholder}">console.log(1)</script>`;
      expect(transformHtml(html, "xyz")).toBe(
        '<script nonce="xyz">console.log(1)</script>',
      );
    });

    it("leaves HTML without the placeholder untouched", () => {
      const html = '<script src="/assets/index.js"></script>';
      expect(transformHtml(html, "xyz")).toBe(html);
    });
  });
}
