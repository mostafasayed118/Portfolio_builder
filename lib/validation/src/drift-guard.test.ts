import { describe, it, expect } from "vitest";
import { CV_MAX_MB, CV_EXT } from "./constants";
import {
  skillSchema,
  projectSchema,
  experienceSchema,
  certificationSchema,
  cvUploadSchema,
} from "./schemas";
import { validateForm, isFormValid } from "./validate";

describe("experience required fields", () => {
  it("rejects missing location with the exact message", () => {
    const errors = validateForm(
      { title: "Dev", company: "Acme", period: "2024", location: "", type: "internship" },
      experienceSchema,
    );
    expect(errors.location).toBe("Location is required");
  });

  it("rejects missing type with the exact message", () => {
    const errors = validateForm(
      { title: "Dev", company: "Acme", period: "2024", location: "Cairo", type: "" },
      experienceSchema,
    );
    expect(errors.type).toBe("Type is required");
  });

  it("accepts a complete experience entry", () => {
    const errors = validateForm(
      { title: "Dev", company: "Acme", period: "2024", location: "Cairo", type: "internship" },
      experienceSchema,
    );
    expect(isFormValid(errors)).toBe(true);
  });
});

describe("certification required fields", () => {
  it("rejects missing date with the exact message", () => {
    const errors = validateForm(
      { title: "AWS SAA", issuer: "Amazon", date: "" },
      certificationSchema,
    );
    expect(errors.date).toBe("Date is required");
  });

  it("accepts a complete certification entry", () => {
    const errors = validateForm(
      { title: "AWS SAA", issuer: "Amazon", date: "2024" },
      certificationSchema,
    );
    expect(isFormValid(errors)).toBe(true);
  });
});

describe("skill bounds", () => {
  it("rejects proficiency 0 with the shared range message", () => {
    const errors = validateForm(
      { name: "Python", category: "Languages", proficiency: 0 },
      skillSchema,
    );
    expect(errors.proficiency).toBe("Proficiency must be between 1 and 100");
  });

  it("rejects proficiency 150 with the shared range message", () => {
    const errors = validateForm(
      { name: "Python", category: "Languages", proficiency: 150 },
      skillSchema,
    );
    expect(errors.proficiency).toBe("Proficiency must be between 1 and 100");
  });
});

describe("live_url https", () => {
  it("rejects http live_url with the exact server-matching message", () => {
    const errors = validateForm(
      { title: "T", description: "A long enough description.", live_url: "http://example.com" },
      projectSchema,
    );
    expect(errors.live_url).toBe("Live URL must use HTTPS");
  });

  it("accepts an https live_url", () => {
    const errors = validateForm(
      { title: "T", description: "A long enough description.", live_url: "https://example.com" },
      projectSchema,
    );
    expect(isFormValid(errors)).toBe(true);
  });
});

describe("cv shared consts", () => {
  it("declares the canonical values", () => {
    expect(CV_MAX_MB).toBe(5);
    expect(CV_EXT).toBe(".pdf");
  });

  it("rejects an oversized CV with a message wired to CV_MAX_MB", () => {
    const file = new File([new Uint8Array((CV_MAX_MB + 1) * 1024 * 1024)], "cv.pdf", {
      type: "application/pdf",
    });
    const errors = validateForm({ file }, cvUploadSchema);
    expect(errors.file).toBe(`CV must be under ${CV_MAX_MB}MB`);
  });

  it("rejects a non-pdf CV with a message wired to CV_EXT", () => {
    const file = new File(["content"], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const errors = validateForm({ file }, cvUploadSchema);
    expect(errors.file).toBe(`CV must be: ${CV_EXT.slice(1)}`);
  });
});
