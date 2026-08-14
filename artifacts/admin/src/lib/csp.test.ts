import { describe, expect, it } from "vitest";
import {
  NONCE_PLACEHOLDER,
  buildCsp,
  generateNonce,
  transformHtml,
} from "./csp";

describe("admin CSP helpers", () => {
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

  it("allows the Clerk frontend API for scripts, frames and connect", () => {
    const csp = buildCsp("n1");
    expect(csp).toContain("https://*.clerk.accounts.dev");
    expect(csp).toContain("frame-src 'self' https://*.clerk.accounts.dev");
    expect(csp).toContain("connect-src 'self' https://txnuvpxhghxiwynhtbvo.supabase.co");
    expect(csp).toContain("wss://txnuvpxhghxiwynhtbvo.supabase.co");
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
    const html = `<script nonce="${NONCE_PLACEHOLDER}">console.log(1)</script>`;
    expect(transformHtml(html, "xyz")).toBe(
      '<script nonce="xyz">console.log(1)</script>',
    );
  });

  it("leaves HTML without the placeholder untouched", () => {
    const html = '<script src="/assets/index.js"></script>';
    expect(transformHtml(html, "xyz")).toBe(html);
  });
});
