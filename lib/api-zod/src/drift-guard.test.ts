import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { skillSchema, projectSchema } from "./admin";
import { cvSettingsUpdateSchema } from "./cv";

const PROFICIENCY_MESSAGE = "Proficiency must be between 1 and 100";

const retiredTables = [
  "theme_settings", "typography_settings", "site_settings", "seo_settings",
  "hero_content", "about_content", "contact_info", "cv_settings", "skills",
  "projects", "experience", "certifications", "messages", "section_settings",
  "content_snapshots", "section_variants", "analytics_events", "content_health_reports",
  "image_metadata", "image_variants", "blog_posts",
];

const databaseTypes = fs.readFileSync(new URL("../../supabase/src/types.ts", import.meta.url), "utf8");
const openapi = fs.readFileSync(new URL("../../api-spec/openapi.yaml", import.meta.url), "utf8");

function tableContract(table: string) {
  return databaseTypes.match(new RegExp(`^      ${table}: \\{[\\s\\S]*?^      \\};`, "m"))?.[0];
}

describe("retired tenant user_id contracts", () => {
  it.each(retiredTables)("%s keeps portfolio ownership without legacy user fields", (table) => {
    const contract = tableContract(table);
    expect(contract).toBeDefined();
    expect(contract?.match(/portfolio_id\??:/g)).toHaveLength(3);
    expect(contract).not.toMatch(/\buser_id\??:/);
  });

  it("only the global ThemePreset OpenAPI schema retains user_id", () => {
    const schemas = openapi.split(/(?=^ {4}\w+:\r?$)/m);
    const withUserId = schemas.filter((schema) => /\buser_id\b/.test(schema));
    expect(withUserId).toHaveLength(1);
    expect(withUserId[0]).toMatch(/^ {4}ThemePreset:/);
  });

  it("preserves the global theme_presets and users contracts", () => {
    expect(tableContract("theme_presets")?.match(/\buser_id\??:/g)).toHaveLength(3);
    expect(tableContract("theme_presets")).not.toContain("portfolio_id");
    expect(tableContract("users")).toContain("clerk_id: string");
    expect(tableContract("users")).not.toContain("portfolio_id");
  });
});

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
    const r = cvSettingsUpdateSchema.safeParse({
      objectPath: "cv-1700000000000.pdf",
      fileName: "resume.docx",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.fileName).toStrictEqual([
        "File name must end with .pdf",
      ]);
    }
  });

  it("accepts a .pdf fileName", () => {
    expect(
      cvSettingsUpdateSchema.safeParse({ objectPath: "cv-1700000000000.pdf", fileName: "resume.pdf" })
        .success,
    ).toBe(true);
  });

  it("validation constants declare the canonical CV_MAX_MB and CV_EXT", () => {
    const url = new URL("../../validation/src/constants.ts", import.meta.url);
    const src = fs.readFileSync(url, "utf8");
    expect(src).toContain("CV_MAX_MB = 5");
    expect(src).toContain('CV_EXT = ".pdf"');
  });
});
