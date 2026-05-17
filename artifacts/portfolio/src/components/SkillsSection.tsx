import { useState } from "react";
import { Code2, Zap } from "lucide-react";
import EmptyState from "./EmptyState";
import {
  type Skill,
  type SkillLevel,
  SKILL_CATEGORIES,
} from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useSkills, groupSkillsByCategory } from "@/hooks/use-portfolio-data";
import { useLanguage } from "@/lib/language";
import type { TranslationKeys } from "@/i18n";

function levelLabel(lvl: SkillLevel, t?: TranslationKeys): string {
  if (!t) return lvl;
  const map: Record<SkillLevel, keyof typeof t.skills.levels> = {
    Expert: "expert",
    Advanced: "advanced",
    Intermediate: "intermediate",
    Familiar: "beginner",
  };
  return t.skills.levels[map[lvl]];
}

const LEVEL_CONFIG: Record<
  SkillLevel,
  { dot: string; badge: string }
> = {
  Expert: {
    dot: "bg-primary",
    badge: "bg-primary/15 text-primary border-primary/25",
  },
  Advanced: {
    dot: "bg-accent",
    badge: "bg-accent/15 text-accent border-accent/25",
  },
  Intermediate: {
    dot: "bg-chart-3",
    badge: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  },
  Familiar: {
    dot: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
  },
};

function levelFromPct(p: number): SkillLevel {
  if (p >= 90) return "Expert";
  if (p >= 75) return "Advanced";
  if (p >= 60) return "Intermediate";
  return "Familiar";
}

function SkillTag({ skill, index, t }: { skill: Skill; index: number; t?: TranslationKeys }) {
  const [hovered, setHovered] = useState(false);
  const cfg = LEVEL_CONFIG[skill.level];
  const lvlLabel = levelLabel(skill.level, t);

  const sizeClass =
    skill.proficiency >= 90
      ? "text-sm px-4 py-2"
      : skill.proficiency >= 75
        ? "text-xs px-3.5 py-1.5"
        : "text-xs px-3 py-1.5";

  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setHovered(v => !v)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={(e) => e.key === "Enter" && setHovered(v => !v)}
      role="button"
      tabIndex={0}
      aria-label={`${skill.name}, ${lvlLabel}, ${skill.proficiency}% proficiency`}
      data-testid={`skill-tag-${skill.name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div
        className={`
          flex items-center gap-1.5 rounded-full border font-medium transition-all duration-200 cursor-pointer active:scale-[0.97]
          glass hover:scale-105 hover:shadow-[var(--shadow-float)] hover:border-primary/30
          ${sizeClass}
          ${skill.proficiency >= 90 ? "font-semibold" : ""}
        `}
        style={{ animationDelay: `${index * 35}ms` }}
      >
        {skill.icon && (
          <span className="text-base leading-none" aria-hidden>
            {skill.icon}
          </span>
        )}
        <span>{skill.name}</span>
        <span className="md:hidden text-[10px] text-muted-foreground ml-1">
          {lvlLabel} · {skill.proficiency}%
        </span>
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`}
          aria-hidden
        />
      </div>

      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none animate-fade-up">
          <div className="glass rounded-xl border px-3 py-2 min-w-[130px] shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                {skill.name}
              </span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}
              >
                {lvlLabel}
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-none"
                style={{ width: `${skill.proficiency}%` }}
              />
            </div>
            <div className="text-right text-[10px] text-muted-foreground mt-0.5">
              {skill.proficiency}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SkillsSkeleton() {
  return (
    <section id="skills" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4">
            Skills
          </div>
          <div className="h-10 w-40 bg-muted rounded mx-auto mb-3 animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mx-auto mb-6 animate-pulse" />
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-20 bg-muted rounded-full animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {Array.from({ length: 32 }).map((_, i) => (
            <div key={i} className="h-8 w-24 bg-muted rounded-full animate-pulse" />
          ))}
        </div>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(LEVEL_CONFIG).map(([lvl]) => (
            <div key={lvl} className="glass rounded-xl p-4 border text-center h-16 animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function SkillsSection() {
  const [activeCategory, setActiveCategory] = useState("all");
  const { ref, revealed } = useReveal();
  const { data: supabaseSkills, isLoading } = useSkills();
  const { t } = useLanguage();

  if (isLoading) {
    return <SkillsSkeleton />;
  }

  const categories =
    supabaseSkills && supabaseSkills.length > 0
      ? groupSkillsByCategory(supabaseSkills)
      : SKILL_CATEGORIES;

  const allSkills = categories.flatMap((c) => c.skills);
  const displaySkills =
    activeCategory === "all"
      ? allSkills
      : (categories.find((c) => c.key === activeCategory)?.skills ?? []);

  const expertCount = allSkills.filter((s) => s.level === "Expert").length;
  const advancedCount = allSkills.filter((s) => s.level === "Advanced").length;

  return (
    <section
      id="skills"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 px-6"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4">
            {t.skills.title}
          </div>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
            {t.skills.title}
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto mb-6">
            {allSkills.length} skills across {categories.length} domains —&nbsp;
            {expertCount} Expert, {advancedCount} Advanced.
          </p>

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setActiveCategory("all")}
              data-testid="skills-filter-all"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-float)]"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {t.projects.all} ({allSkills.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                data-testid={`skills-filter-${cat.key}`}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activeCategory === cat.key
                    ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-float)]"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {cat.label} ({cat.skills.length})
              </button>
            ))}
          </div>
        </div>

        {allSkills.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No skills listed yet"
            description="Skills data will appear here once added."
            compact
          />
        ) : (
          <div className={`section-reveal ${revealed ? "revealed" : ""}`}>
            <div className="flex flex-wrap gap-3 justify-center">
              {displaySkills.map((skill, i) => (
                <SkillTag key={skill.name} skill={skill} index={i} t={t} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(LEVEL_CONFIG).map(([lvl, cfg]) => {
            const count = allSkills.filter((s) => s.level === lvl).length;
            return (
              <div
                key={lvl}
                className="glass rounded-xl p-4 border text-center"
              >
                <div
                  className={`h-2 w-2 rounded-full ${cfg.dot} mx-auto mb-2`}
                />
                <div className="font-display font-bold text-lg text-foreground">
                  {count}
                </div>
                <div className="text-xs text-muted-foreground">{levelLabel(lvl as SkillLevel, t)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}