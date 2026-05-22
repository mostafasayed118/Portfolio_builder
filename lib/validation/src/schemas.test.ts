import { describe, it, expect, vi, beforeEach } from "vitest";
import { contactFormSchema, skillSchema, projectSchema, heroSchema, cvUploadSchema, experienceSchema, seoSchema, contactInfoSchema, siteSettingsSchema } from "./schemas";
import { validateForm, isFormValid } from "./validate";

describe("contactFormSchema", () => {
  it("validates correct input", () => {
    const errors = validateForm({ name: "John", email: "john@example.com", message: "Hello world!" }, contactFormSchema);
    expect(isFormValid(errors)).toBe(true);
  });

  it("rejects empty name", () => {
    const errors = validateForm({ name: "", email: "john@example.com", message: "Hello world!" }, contactFormSchema);
    expect(errors.name).toBeDefined();
  });

  it("rejects invalid email", () => {
    const errors = validateForm({ name: "John", email: "invalid", message: "Hello world!" }, contactFormSchema);
    expect(errors.email).toBeDefined();
  });

  it("rejects short message", () => {
    const errors = validateForm({ name: "John", email: "john@example.com", message: "Short" }, contactFormSchema);
    expect(errors.message).toBeDefined();
  });
});

describe("skillSchema", () => {
  it("validates correct input", () => {
    const errors = validateForm({ name: "Python", category: "Languages", proficiency: 90 }, skillSchema);
    expect(isFormValid(errors)).toBe(true);
  });

  it("rejects out-of-range proficiency", () => {
    const errors = validateForm({ name: "Python", category: "Languages", proficiency: 150 }, skillSchema);
    expect(errors.proficiency).toBeDefined();
  });
});

describe("projectSchema", () => {
  it("validates correct input", () => {
    const errors = validateForm({ title: "My Project", description: "A great project with lots of details" }, projectSchema);
    expect(isFormValid(errors)).toBe(true);
  });

  it("accepts optional URLs", () => {
    const errors = validateForm({ title: "My Project", description: "A great project", github_url: "https://github.com", live_url: "https://example.com" }, projectSchema);
    expect(isFormValid(errors)).toBe(true);
  });
});

describe("heroSchema", () => {
  it("validates correct input", () => {
    const errors = validateForm({ heading: "Hi", name: "John" }, heroSchema);
    expect(isFormValid(errors)).toBe(true);
  });
});

describe("cvUploadSchema", () => {
  it("rejects non-PDF file", () => {
    const file = new File(["content"], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const errors = validateForm({ file }, cvUploadSchema);
    expect(errors.file).toBeDefined();
  });
});

describe("experienceSchema", () => {
  it("rejects missing title", () => {
    const errors = validateForm(
      { title: "", company: "Acme", period: "2020-2021" },
      experienceSchema,
    );
    expect(errors.title).toBeDefined();
  });
});

describe("seoSchema", () => {
  it("rejects empty title", () => {
    const errors = validateForm(
      { title: "", description: "A valid description for SEO purposes" },
      seoSchema,
    );
    expect(errors.title).toBeDefined();
  });
});

describe("contactInfoSchema", () => {
  it("accepts valid optional field values", () => {
    const errors = validateForm(
      { email: "test@example.com", linkedin: "https://linkedin.com/in/test", github: "https://github.com/test" },
      contactInfoSchema,
    );
    expect(isFormValid(errors)).toBe(true);
  });

  it("allows empty URL fields (url rule is optional)", () => {
    const errors = validateForm(
      { email: "test@example.com", linkedin: "", github: "" },
      contactInfoSchema,
    );
    expect(isFormValid(errors)).toBe(true);
  });
});

describe("siteSettingsSchema", () => {
  it("validates required site_name", () => {
    const errors = validateForm(
      { site_name: "", site_tagline: "A tagline" },
      siteSettingsSchema,
    );
    expect(errors.site_name).toBeDefined();
  });
});
