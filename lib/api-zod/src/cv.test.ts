import { describe, it, expect } from "vitest";
import { cvSettingsUpdateSchema } from "./cv";

describe("cvSettingsUpdateSchema", () => {
  it("accepts a valid settings update", () => {
    const result = cvSettingsUpdateSchema.safeParse({
      objectPath: "cv/mustafa-sayed-cv.pdf",
      fileName: "mustafa-sayed-cv.pdf",
    });
    expect(result.success).toBe(true);
  });

  it("accepts any case for the .pdf extension", () => {
    const result = cvSettingsUpdateSchema.safeParse({
      objectPath: "cv/cv.PDF",
      fileName: "cv.PDF",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-pdf file name with the exact message", () => {
    const result = cvSettingsUpdateSchema.safeParse({
      objectPath: "cv/cv.docx",
      fileName: "cv.docx",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.fileName).toStrictEqual([
        "File name must end with .pdf",
      ]);
    }
  });

  it("rejects an empty fileName", () => {
    const result = cvSettingsUpdateSchema.safeParse({
      objectPath: "cv/cv.pdf",
      fileName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a fileName over 255 characters", () => {
    const result = cvSettingsUpdateSchema.safeParse({
      objectPath: "cv/cv.pdf",
      fileName: `${"a".repeat(256)}.pdf`,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty objectPath", () => {
    const result = cvSettingsUpdateSchema.safeParse({
      objectPath: "",
      fileName: "cv.pdf",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an objectPath over 500 characters", () => {
    const result = cvSettingsUpdateSchema.safeParse({
      objectPath: `cv/${"a".repeat(500)}.pdf`,
      fileName: "cv.pdf",
    });
    expect(result.success).toBe(false);
  });
});
