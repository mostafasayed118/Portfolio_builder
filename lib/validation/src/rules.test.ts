import { describe, it, expect, vi, beforeEach } from "vitest";
import { rules } from "./rules";

// ─── required ────────────────────────────────────────────────────────────────

describe("rules.required", () => {
  const rule = rules.required("Name");

  it("returns error for null", () => {
    expect(rule(null)).toBe("Name is required");
  });

  it("returns error for undefined", () => {
    expect(rule(undefined)).toBe("Name is required");
  });

  it("returns error for empty string", () => {
    expect(rule("")).toBe("Name is required");
  });

  it("returns error for whitespace-only string", () => {
    expect(rule("   ")).toBe("Name is required");
  });

  it("returns null for a valid value", () => {
    expect(rule("hello")).toBeNull();
  });
});

// ─── minLength ───────────────────────────────────────────────────────────────

describe("rules.minLength", () => {
  const rule = rules.minLength(3, "Name");

  it("returns error when string is shorter than min", () => {
    expect(rule("ab")).toBe("Name must be at least 3 characters");
  });

  it("returns null when string length equals min", () => {
    expect(rule("abc")).toBeNull();
  });

  it("returns null when string is longer than min", () => {
    expect(rule("abcdef")).toBeNull();
  });
});

// ─── maxLength ───────────────────────────────────────────────────────────────

describe("rules.maxLength", () => {
  const rule = rules.maxLength(5, "Code");

  it("returns error when string exceeds max", () => {
    expect(rule("toolong")).toBe("Code must be at most 5 characters");
  });

  it("returns null when string length equals max", () => {
    expect(rule("abcde")).toBeNull();
  });
});

// ─── email ───────────────────────────────────────────────────────────────────

describe("rules.email", () => {
  const rule = rules.email("Email");

  it("returns error for a non-string value", () => {
    expect(rule(42)).toBe("Email must be a string");
  });

  it("returns error for an invalid email", () => {
    expect(rule("not-an-email")).toBe("Email is not a valid email address");
  });

  it("returns null for a valid email", () => {
    expect(rule("user@example.com")).toBeNull();
  });
});

// ─── url ─────────────────────────────────────────────────────────────────────

describe("rules.url", () => {
  it("returns null for empty/null values (optional)", () => {
    const rule = rules.url("URL");
    expect(rule(null)).toBeNull();
    expect(rule("")).toBeNull();
  });

  it("returns error for a non-string value", () => {
    const rule = rules.url("URL");
    expect(rule(123)).toBe("URL must be a string");
  });

  it("returns error for an invalid URL", () => {
    const rule = rules.url("URL");
    expect(rule("not a url")).toBe("URL is not a valid URL");
  });

  it("returns null for a valid http URL when https not required", () => {
    const rule = rules.url("URL", false);
    expect(rule("http://example.com")).toBeNull();
  });

  it("returns error for http when requireHttps is true", () => {
    const rule = rules.url("URL", true);
    expect(rule("http://example.com")).toBe("URL must use HTTPS");
  });

  it("returns null for https when requireHttps is true", () => {
    const rule = rules.url("URL", true);
    expect(rule("https://example.com")).toBeNull();
  });
});

// ─── range ───────────────────────────────────────────────────────────────────

describe("rules.range", () => {
  const rule = rules.range(1, 100, "Score");

  it("returns error when value is below min", () => {
    expect(rule(0)).toBe("Score must be between 1 and 100");
  });

  it("returns error when value is above max", () => {
    expect(rule(101)).toBe("Score must be between 1 and 100");
  });

  it("returns null when value is within range", () => {
    expect(rule(50)).toBeNull();
  });
});

// ─── pattern ─────────────────────────────────────────────────────────────────

describe("rules.pattern", () => {
  const rule = rules.pattern(/^[A-Z]+$/, "Must be uppercase letters only");

  it("returns error when value does not match", () => {
    expect(rule("abc")).toBe("Must be uppercase letters only");
  });

  it("returns null when value matches", () => {
    expect(rule("ABC")).toBeNull();
  });
});

// ─── fileType ────────────────────────────────────────────────────────────────

describe("rules.fileType", () => {
  const rule = rules.fileType(["pdf", "doc"], "Document");

  it("returns error when value is not a File", () => {
    expect(rule("not a file")).toBe("Document is required");
  });

  it("returns error for a disallowed extension", () => {
    const file = new File([""], "report.txt", { type: "text/plain" });
    expect(rule(file)).toBe("Document must be: pdf, doc");
  });

  it("returns null for an allowed extension", () => {
    const file = new File([""], "report.pdf", { type: "application/pdf" });
    expect(rule(file)).toBeNull();
  });
});

// ─── fileSize ────────────────────────────────────────────────────────────────

describe("rules.fileSize", () => {
  const rule = rules.fileSize(1, "Avatar");

  it("returns error when file exceeds max size", () => {
    // 2 MB > 1 MB limit
    const bigContent = new Uint8Array(2 * 1024 * 1024);
    const file = new File([bigContent], "big.png", { type: "image/png" });
    expect(rule(file)).toBe("Avatar must be under 1MB");
  });

  it("returns null when file is within limit", () => {
    const smallFile = new File(["tiny"], "tiny.txt", { type: "text/plain" });
    expect(rule(smallFile)).toBeNull();
  });
});
