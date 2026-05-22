import { describe, it, expect } from "vitest";
import { SKILL_CATEGORIES } from "@/data/skills";

describe("Skill Icons", () => {
  it("every skill in every category has an icon", () => {
    for (const cat of SKILL_CATEGORIES) {
      for (const skill of cat.skills) {
        expect(skill.icon, `${cat.key}/${skill.name} should have an icon`).toBeTruthy();
        expect(skill.icon!.length).toBeGreaterThan(0);
      }
    }
  });

  it("all icons are unique per skill", () => {
    const allIcons = new Set<string>();
    for (const cat of SKILL_CATEGORIES) {
      for (const skill of cat.skills) {
        expect(
          allIcons.has(skill.icon!),
          `Duplicate icon "${skill.icon}" for skill "${skill.name}"`
        ).toBe(false);
        allIcons.add(skill.icon!);
      }
    }
  });

  it("skills are categorized correctly", () => {
    const categoryKeys = SKILL_CATEGORIES.map(c => c.key);
    expect(categoryKeys).toContain("languages");
    expect(categoryKeys).toContain("frameworks");
    expect(categoryKeys).toContain("cloud");
    expect(categoryKeys).toContain("analytics");
    expect(categoryKeys).toContain("tools");
  });

  it("each category has at least 3 skills", () => {
    for (const cat of SKILL_CATEGORIES) {
      expect(
        cat.skills.length,
        `Category "${cat.key}" should have at least 3 skills`
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("every skill has a valid proficiency (0-100)", () => {
    for (const cat of SKILL_CATEGORIES) {
      for (const skill of cat.skills) {
        expect(skill.proficiency).toBeGreaterThanOrEqual(0);
        expect(skill.proficiency).toBeLessThanOrEqual(100);
      }
    }
  });

  it("every skill has a valid level label", () => {
    const validLevels = ["Expert", "Advanced", "Intermediate", "Familiar"];
    for (const cat of SKILL_CATEGORIES) {
      for (const skill of cat.skills) {
        expect(validLevels).toContain(skill.level);
      }
    }
  });

  it("Python has a snake icon", () => {
    const python = SKILL_CATEGORIES
      .flatMap(c => c.skills)
      .find(s => s.name === "Python");
    expect(python).toBeDefined();
    expect(python!.icon).toBe("🐍");
  });

  it("React has an atom icon", () => {
    const react = SKILL_CATEGORIES
      .flatMap(c => c.skills)
      .find(s => s.name === "React");
    expect(react).toBeDefined();
    expect(react!.icon).toBe("⚛️");
  });

  it("skills within each category are sorted by proficiency descending", () => {
    for (const cat of SKILL_CATEGORIES) {
      for (let i = 1; i < cat.skills.length; i++) {
        expect(
          cat.skills[i - 1].proficiency,
          `Skills in "${cat.key}" should be sorted by proficiency desc`
        ).toBeGreaterThanOrEqual(cat.skills[i].proficiency);
      }
    }
  });
});
