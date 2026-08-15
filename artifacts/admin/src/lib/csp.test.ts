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
    expect(csp).toContain("connect-src 'self' https://txnuvpxhghxiwynhtbvo.supabase.co");
    expect(csp).toContain("wss://txnuvpxhghxiwynhtbvo.supabase.co");
  });
});
