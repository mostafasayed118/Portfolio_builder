import { describe, it, expect } from "vitest";
import { contactZodSchema, contactFormSchema } from "./schemas";
import { validateForm, isFormValid } from "./validate";

const VALID = {
  name: "John Doe",
  email: "john@example.com",
  message: "Hello, I would like to discuss a project with you!",
};

describe("contactZodSchema", () => {
  it("accepts a valid submission", () => {
    expect(contactZodSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts the honeypot and form-mount timestamp fields", () => {
    expect(
      contactZodSchema.safeParse({ ...VALID, website: "", _formLoadedAt: 1726000000000 }).success,
    ).toBe(true);
  });

  it("rejects an empty name with the API message", () => {
    const r = contactZodSchema.safeParse({ ...VALID, name: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe("Name is required");
    }
  });

  it("rejects a name over 100 characters with the API message", () => {
    const r = contactZodSchema.safeParse({ ...VALID, name: "x".repeat(101) });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe("Name must be under 100 characters");
    }
  });

  it("accepts a name at the 100-character boundary", () => {
    expect(contactZodSchema.safeParse({ ...VALID, name: "x".repeat(100) }).success).toBe(true);
  });

  it("rejects an invalid email with the API message", () => {
    const r = contactZodSchema.safeParse({ ...VALID, email: "not-an-email" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe("Valid email is required");
    }
  });

  it("rejects an email over the RFC 5321 limit", () => {
    const r = contactZodSchema.safeParse({ ...VALID, email: `${"x".repeat(250)}@example.com` });
    expect(r.success).toBe(false);
  });

  it("rejects a short message with the API message", () => {
    const r = contactZodSchema.safeParse({ ...VALID, message: "too short" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe("Message must be at least 10 characters");
    }
  });

  it("accepts a message at the 10-character boundary and rejects 9", () => {
    expect(contactZodSchema.safeParse({ ...VALID, message: "x".repeat(10) }).success).toBe(true);
    expect(contactZodSchema.safeParse({ ...VALID, message: "x".repeat(9) }).success).toBe(false);
  });

  it("accepts a message at the 2000-character boundary and rejects 2001", () => {
    expect(contactZodSchema.safeParse({ ...VALID, message: "x".repeat(2000) }).success).toBe(true);
    expect(contactZodSchema.safeParse({ ...VALID, message: "x".repeat(2001) }).success).toBe(false);
  });

  it("rejects a non-numeric form-mount timestamp", () => {
    expect(contactZodSchema.safeParse({ ...VALID, _formLoadedAt: "abc" }).success).toBe(false);
  });

  it("rejects a non-string honeypot value", () => {
    expect(contactZodSchema.safeParse({ ...VALID, website: 42 }).success).toBe(false);
  });

  it("normalizes the parsed payload like the API schema", () => {
    const r = contactZodSchema.safeParse({
      name: "  John \tDoe ",
      email: "  John@Example.COM ",
      message: "  Hello\u0000 world  ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe("John Doe");
      expect(r.data.email).toBe("john@example.com");
      expect(r.data.message).toBe("Hello world");
    }
  });
});

describe("contactFormSchema (useFormValidation surface)", () => {
  it("validates a correct submission", () => {
    expect(isFormValid(validateForm(VALID, contactFormSchema))).toBe(true);
  });

  it("rejects an empty name with the API message", () => {
    const errors = validateForm({ ...VALID, name: "" }, contactFormSchema);
    expect(errors.name).toBe("Name is required");
  });

  it("rejects an invalid email with the API message", () => {
    const errors = validateForm({ ...VALID, email: "nope" }, contactFormSchema);
    expect(errors.email).toBe("Valid email is required");
  });

  it("rejects a short message with the API message", () => {
    const errors = validateForm({ ...VALID, message: "short" }, contactFormSchema);
    expect(errors.message).toBe("Message must be at least 10 characters");
  });

  it("rejects an over-long name with the API message", () => {
    const errors = validateForm({ ...VALID, name: "x".repeat(101) }, contactFormSchema);
    expect(errors.name).toBe("Name must be under 100 characters");
  });

  it("rejects an over-long message with the API message", () => {
    const errors = validateForm({ ...VALID, message: "x".repeat(2001) }, contactFormSchema);
    expect(errors.message).toBe("Message must be under 2000 characters");
  });
});
