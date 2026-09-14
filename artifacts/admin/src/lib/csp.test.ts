import { describe, expect, it } from "vitest";
import { NONCE_PLACEHOLDER, buildCsp, generateNonce, transformHtml } from "./csp";
import { describeSharedCspBehavior } from "@workspace/test-utils/csp";

describeSharedCspBehavior({
  generateNonce,
  buildCsp,
  transformHtml,
  noncePlaceholder: NONCE_PLACEHOLDER,
});

describe("admin CSP helpers", () => {
  it("allows the Clerk frontend API for scripts, frames and connect", () => {
    const csp = buildCsp("n1");
    expect(csp).toContain("https://*.clerk.accounts.dev");
    expect(csp).toContain("frame-src 'self' https://*.clerk.accounts.dev");
    expect(csp).toContain("connect-src 'self' https://njibfrkovexikcwzycan.supabase.co");
    expect(csp).toContain("wss://njibfrkovexikcwzycan.supabase.co");
  });

  it("restricts img-src to the explicit host list", () => {
    const csp = buildCsp("n1");
    const imgSrc = csp.split("; ").find((d) => d.startsWith("img-src"));
    expect(imgSrc).toBe(
      "img-src 'self' data: blob: https://*.supabase.co https://img.clerk.com https://*.clerk.accounts.dev",
    );
  });
});
