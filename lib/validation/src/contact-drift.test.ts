import { describe, expect, it } from "vitest";
import { contactSubmissionSchema } from "@workspace/api-zod";
import { contactZodSchema, contactFormSchema } from "./schemas";
import { validateForm, isFormValid } from "./validate";

const BASE = {
  name: "John Doe",
  email: "john@example.com",
  message: "Hello, I would like to discuss a project with you!",
};

interface DriftCase {
  name: string;
  input: Record<string, unknown>;
}

const MATRIX: DriftCase[] = [
  { name: "valid submission", input: { ...BASE } },
  { name: "empty name", input: { ...BASE, name: "" } },
  { name: "whitespace-only name", input: { ...BASE, name: "   " } },
  { name: "name at 100 chars", input: { ...BASE, name: "x".repeat(100) } },
  { name: "name over 100 chars", input: { ...BASE, name: "x".repeat(101) } },
  { name: "missing email", input: { name: BASE.name, message: BASE.message } },
  { name: "invalid email", input: { ...BASE, email: "not-an-email" } },
  { name: "email over 254 chars", input: { ...BASE, email: `${"x".repeat(250)}@example.com` } },
  { name: "uppercase email", input: { ...BASE, email: "JOHN@EXAMPLE.COM" } },
  { name: "message at 10 chars", input: { ...BASE, message: "x".repeat(10) } },
  { name: "message under 10 chars", input: { ...BASE, message: "x".repeat(9) } },
  { name: "message at 2000 chars", input: { ...BASE, message: "x".repeat(2000) } },
  { name: "message over 2000 chars", input: { ...BASE, message: "x".repeat(2001) } },
  {
    name: "honeypot and timestamp present",
    input: { ...BASE, website: "", _formLoadedAt: 1726000000000 },
  },
  { name: "non-numeric timestamp", input: { ...BASE, _formLoadedAt: "abc" } },
  { name: "negative timestamp", input: { ...BASE, _formLoadedAt: -1 } },
  { name: "non-string honeypot", input: { ...BASE, website: 42 } },
];

const THREE_FIELD_MATRIX: DriftCase[] = MATRIX.filter(
  (c) => !("website" in c.input) && !("_formLoadedAt" in c.input),
);

describe("contact schema drift vs @workspace/api-zod", () => {
  it("accepts and rejects the fixed matrix identically", () => {
    for (const c of MATRIX) {
      expect(contactZodSchema.safeParse(c.input).success).toBe(
        contactSubmissionSchema.safeParse(c.input).success,
      );
    }
  });

  it("accepts the shared happy path on both sides", () => {
    expect(contactZodSchema.safeParse(BASE).success).toBe(true);
    expect(contactSubmissionSchema.safeParse(BASE).success).toBe(true);
  });

  it("rejects the shared failure path with the same message", () => {
    const mine = contactZodSchema.safeParse({ ...BASE, name: "" });
    const api = contactSubmissionSchema.safeParse({ ...BASE, name: "" });
    expect(mine.success).toBe(false);
    expect(api.success).toBe(false);
    if (!mine.success && !api.success) {
      expect(mine.error.issues[0]?.message).toBe(api.error.issues[0]?.message);
    }
  });
});

describe("contactFormSchema tracks contactZodSchema", () => {
  it("accepts and rejects the same three-field inputs", () => {
    for (const c of THREE_FIELD_MATRIX) {
      expect(isFormValid(validateForm(c.input, contactFormSchema))).toBe(
        contactZodSchema.safeParse(c.input).success,
      );
    }
  });
});
