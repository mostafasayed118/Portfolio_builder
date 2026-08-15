import { describe, expect, it } from "vitest";
import { NONCE_PLACEHOLDER, buildCsp, generateNonce, transformHtml } from "./csp";
import { describeSharedCspBehavior } from "@workspace/test-utils/csp";

describeSharedCspBehavior({
  generateNonce,
  buildCsp,
  transformHtml,
  noncePlaceholder: NONCE_PLACEHOLDER,
});

describe("portfolio CSP helpers", () => {
  it("allows the Supabase, API, Turnstile and OpenStreetMap origins", () => {
    const csp = buildCsp("n1");
    expect(csp).toContain("connect-src 'self' https://txnuvpxhghxiwynhtbvo.supabase.co");
    expect(csp).toContain("wss://txnuvpxhghxiwynhtbvo.supabase.co");
    expect(csp).toContain("https://portfolio-builder-api-six.vercel.app");
    expect(csp).toContain("https://challenges.cloudflare.com");
    expect(csp).toContain("frame-src 'self' https://www.openstreetmap.org");
  });
});
