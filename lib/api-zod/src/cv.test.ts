import { describe, it, expect } from "vitest";
import { cvSettingsUpdateSchema } from "./cv";

const VALID_OBJECT_PATH = "cv-1700000000000.pdf";
const OBJECT_PATH_MESSAGE = "objectPath must be a CV storage path (cv-<unix-ms>.pdf)";

describe("cvSettingsUpdateSchema", () => {
  it("accepts the CvManager writer format (cv-<unix-ms>.pdf)", () => {
    const result = cvSettingsUpdateSchema.safeParse({
      objectPath: VALID_OBJECT_PATH,
      fileName: "mustafa-sayed-cv.pdf",
    });
    expect(result.success).toBe(true);
  });

  it("accepts any case for the .pdf extension in fileName", () => {
    const result = cvSettingsUpdateSchema.safeParse({
      objectPath: VALID_OBJECT_PATH,
      fileName: "cv.PDF",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-pdf file name with the exact message", () => {
    const result = cvSettingsUpdateSchema.safeParse({
      objectPath: VALID_OBJECT_PATH,
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
      objectPath: VALID_OBJECT_PATH,
      fileName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a fileName over 255 characters", () => {
    const result = cvSettingsUpdateSchema.safeParse({
      objectPath: VALID_OBJECT_PATH,
      fileName: `${"a".repeat(256)}.pdf`,
    });
    expect(result.success).toBe(false);
  });

  it("rejects objectPaths that are not the writer format with the exact message", () => {
    const invalidPaths = [
      "",
      "cv/x.pdf",
      "cv/mustafa-sayed-cv.pdf",
      "resume.pdf",
      "cv-abc.pdf",
      "cv--1.pdf",
      "CV-1700000000000.pdf",
      "cv-1700000000000.PDF",
      "cv-1700000000000.pdf.exe",
      "cv/../secret.pdf",
    ];
    for (const objectPath of invalidPaths) {
      const result = cvSettingsUpdateSchema.safeParse({ objectPath, fileName: "cv.pdf" });
      expect(result.success, objectPath).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.objectPath, objectPath).toStrictEqual([
          OBJECT_PATH_MESSAGE,
        ]);
      }
    }
  });

  it("rejects a missing objectPath with zod's Required message", () => {
    const result = cvSettingsUpdateSchema.safeParse({ fileName: "cv.pdf" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.objectPath).toStrictEqual(["Required"]);
    }
  });
});
