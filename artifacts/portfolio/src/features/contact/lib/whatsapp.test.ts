import { describe, it, expect } from "vitest";
import { buildWhatsAppHref } from "./whatsapp";

describe("buildWhatsAppHref", () => {
  it("strips formatting from the number and builds a wa.me link", () => {
    expect(buildWhatsAppHref("+20 115 458 0512", "Hi")).toBe(
      "https://wa.me/201154580512?text=Hi",
    );
  });

  it("URL-encodes the prefilled message", () => {
    const href = buildWhatsAppHref("201154580512", "Hi Mustafa! I'd like to chat.");
    // encodeURIComponent keeps ' ! ( ) * ~ unescaped; spaces become %20.
    expect(href).toContain("text=Hi%20Mustafa!%20I'd%20like%20to%20chat.");
    expect(href).toContain("wa.me/201154580512");
  });

  it("returns null when the number has no digits", () => {
    expect(buildWhatsAppHref("", "Hi")).toBeNull();
    expect(buildWhatsAppHref("n/a", "Hi")).toBeNull();
    expect(buildWhatsAppHref(null, "Hi")).toBeNull();
    expect(buildWhatsAppHref(undefined, "Hi")).toBeNull();
  });
});
