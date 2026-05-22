import { describe, it, expect } from "vitest";
import { sanitizeUrl } from "./utils";

describe("sanitizeUrl", () => {
  it("returns null for null input", () => {
    expect(sanitizeUrl(null)).toBe(null);
  });

  it("returns null for undefined input", () => {
    expect(sanitizeUrl(undefined)).toBe(null);
  });

  it("returns null for empty string", () => {
    expect(sanitizeUrl("")).toBe(null);
  });

  it("returns null for '#' only", () => {
    expect(sanitizeUrl("#")).toBe(null);
  });

  it("returns null for whitespace only", () => {
    expect(sanitizeUrl("   ")).toBe(null);
  });

  it("trims and returns valid URL", () => {
    expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com");
  });

  it("returns valid URL as-is", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
  });
});
