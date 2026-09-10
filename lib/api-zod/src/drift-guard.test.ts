import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { skillSchema, projectSchema } from "./admin";
import { cvSettingsUpdateSchema } from "./cv";

const PROFICIENCY_MESSAGE = "Proficiency must be between 1 and 100";

describe("skill bounds", () => {
  it("rejects proficiency 0 with the shared range message", () => {
    const r = skillSchema.safeParse({ name: "x", category: "c", proficiency: 0 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.proficiency).toStrictEqual([PROFICIENCY_MESSAGE]);
    }
  });

  it("rejects proficiency 101 with the shared range message", () => {
    const r = skillSchema.safeParse({ name: "x", category: "c", proficiency: 101 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.proficiency).toStrictEqual([PROFICIENCY_MESSAGE]);
    }
  });

  it("accepts proficiency 1 and 100", () => {
    expect(skillSchema.safeParse({ name: "x", category: "c", proficiency: 1 }).success).toBe(true);
    expect(skillSchema.safeParse({ name: "x", category: "c", proficiency: 100 }).success).toBe(
      true,
    );
  });

  it("rejects sort_order outside 0..9999 and accepts the edges", () => {
    expect(
      skillSchema.safeParse({ name: "x", category: "c", proficiency: 50, sort_order: -1 }).success,
    ).toBe(false);
    expect(
      skillSchema.safeParse({ name: "x", category: "c", proficiency: 50, sort_order: 10000 })
        .success,
    ).toBe(false);
    expect(
      skillSchema.safeParse({ name: "x", category: "c", proficiency: 50, sort_order: 0 }).success,
    ).toBe(true);
    expect(
      skillSchema.safeParse({ name: "x", category: "c", proficiency: 50, sort_order: 9999 }).success,
    ).toBe(true);
  });
});

describe("live_url https", () => {
  it("rejects http live_url with the exact frontend-matching message", () => {
    const r = projectSchema.safeParse({
      title: "T",
      description: "A long enough description.",
      live_url: "http://example.com",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.live_url).toStrictEqual(["Live URL must use HTTPS"]);
    }
  });

  it("accepts https, empty, null, and absent live_url", () => {
    const base = { title: "T", description: "A long enough description." };
    expect(projectSchema.safeParse({ ...base, live_url: "https://example.com" }).success).toBe(
      true,
    );
    expect(projectSchema.safeParse({ ...base, live_url: "" }).success).toBe(true);
    expect(projectSchema.safeParse({ ...base, live_url: null }).success).toBe(true);
    expect(projectSchema.safeParse(base).success).toBe(true);
  });
});

describe("cv shared consts", () => {
  it("rejects non-pdf fileName with the exact message", () => {
    const r = cvSettingsUpdateSchema.safeParse({ objectPath: "cv/x", fileName: "resume.docx" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.fileName).toStrictEqual([
        "File name must end with .pdf",
      ]);
    }
  });

  it("accepts a .pdf fileName", () => {
    expect(
      cvSettingsUpdateSchema.safeParse({ objectPath: "cv/x", fileName: "resume.pdf" }).success,
    ).toBe(true);
  });

  it("validation constants declare the canonical CV_MAX_MB and CV_EXT", () => {
    const url = new URL("../../validation/src/constants.ts", import.meta.url);
    const src = fs.readFileSync(url, "utf8");
    expect(src).toContain("CV_MAX_MB = 5");
    expect(src).toContain('CV_EXT = ".pdf"');
  });
});
