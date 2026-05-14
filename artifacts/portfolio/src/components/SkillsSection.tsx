import { useState } from "react";
import {
  SKILL_CATEGORIES,
  type Skill,
  type SkillLevel,
} from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { listSkills } from "@workspace/db/skills";

const LEVEL_CONFIG: Record<
  SkillLevel,
  { label: string; dot: string; badge: string }
> = {
  Expert: {
    label: "Expert",
    dot: "bg-primary",
    badge: "bg-primary/15 text-primary border-primary/25",
  },
  Advanced: {
    label: "Advanced",
    dot: "bg-accent",
    badge: "bg-accent/15 text-accent border-accent/25",
  },
  Intermediate: {
    label: "Intermediate",
    dot: "bg-chart-3",
    badge: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  },
  Familiar: {
    label: "Familiar",
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

function SkillTag({ skill, index }: { skill: Skill; index: number }) {
  const [hovered, setHovered] = useState(false);
  const cfg = LEVEL_CONFIG[skill.level];

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
      data-testid={`skill-tag-${skill.name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <button
        className={`
          flex items-center gap-1.5 rounded-full border font-medium transition-all duration-200
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
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`}
          aria-hidden
        />
      </button>

      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none animate-fade-up">
          <div className="glass rounded-xl border px-3 py-2 min-w-[120px] shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                {skill.name}
              </span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}
              >
                {cfg.label}
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

export default function SkillsSection() {
  const [activeCategory, setActiveCategory] = useState("all");
  const { ref, revealed } = useReveal();
  const { data: supabaseSkills } = useQuery({
    queryKey: ["skills"],
    queryFn: () => listSkills(getSupabase()),
    enabled: isSupabaseConfigured,
  });

  const categories =
    supabaseSkills && supabaseSkills.length > 0
      ? (() => {
          const grouped: Record<string, Skill[]> = {};
          for (const s of supabaseSkills) {
            if (s.is_visible === false) continue;
            const cat = s.category || "Other";
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({
              name: s.name,
              proficiency: s.proficiency,
              level: levelFromPct(s.proficiency),
              icon: s.icon ?? undefined,
            });
          }
          return Object.entries(grouped).map(([key, skills]) => ({
            key: key.toLowerCase().replace(/\s+/g, "-"),
            label: key,
            color: "blue",
            skills: skills.sort((a, b) => b.proficiency - a.proficiency),
          }));
        })()
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
            Skills
          </div>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
            Tech Stack
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
              All ({allSkills.length})
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

        <div className={`section-reveal ${revealed ? "revealed" : ""}`}>
          <div className="flex flex-wrap gap-3 justify-center">
            {displaySkills.map((skill, i) => (
              <SkillTag key={skill.name} skill={skill} index={i} />
            ))}
          </div>
        </div>

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
                <div className="text-xs text-muted-foreground">{cfg.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
