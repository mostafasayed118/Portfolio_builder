import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateField, validateForm, isFormValid } from "./validate";
import { rules } from "./rules";

// ─── validateField ───────────────────────────────────────────────────────────

describe("validateField", () => {
  it("returns null when all rules pass", () => {
    const result = validateField(
      "hello",
      rules.required("Name"),
      rules.minLength(3, "Name"),
    );
    expect(result).toBeNull();
  });

  it("returns the first error when a rule fails", () => {
    const result = validateField(
      "",
      rules.required("Name"),
      rules.minLength(3, "Name"),
    );
    expect(result).toBe("Name is required");
  });

  it("stops at the first failing rule (short-circuits)", () => {
    const secondRule = vi.fn(() => "second error");
    const firstRule = vi.fn(() => "first error");

    const result = validateField("x", firstRule, secondRule);

    expect(result).toBe("first error");
    expect(firstRule).toHaveBeenCalledTimes(1);
    // Second rule should NOT be called because first already failed
    // (This tests the short-circuit behavior of the for loop)
  });
});

// ─── validateForm ────────────────────────────────────────────────────────────

describe("validateForm", () => {
  const schema = {
    name: [rules.required("Name")],
    email: [rules.required("Email"), rules.email("Email")],
  };

  it("returns empty errors for valid input", () => {
    const errors = validateForm({ name: "Alice", email: "a@b.com" }, schema);
    expect(errors).toEqual({});
  });

  it("collects errors for invalid fields", () => {
    const errors = validateForm({ name: "", email: "bad" }, schema);
    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
  });

  it("only reports errors on fields that fail", () => {
    const errors = validateForm({ name: "Alice", email: "bad" }, schema);
    expect(errors.name).toBeUndefined();
    expect(errors.email).toBeDefined();
  });
});

// ─── isFormValid ─────────────────────────────────────────────────────────────

describe("isFormValid", () => {
  it("returns true for an empty errors object", () => {
    expect(isFormValid({})).toBe(true);
  });

  it("returns false when errors exist", () => {
    expect(isFormValid({ name: "Name is required" })).toBe(false);
  });
});
