import { useState } from "react";
import { Zap } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import { useSkills, groupSkillsByCategory, SKILL_CATEGORIES } from "@/features/skills/hooks/useSkills";
import { useLanguage } from "@/lib/language";
import { SkillTag, LEVEL_CONFIG } from "@/features/skills/components/SkillTag";
import { SkillsSkeleton } from "@/features/skills/components/SkillsSkeleton";
import type { SkillLevel } from "@/features/skills/types";
import type { TranslationKeys } from "@/i18n";

function levelLabel(lvl: SkillLevel, t?: TranslationKeys): string {
  if (!t) return lvl;
  const map: Record<SkillLevel, keyof typeof t.skills.levels> = {
    Expert: "expert", Advanced: "advanced", Intermediate: "intermediate", Familiar: "beginner",
  };
  return t.skills.levels[map[lvl]];
}

export default function SkillsSection() {
  const [activeCategory, setActiveCategory] = useState("all");
  const { data: supabaseSkills, isLoading } = useSkills();
  const { t } = useLanguage();

  if (isLoading) return <SkillsSkeleton />;

  const categories = supabaseSkills && supabaseSkills.length > 0
    ? groupSkillsByCategory(supabaseSkills) : SKILL_CATEGORIES;
  const allSkills = categories.flatMap((c) => c.skills);
  const displaySkills = activeCategory === "all"
    ? allSkills : (categories.find((c) => c.key === activeCategory)?.skills ?? []);
  const expertCount = allSkills.filter((s) => s.level === "Expert").length;
  const advancedCount = allSkills.filter((s) => s.level === "Advanced").length;

  return (
    <section id="skills" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          label={t.skills.title}
          title={t.skills.title}
          description={`${allSkills.length} skills across ${categories.length} domains — ${expertCount} Expert, ${advancedCount} Advanced.`}
          descriptionClassName="mb-6"
        >
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={() => setActiveCategory("all")} aria-pressed={activeCategory === "all"}
              data-testid="skills-filter-all"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${activeCategory === "all" ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-float)]" : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"}`}>
              {t.projects.all} ({allSkills.length})
            </button>
            {categories.map((cat) => (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)} aria-pressed={activeCategory === cat.key}
                data-testid={`skills-filter-${cat.key}`}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${activeCategory === cat.key ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-float)]" : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"}`}>
                {cat.label} ({cat.skills.length})
              </button>
            ))}
          </div>
        </SectionHeader>
        {allSkills.length === 0 ? (
          <EmptyState icon={Zap} title="No skills listed yet" description="Skills data will appear here once added." compact />
        ) : (
          <div>
            <div className="flex flex-wrap gap-3 justify-center">
              {displaySkills.map((skill, i) => <SkillTag key={skill.name} skill={skill} index={i} t={t} />)}
            </div>
          </div>
        )}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(LEVEL_CONFIG).map(([lvl, cfg]) => {
            const count = allSkills.filter((s) => s.level === lvl).length;
            return (
              <div key={lvl} className="glass rounded-xl p-4 border text-center">
                <div className={`h-2 w-2 rounded-full ${cfg.dot} mx-auto mb-2`} />
                <div className="font-display font-bold text-lg text-foreground">{count}</div>
                <div className="text-xs text-muted-foreground">{levelLabel(lvl as SkillLevel, t)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
