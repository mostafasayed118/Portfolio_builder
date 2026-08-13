export type SkillRow = {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  is_visible: boolean;
  sort_order: number;
};

export const BLANK_SKILL = { name: "", category: "", proficiency: 75, is_visible: true, sort_order: 999 };

export function mapToSkillRow(s: {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  is_visible: boolean | null;
  sort_order: number | null;
}): SkillRow {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    proficiency: s.proficiency,
    is_visible: s.is_visible ?? false,
    sort_order: s.sort_order ?? 0,
  };
}
