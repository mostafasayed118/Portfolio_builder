import { GraduationCap, Languages, MapPin, Briefcase } from "lucide-react";
import SkillMeter from "./SkillMeter";
import { ABOUT, SKILLS, STATS } from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useAboutContent } from "@/hooks/use-portfolio-data";
import SectionLabel from "./SectionLabel";
import { useLanguage } from "@/lib/language";
import { useLocalized } from "@/hooks/use-localized";

function AboutSkeleton() {
  return (
    <section id="about" className="py-24 px-6 bg-muted/20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-block h-6 w-16 bg-muted rounded-full mb-4 animate-pulse" />
          <div className="h-10 w-48 bg-muted rounded mx-auto mb-3 animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mx-auto animate-pulse" />
        </div>
        <div className="grid md:grid-cols-2 gap-8 md:gap-10">
          <div className="space-y-6">
            <div className="h-4 w-full bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-5/6 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-full bg-muted rounded animate-pulse mb-2" />
            <div className="glass rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-5 w-5 text-primary" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-4 w-48 bg-muted rounded animate-pulse mb-1" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse mb-1.5" />
              <div className="flex items-center gap-2 mt-1.5">
                <div className="h-5 w-24 bg-muted rounded-full animate-pulse" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Languages className="h-5 w-5 text-primary" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-20 bg-muted rounded animate-pulse mb-1" />
                <div className="h-1.5 w-full bg-muted rounded-full animate-pulse" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse mb-1" />
                <div className="h-1.5 w-full bg-muted rounded-full animate-pulse" />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
              <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-5 w-24 bg-muted rounded animate-pulse mb-4" />
            <div className="space-y-4">
              {SKILLS.map((_, i) => (
                <div key={i} className="h-6 w-48 bg-muted rounded animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {STATS.map((_, i) => (
                <div key={i} className="glass rounded-xl p-4 border h-16 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AboutSection() {
  const { ref, revealed } = useReveal();
  const { data: supabaseAbout, isLoading } = useAboutContent();
  const { t } = useLanguage();
  const { localize } = useLocalized();

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
        languages: Array.isArray(supabaseAbout.languages)
          ? (supabaseAbout.languages as unknown as Array<{lang: string; level: string; pct: number}>)
          : [],
      }
    : ABOUT;

  if (isLoading) {
    return <AboutSkeleton />;
  }

  return (
    <section
      id="about"
      ref={ref as React.RefObject<HTMLElement>}
      className="relative py-24 px-6 bg-muted/20 overflow-hidden"
    >
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/4 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/4 rounded-full blur-[100px]" />
      </div>
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-14">
          <SectionLabel>{t.about.title}</SectionLabel>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">{t.about.title}</h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            {about.bio1}
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

            <div className="glass rounded-xl p-5 space-y-2 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x" />
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm font-display">{t.about.education}</span>
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

            <div className="glass rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent via-primary to-accent animate-gradient-x" />
              <div className="flex items-center gap-2 mb-4">
                <Languages className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm font-display">{t.about.languages}</span>
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
                {about.yearsOfExperience}+ {t.experience.years} Experience
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">{t.skills.title}</h3>
              <div className="space-y-4">
                {SKILLS.map((skill) => (
                  <SkillMeter key={skill.label} label={skill.label} value={skill.value} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {STATS.map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-4 border text-center relative group">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50 animate-gradient-x opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
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