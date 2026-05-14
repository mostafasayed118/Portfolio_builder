import { HERO, ABOUT, SKILL_CATEGORIES, PROJECTS, EXPERIENCE, CERTIFICATIONS, CONTACT } from "@/data/portfolio";

describe("Portfolio static data", () => {
  describe("HERO", () => {
    it("has required fields", () => {
      expect(HERO.name).toBeTruthy();
      expect(HERO.roles.length).toBeGreaterThan(0);
      expect(HERO.description).toBeTruthy();
      expect(HERO.github).toContain("github.com");
      expect(HERO.linkedin).toContain("linkedin.com");
      expect(HERO.email).toContain("@");
    });

    it("has description mentioning data", () => {
      expect(HERO.description.toLowerCase()).toMatch(/data|engineer|python|azure/i);
    });
  });

  describe("ABOUT", () => {
    it("has bio and location", () => {
      expect(ABOUT.bio1).toBeTruthy();
      expect(ABOUT.bio2).toBeTruthy();
      expect(ABOUT.location).toBe("Cairo, Egypt");
    });

    it("has education details", () => {
      expect(ABOUT.education.degree).toBe("B.Sc. Computer Science");
      expect(ABOUT.education.school).toContain("Computer Science");
      expect(ABOUT.education.grade).toBeTruthy();
    });

    it("has languages array", () => {
      expect(ABOUT.languages.length).toBeGreaterThan(0);
      ABOUT.languages.forEach((lang) => {
        expect(lang.lang).toBeTruthy();
        expect(lang.level).toBeTruthy();
        expect(lang.pct).toBeGreaterThan(0);
      });
    });
  });

  describe("SKILL_CATEGORIES", () => {
    it("has categories with expected keys", () => {
      const keys = new Set(SKILL_CATEGORIES.map((c) => c.key));
      expect(keys.has("languages")).toBe(true);
      expect(keys.has("frameworks")).toBe(true);
      expect(keys.has("cloud")).toBe(true);
      expect(keys.has("analytics")).toBe(true);
      expect(keys.has("tools")).toBe(true);
    });

    it("each category has skills", () => {
      SKILL_CATEGORIES.forEach((c) => {
        expect(c.skills.length).toBeGreaterThan(0);
      });
    });

    it("has valid proficiency levels", () => {
      SKILL_CATEGORIES.forEach((c) => {
        c.skills.forEach((s) => {
          expect(s.proficiency).toBeGreaterThanOrEqual(0);
          expect(s.proficiency).toBeLessThanOrEqual(100);
        });
      });
    });

    it("has no duplicate names across categories", () => {
      const names = SKILL_CATEGORIES.flatMap((c) => c.skills.map((s) => s.name));
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe("PROJECTS", () => {
    it("has at least one project", () => {
      expect(PROJECTS.length).toBeGreaterThan(0);
    });

    it("each project has required fields", () => {
      PROJECTS.forEach((p) => {
        expect(p.title).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.techStack.length).toBeGreaterThan(0);
      });
    });
  });

  describe("EXPERIENCE", () => {
    it("has experience items", () => {
      expect(EXPERIENCE.length).toBeGreaterThan(0);
    });

    it("each has valid type", () => {
      const valid = ["internship", "certification", "volunteer"];
      EXPERIENCE.forEach((e) => {
        expect(valid).toContain(e.type);
      });
    });
  });

  describe("CERTIFICATIONS", () => {
    it("has certifications", () => {
      expect(CERTIFICATIONS.length).toBeGreaterThan(0);
    });

    it("each has title and issuer", () => {
      CERTIFICATIONS.forEach((c) => {
        expect(c.title).toBeTruthy();
        expect(c.issuer).toBeTruthy();
      });
    });
  });

  describe("CONTACT", () => {
    it("has email and social links", () => {
      expect(CONTACT.email).toContain("@");
      expect(CONTACT.github).toContain("github.com");
      expect(CONTACT.linkedin).toContain("linkedin.com");
      expect(CONTACT.location).toBeTruthy();
    });
  });
});
