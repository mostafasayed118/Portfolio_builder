import { GraduationCap, Languages, MapPin, Briefcase } from "lucide-react";
import SkillMeter from "./SkillMeter";
import { ABOUT, SKILLS, STATS } from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { getAboutContent } from "@workspace/db/about-content";

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4">
      {text}
    </div>
  );
}

export default function AboutSection() {
  const { ref, revealed } = useReveal();
  const { data: supabaseAbout } = useQuery({
    queryKey: ["aboutContent"],
    queryFn: () => getAboutContent(getSupabase()),
    enabled: isSupabaseConfigured,
  });

  const about = supabaseAbout
    ? {
        bio1: supabaseAbout.bio1,
        bio2: supabaseAbout.bio2,
        location: supabaseAbout.location,
        yearsOfExperience: supabaseAbout.years_of_experience,
        education: {
          degree: supabaseAbout.degree,
          school: supabaseAbout.school,
          grade: supabaseAbout.grade,
          years: supabaseAbout.education_years,
        },
        languages: (supabaseAbout.languages as Array<{lang: string; level: string; pct: number}>) ?? [],
      }
    : ABOUT;

  return (
    <section
      id="about"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 px-6 bg-muted/20"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <SectionLabel text="About Me" />
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">Who I Am</h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            A data-driven engineer focused on building reliable pipelines and extracting insights from complex datasets.
          </p>
        </div>

        <div
          className={`grid md:grid-cols-2 gap-8 md:gap-10 section-reveal ${revealed ? "revealed" : ""}`}
        >
          <div className="space-y-6">
            <p className="text-muted-foreground leading-relaxed text-sm">
              {about.bio1}
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm">
              {about.bio2}
            </p>

            <div className="glass rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm font-display">Education</span>
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">{about.education.degree}</p>
                <p className="text-xs text-muted-foreground">{about.education.school}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {about.education.grade}
                  </span>
                  <span className="text-xs text-muted-foreground">{about.education.years}</span>
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Languages className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm font-display">Languages</span>
              </div>
              <div className="space-y-3">
                {about.languages.map((lang) => (
                  <div key={lang.lang}>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-foreground">{lang.lang}</span>
                      <span className="text-muted-foreground">{lang.level}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r from-primary to-accent stat-bar${revealed ? " revealed" : ""}`}
                        style={revealed ? { transform: `scaleX(${lang.pct / 100})` } : undefined}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground glass rounded-lg px-3 py-2 border">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {about.location}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground glass rounded-lg px-3 py-2 border">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                {about.yearsOfExperience}+ Year Experience
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">Technical Skills</h3>
              <div className="space-y-4">
                {SKILLS.map((skill) => (
                  <SkillMeter key={skill.label} label={skill.label} value={skill.value} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {STATS.map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-4 border text-center">
                  <div className="font-display font-bold text-2xl text-primary mb-0.5">
                    {stat.value}{stat.suffix}
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
