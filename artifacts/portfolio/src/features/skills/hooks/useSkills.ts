import { useSkills as useDbSkills, groupSkillsByCategory as groupByCategory } from "@/hooks/use-portfolio-data";
import { SKILL_CATEGORIES } from "@/data/portfolio";
import type { SkillCategory } from "@/features/skills/types";
import type { SkillListItem } from "@workspace/db/skills";

export function useSkills() {
  return useDbSkills();
}

export function groupSkillsByCategory(supabaseSkills: SkillListItem[]): SkillCategory[] {
  return groupByCategory(supabaseSkills);
}

export { SKILL_CATEGORIES };
