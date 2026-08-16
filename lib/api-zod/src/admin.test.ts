import { describe, it, expect } from "vitest";
import {
  heroSchema,
  aboutSchema,
  skillSchema,
  projectSchema,
  experienceSchema,
  sectionSettingSchema,
  sectionReorderSchema,
  updateRoleSchema,
  contactSubmissionSchema,
  bulkDeleteMessagesSchema,
  bulkArchiveMessagesSchema,
  aiGenerateDescriptionSchema,
  aiSuggestCategoriesSchema,
  aiSuggestTagsSchema,
  aiAnalyzeContentSchema,
} from "./admin";

describe("admin schemas", () => {
  describe("heroSchema", () => {
    it("accepts an empty partial (all fields optional)", () => {
      expect(heroSchema.safeParse({}).success).toBe(true);
    });

    it("rejects bio longer than max", () => {
      expect(
        heroSchema.safeParse({ description: "x".repeat(1001) }).success,
      ).toBe(false);
    });

    it("accepts nullable URL fields as null", () => {
      const r = heroSchema.safeParse({ github_url: null, linkedin_url: null });
      expect(r.success).toBe(true);
    });

    it("accepts empty string for nullable URL fields", () => {
      const r = heroSchema.safeParse({ github_url: "", linkedin_url: "" });
      expect(r.success).toBe(true);
    });

    it("rejects malformed URL when a value is provided", () => {
      expect(heroSchema.safeParse({ github_url: "not-a-url" }).success).toBe(false);
    });
  });

  describe("aboutSchema", () => {
    it("accepts an empty object", () => {
      expect(aboutSchema.safeParse({}).success).toBe(true);
    });

    it("clamps languages to <= 30 entries", () => {
      const langs = Array.from({ length: 31 }, (_, i) => ({
        name: `L${i}`,
        level: 50,
      }));
      expect(aboutSchema.safeParse({ languages: langs }).success).toBe(false);
    });

    it("coerces years_of_experience from string", () => {
      const r = aboutSchema.safeParse({ years_of_experience: "5" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.years_of_experience).toBe(5);
    });
  });

  describe("skillSchema", () => {
    it("requires name and category", () => {
      expect(skillSchema.safeParse({}).success).toBe(false);
      expect(
        skillSchema.safeParse({ name: "TS", category: "lang", proficiency: 80 }).success,
      ).toBe(true);
    });

    it("rejects proficiency out of range", () => {
      expect(
        skillSchema.safeParse({ name: "X", category: "C", proficiency: 150 }).success,
      ).toBe(false);
    });
  });

  describe("projectSchema", () => {
    it("rejects short description", () => {
      expect(
        projectSchema.safeParse({ title: "T", description: "short" }).success,
      ).toBe(false);
    });

    it("accepts valid project", () => {
      expect(
        projectSchema.safeParse({
          title: "My Project",
          description: "A long enough description here.",
          tech_stack: ["TS", "React"],
        }).success,
      ).toBe(true);
    });
  });

  describe("experienceSchema", () => {
    it("requires a valid type enum", () => {
      expect(
        experienceSchema.safeParse({ title: "T", company: "C", type: "unknown" }).success,
      ).toBe(false);
    });

    it("accepts all three type values", () => {
      for (const t of ["internship", "certification", "volunteer"] as const) {
        expect(
          experienceSchema.safeParse({ title: "T", company: "C", location: "Cairo", period: "2024", type: t }).success,
        ).toBe(true);
      }
    });

    it("rejects missing required location", () => {
      expect(
        experienceSchema.safeParse({ title: "T", company: "C", period: "2024", type: "internship" }).success,
      ).toBe(false);
    });

    it("rejects missing required period", () => {
      expect(
        experienceSchema.safeParse({ title: "T", company: "C", location: "Cairo", type: "internship" }).success,
      ).toBe(false);
    });
  });

  describe("sectionSettingSchema / sectionReorderSchema", () => {
    it("sectionSettingSchema accepts empty partial", () => {
      expect(sectionSettingSchema.safeParse({}).success).toBe(true);
    });

    it("sectionReorderSchema requires at least one item", () => {
      expect(sectionReorderSchema.safeParse([]).success).toBe(false);
    });

    it("sectionReorderSchema rejects non-UUID id", () => {
      expect(
        sectionReorderSchema.safeParse([{ id: "not-a-uuid", sort_order: 1 }]).success,
      ).toBe(false);
    });
  });

  describe("updateRoleSchema", () => {
    it("accepts user and superadmin", () => {
      expect(updateRoleSchema.safeParse({ role: "user" }).success).toBe(true);
      expect(updateRoleSchema.safeParse({ role: "superadmin" }).success).toBe(true);
    });
    it("rejects unknown role", () => {
      expect(updateRoleSchema.safeParse({ role: "admin" }).success).toBe(false);
    });
  });

  describe("contactSubmissionSchema", () => {
    it("strips control characters from name and message", () => {
      const r = contactSubmissionSchema.safeParse({
        name: "John\x00Doe",
        email: "a@b.com",
        message: "hello world \x01",
      });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.name).toBe("JohnDoe");
        expect(r.data.message).toBe("hello world ");
      }
    });

    it("lowercases and trims email", () => {
      const r = contactSubmissionSchema.safeParse({
        name: "n",
        email: "  Foo@BAR.com  ",
        message: "this is a valid message",
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.email).toBe("foo@bar.com");
    });
  });

  describe("bulkDeleteMessagesSchema", () => {
    it("requires at least one id", () => {
      expect(bulkDeleteMessagesSchema.safeParse({ ids: [] }).success).toBe(false);
    });
    it("rejects non-uuid", () => {
      expect(
        bulkDeleteMessagesSchema.safeParse({ ids: ["nope"] }).success,
      ).toBe(false);
    });
  });

  describe("bulkArchiveMessagesSchema", () => {
    it("accepts an explicit ids batch", () => {
      const r = bulkArchiveMessagesSchema.safeParse({
        ids: ["11111111-1111-1111-1111-111111111111"],
      });
      expect(r.success).toBe(true);
    });

    it("accepts a filter instead of ids (status or preset)", () => {
      expect(bulkArchiveMessagesSchema.safeParse({ filter: { status: "unread" } }).success).toBe(true);
      expect(
        bulkArchiveMessagesSchema.safeParse({ filter: { preset: "needs_reply" } }).success,
      ).toBe(true);
    });

    it("rejects ids AND filter together", () => {
      const r = bulkArchiveMessagesSchema.safeParse({
        ids: ["11111111-1111-1111-1111-111111111111"],
        filter: { status: "unread" },
      });
      expect(r.success).toBe(false);
    });

    it("rejects neither ids nor filter", () => {
      expect(bulkArchiveMessagesSchema.safeParse({}).success).toBe(false);
    });

    it("rejects empty ids and empty filter", () => {
      expect(bulkArchiveMessagesSchema.safeParse({ ids: [] }).success).toBe(false);
      expect(bulkArchiveMessagesSchema.safeParse({ filter: {} }).success).toBe(false);
    });
  });

  describe("AI schemas", () => {
    it("aiGenerateDescriptionSchema requires techStack >= 1", () => {
      expect(aiGenerateDescriptionSchema.safeParse({ techStack: [] }).success).toBe(false);
      expect(
        aiGenerateDescriptionSchema.safeParse({ techStack: ["TS"] }).success,
      ).toBe(true);
    });
    it("aiSuggestCategoriesSchema requires skillName", () => {
      expect(aiSuggestCategoriesSchema.safeParse({ skillName: "" }).success).toBe(false);
    });
    it("aiSuggestTagsSchema requires techStack", () => {
      expect(aiSuggestTagsSchema.safeParse({ techStack: [] }).success).toBe(false);
    });
    it("aiAnalyzeContentSchema requires valid contentType", () => {
      expect(
        aiAnalyzeContentSchema.safeParse({ content: "x", contentType: "wrong" }).success,
      ).toBe(false);
    });
  });
});
