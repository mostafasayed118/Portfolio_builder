import { GraduationCap, Languages, MapPin, Briefcase } from "lucide-react";
import SkillMeter from "@/components/SkillMeter";
import { SKILLS, STATS } from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useAbout } from "@/features/about/hooks/useAbout";
import { AboutSkeleton } from "@/features/about/components/AboutSkeleton";
import SectionHeader from "@/components/SectionHeader";
import { useLanguage } from "@/lib/language";

export default function AboutSection() {
  const { ref, revealed } = useReveal();
  const { about, isLoading } = useAbout();
  const { t } = useLanguage();

  if (isLoading) return <AboutSkeleton />;

  return (
    <section id="about" ref={ref} className="relative py-24 px-6 bg-muted/20 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/4 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/4 rounded-full blur-[100px]" />
      </div>
      <div className="max-w-5xl mx-auto relative z-10">
        <SectionHeader
          label={t.about.title}
          title={t.about.title}
          description={about.bio1}
        />
        <div className={`grid md:grid-cols-2 gap-8 md:gap-10 section-reveal ${revealed ? "revealed" : ""}`}>
          <div className="space-y-6">
            <p className="text-muted-foreground leading-relaxed text-sm max-w-prose">{about.bio2}</p>
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
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{about.education.grade}</span>
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
                {about.languages.map((lang, i) => (
                  <div key={`${lang.lang}-${i}`}>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-foreground">{lang.lang}</span>
                      <span className="text-muted-foreground">{lang.level}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r from-primary to-accent stat-bar${revealed ? " revealed" : ""}`}
                        style={revealed ? { transform: `scaleX(${lang.pct / 100})` } : undefined} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground glass rounded-lg px-3 py-2 border">
                <MapPin className="h-3.5 w-3.5 text-primary" />{about.location}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground glass rounded-lg px-3 py-2 border">
                <Briefcase className="h-3.5 w-3.5 text-primary" />{about.yearsOfExperience}+ {t.experience.years} Experience
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">{t.skills.title}</h3>
              <div className="space-y-4">
                {SKILLS.map((skill) => <SkillMeter key={skill.label} label={skill.label} value={skill.value} />)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {STATS.map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-4 border text-center relative group">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50 animate-gradient-x opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
                  <div className="font-display font-bold text-2xl text-primary mb-0.5">{stat.value}{stat.suffix}</div>
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
