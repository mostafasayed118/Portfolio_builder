import { describe, it, expect } from "vitest";
import { certificationSchema } from "./certifications";

const validCertification = {
  title: "AWS Solutions Architect",
  issuer: "Amazon Web Services",
  date: "2023-06",
};

describe("certificationSchema", () => {
  it("accepts a minimal valid certification", () => {
    const result = certificationSchema.safeParse(validCertification);
    expect(result.success).toBe(true);
  });

  it("accepts optional fields when present", () => {
    const result = certificationSchema.safeParse({
      ...validCertification,
      title_ar: "مهندس حلول",
      issuer_logo: "https://example.com/logo.png",
      credential_url: "https://credly.com/badges/abc",
      credential_id: "ABC-123",
      category: "Cloud",
      date_sort: "2023-06-01",
      sort_order: 3,
      is_published: true,
      skills: ["aws", "terraform"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty strings for url fields", () => {
    const result = certificationSchema.safeParse({
      ...validCertification,
      issuer_logo: "",
      credential_url: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title with the exact message", () => {
    const result = certificationSchema.safeParse({
      ...validCertification,
      title: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toStrictEqual([
        "Title is required",
      ]);
    }
  });

  it("rejects a title over 200 characters", () => {
    const result = certificationSchema.safeParse({
      ...validCertification,
      title: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty issuer with the exact message", () => {
    const result = certificationSchema.safeParse({
      ...validCertification,
      issuer: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.issuer).toStrictEqual([
        "Issuer is required",
      ]);
    }
  });

  it("rejects an empty date with the exact message", () => {
    const result = certificationSchema.safeParse({
      ...validCertification,
      date: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.date).toStrictEqual([
        "Date is required",
      ]);
    }
  });

  it("rejects a non-url credential_url", () => {
    const result = certificationSchema.safeParse({
      ...validCertification,
      credential_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 skills", () => {
    const result = certificationSchema.safeParse({
      ...validCertification,
      skills: Array.from({ length: 21 }, (_, i) => `skill-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer sort_order", () => {
    const result = certificationSchema.safeParse({
      ...validCertification,
      sort_order: 1.5,
    });
    expect(result.success).toBe(false);
  });
});
