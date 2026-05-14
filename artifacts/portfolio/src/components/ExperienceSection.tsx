import TimelineItem from "./TimelineItem";
import { EXPERIENCE } from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { listExperience } from "@workspace/db/experience";

export default function ExperienceSection() {
  const { ref, revealed } = useReveal();
  const { data: expData } = useQuery({
    queryKey: ["experience"],
    queryFn: () => listExperience(getSupabase()),
    enabled: isSupabaseConfigured,
  });

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
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4">
            Experience
          </div>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
            My Journey
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Scholarships, certifications, and community contributions that
            shaped my data engineering career.
          </p>
        </div>

        <div
          className={`relative ml-2 section-reveal ${revealed ? "revealed" : ""}`}
        >
          {items.map((item) => (
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
            />
          ))}
        </div>
      </div>
    </section>
  );
}
