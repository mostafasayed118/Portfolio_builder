export type SkillLevel = "Expert" | "Advanced" | "Intermediate" | "Familiar";

export interface Skill {
  name: string;
  proficiency: number;
  level: SkillLevel;
  icon?: string;
}

export interface SkillCategory {
  key: string;
  label: string;
  color: string;
  skills: Skill[];
}
