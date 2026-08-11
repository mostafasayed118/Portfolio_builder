import { useState } from "react";
import type { Skill, SkillLevel } from "@/features/skills/types";
import type { TranslationKeys } from "@/i18n";

function levelLabel(lvl: SkillLevel, t?: TranslationKeys): string {
  if (!t) return lvl;
  const map: Record<SkillLevel, keyof typeof t.skills.levels> = {
    Expert: "expert", Advanced: "advanced", Intermediate: "intermediate", Familiar: "beginner",
  };
  return t.skills.levels[map[lvl]];
}

export const LEVEL_CONFIG: Record<SkillLevel, { dot: string; badge: string }> = {
  Expert: { dot: "bg-primary", badge: "bg-primary/15 text-primary border-primary/25" },
  Advanced: { dot: "bg-accent", badge: "bg-accent/15 text-accent border-accent/25" },
  Intermediate: { dot: "bg-chart-3", badge: "bg-chart-3/15 text-chart-3 border-chart-3/25" },
  Familiar: { dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border-border" },
};

export function SkillTag({ skill, index, t }: { skill: Skill; index: number; t?: TranslationKeys }) {
  const [hovered, setHovered] = useState(false);
  const cfg = LEVEL_CONFIG[skill.level];
  const lvlLabel = levelLabel(skill.level, t);
  const sizeClass = skill.proficiency >= 90 ? "text-sm px-4 py-2" : skill.proficiency >= 75 ? "text-xs px-3.5 py-1.5" : "text-xs px-3 py-1.5";

  return (
    <div className="relative group"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => setHovered(v => !v)} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setHovered(v => !v); } }}
      role="button" tabIndex={0}
      aria-label={`${skill.name}, ${lvlLabel}, ${skill.proficiency}% proficiency`}
      data-testid={`skill-tag-${skill.name.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className={`flex items-center gap-1.5 rounded-full border font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] glass hover:scale-105 hover:shadow-[var(--shadow-float)] hover:border-primary/30 ${sizeClass} ${skill.proficiency >= 90 ? "font-semibold" : ""}`}
        style={{ animationDelay: `${index * 35}ms` }}>
        {skill.icon && <span className="text-base leading-none" aria-hidden>{skill.icon}</span>}
        <span>{skill.name}</span>
        <span className="md:hidden text-[10px] text-muted-foreground ml-1">{lvlLabel} · {skill.proficiency}%</span>
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden />
      </div>
      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none animate-fade-up">
          <div className="glass rounded-xl border px-3 py-2 min-w-[130px] shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">{skill.name}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>{lvlLabel}</span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-none" style={{ width: `${skill.proficiency}%` }} />
            </div>
            <div className="text-right text-[10px] text-muted-foreground mt-0.5">{skill.proficiency}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
