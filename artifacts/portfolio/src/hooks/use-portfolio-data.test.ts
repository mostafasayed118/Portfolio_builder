import { describe, it, expect } from "vitest";
import { groupSkillsByCategory } from "./use-portfolio-data";

// DbSkill type shape for testing
type TestSkill = {
  name: string;
  proficiency: number;
  category: string | null;
  is_visible?: boolean;
};

describe("use-portfolio-data", () => {
  describe("groupSkillsByCategory", () => {
    it("groups skills by category", () => {
      const skills: TestSkill[] = [
        { name: "Python", proficiency: 95, category: "Languages" },
        { name: "React", proficiency: 80, category: "Frameworks" },
        { name: "PostgreSQL", proficiency: 70, category: "Databases" },
      ];
      const result = groupSkillsByCategory(skills as any);
      expect(result).toHaveLength(3);

      const labels = result.map((c) => c.label);
      expect(labels).toContain("Languages");
      expect(labels).toContain("Frameworks");
      expect(labels).toContain("Databases");
    });

    it("sorts skills by proficiency descending within category", () => {
      const skills: TestSkill[] = [
        { name: "JavaScript", proficiency: 70, category: "Languages" },
        { name: "Python", proficiency: 95, category: "Languages" },
        { name: "TypeScript", proficiency: 85, category: "Languages" },
      ];
      const result = groupSkillsByCategory(skills as any);
      const langGroup = result.find((c) => c.label === "Languages");
      expect(langGroup).toBeDefined();
      expect(langGroup!.skills.map((s) => s.name)).toEqual([
        "Python",
        "TypeScript",
        "JavaScript",
      ]);
    });

    it("skips invisible skills", () => {
      const skills: TestSkill[] = [
        { name: "Python", proficiency: 95, category: "Languages", is_visible: true },
        { name: "Perl", proficiency: 50, category: "Languages", is_visible: false },
      ];
      const result = groupSkillsByCategory(skills as any);
      const langGroup = result.find((c) => c.label === "Languages");
      expect(langGroup).toBeDefined();
      expect(langGroup!.skills).toHaveLength(1);
      expect(langGroup!.skills[0].name).toBe("Python");
    });

    it("assigns Expert level for proficiency >= 90", () => {
      const skills: TestSkill[] = [
        { name: "Python", proficiency: 95, category: "Languages" },
      ];
      const result = groupSkillsByCategory(skills as any);
      expect(result[0].skills[0].level).toBe("Expert");
    });

    it("assigns Advanced level for proficiency >= 75", () => {
      const skills: TestSkill[] = [
        { name: "React", proficiency: 80, category: "Frameworks" },
      ];
      const result = groupSkillsByCategory(skills as any);
      expect(result[0].skills[0].level).toBe("Advanced");
    });

    it("uses Other for missing category", () => {
      const skills: TestSkill[] = [
        { name: "Misc", proficiency: 50, category: null },
      ];
      const result = groupSkillsByCategory(skills as any);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe("Other");
      expect(result[0].key).toBe("other");
    });

    it("returns empty array for empty input", () => {
      const result = groupSkillsByCategory([]);
      expect(result).toEqual([]);
    });
  });
});
