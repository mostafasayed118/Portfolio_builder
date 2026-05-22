import { useLanguage } from "@/lib/language";
import { Briefcase } from "lucide-react";
import TimelineItem from "./TimelineItem";
import SectionLabel from "./SectionLabel";
import EmptyState from "./EmptyState";
import { EXPERIENCE } from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useExperience } from "@/hooks/use-portfolio-data";

function ExperienceSkeleton() {
  return (
    <section id="experience" className="py-24 px-6 bg-muted/20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4">
            Experience
          </div>
          <div className="h-10 w-40 bg-muted rounded mx-auto mb-3 animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mx-auto animate-pulse" />
        </div>
        <div className="relative ml-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="mb-6">
              <div className="flex gap-4 items-start pb-6">
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 glass rounded-xl border p-4 animate-pulse">
                  <div className="h-5 w-48 bg-muted rounded mb-2" />
                  <div className="h-3 w-32 bg-muted rounded mb-2" />
                  <div className="h-3 w-24 bg-muted rounded mb-3" />
                  <div className="space-y-1">
                    <div className="h-3 w-full bg-muted rounded" />
                    <div className="h-3 w-5/6 bg-muted rounded" />
                    <div className="h-3 w-4/5 bg-muted rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ExperienceSection() {
  const { ref, revealed } = useReveal();
  const { t } = useLanguage();
  const { data: expData, isLoading } = useExperience();

  if (isLoading) {
    return <ExperienceSkeleton />;
  }

  const items =
    expData && expData.length > 0
      ? [...expData]
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((e, i) => ({
            id: e.id,
            title: e.title,
            company: e.company,
            location: e.location,
            period: e.period,
            description: e.description,
            technologies: e.technologies,
            type: e.type,
            index: i,
          }))
      : EXPERIENCE.map((e, i) => ({ ...e, id: String(e.id), index: i }));

  return (
    <section
      id="experience"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 px-6 bg-muted/20"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <SectionLabel>{t.experience.title}</SectionLabel> {/* FIX: UX-002 */}
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
            {t.experience.title}
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Scholarships, certifications, and community contributions that
            shaped my data engineering career.
          </p>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No experience yet"
            description="Experience entries will appear here once added."
            compact
          />
        ) : (
          <div
            className={`relative ml-2 section-reveal ${revealed ? "revealed" : ""}`}
          >
            {items.map((item, i) => (
              <TimelineItem
                key={item.id}
                title={item.title}
                company={item.company}
                location={item.location}
                period={item.period}
                description={item.description}
                technologies={item.technologies}
                type={item.type}
                index={item.index}
                isLast={i === items.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}