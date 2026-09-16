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

  it("returns null for javascript: scheme", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe(null);
  });

  it("returns null for data: scheme", () => {
    expect(sanitizeUrl("data:text/html,<h1>x</h1>")).toBe(null);
  });

  it("returns null for vbscript: scheme", () => {
    expect(sanitizeUrl("vbscript:msgbox")).toBe(null);
  });

  it("returns null for file: scheme", () => {
    expect(sanitizeUrl("file:///etc/passwd")).toBe(null);
  });

  it("allows mailto: scheme", () => {
    expect(sanitizeUrl("mailto:me@example.com")).toBe("mailto:me@example.com");
  });

  it("allows tel: scheme", () => {
    expect(sanitizeUrl("tel:+1234567890")).toBe("tel:+1234567890");
  });

  it("allows site-relative path", () => {
    expect(sanitizeUrl("/projects")).toBe("/projects");
  });

  it("allows scheme-less value (browsers resolve it as relative)", () => {
    expect(sanitizeUrl("example.com/page")).toBe("example.com/page");
  });
});
