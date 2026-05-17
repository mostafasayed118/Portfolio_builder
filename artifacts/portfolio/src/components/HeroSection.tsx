import { useState } from "react";
import { Github, Linkedin, Mail, MapPin, ArrowDown, Download, Code, Cpu } from "lucide-react";
import { motion } from "framer-motion";
import { useMouseTilt } from "@/hooks/use-mouse-tilt";
import { useTypewriter } from "@/hooks/use-typewriter";
import { useThrottledScroll } from "@/hooks/use-throttled-scroll";
import { HERO } from "@/data/portfolio";
import { useHeroContent } from "@/hooks/use-portfolio-data";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { trackEvent } from "@workspace/db/analytics";
import { useLanguage } from "@/lib/language";

function RotatingRing() {
  return (
    <motion.div
      className="absolute -inset-8 rounded-full border-2 border-dashed border-primary/15"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    />
  );
}

function FloatingIcon({ icon: Icon, className, delay = 0 }: { icon: React.ElementType; className: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <Icon className="h-full w-full" />
    </motion.div>
  );
}

function HeroTypewriter({ texts }: { texts: string[] }) {
  const role = useTypewriter(texts, { typingSpeed: 70, deletingSpeed: 40, pauseMs: 2000 });
  return (
    <span className="text-primary">
      {role}
      <span className="typewriter-cursor" aria-hidden />
    </span>
  );
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useThrottledScroll(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    setProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);
  }, 16);
  return (
    <div className="fixed top-16 left-0 right-0 h-0.5 z-50 bg-muted/30 pointer-events-none">
      <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-150" style={{ width: `${progress}%` }} />
    </div>
  );
}

function BackgroundOrbs() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <motion.div
        animate={{ x: [0, 30, 0, -20, 0], y: [0, -20, 30, 10, 0], scale: [1, 1.1, 0.95, 1.05, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/15 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, -25, 15, 0], y: [0, 20, -15, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-accent/20 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, 15, -10, 0], y: [0, -10, 20, 0], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-2xl"
      />
    </div>
  );
}

function HeroSkeleton() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center gap-10 md:gap-16 pt-20 relative z-10">
        <div className="animate-fade-up flex-1 text-center md:text-left w-full md:w-auto">
          <div className="h-6 w-24 bg-muted rounded-full mb-6 animate-pulse" />
          <div className="h-10 w-64 bg-muted rounded mb-3 animate-pulse" />
          <div className="h-8 w-56 bg-muted rounded mb-4 animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded mb-6 animate-pulse" />
          <div className="h-4 w-full max-w-xs bg-muted rounded mb-2 animate-pulse" />
          <div className="h-4 w-3/4 max-w-xs bg-muted rounded mb-8 animate-pulse" />
          <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-8">
            <div className="h-10 w-32 bg-muted rounded-xl animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-xl animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-xl animate-pulse" />
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
            <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
            <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
        <div className="relative shrink-0 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="relative h-56 w-56 md:h-72 md:w-72">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 blur-xl" />
            <div className="relative h-full w-full rounded-3xl glass border border-primary/20 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
              <div className="relative z-10 text-center p-6">
                <div className="font-display font-bold text-6xl md:text-7xl text-primary mb-1">MS</div>
                <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Data Engineer</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HeroSection() {
  const { data: supabaseHero, isLoading } = useHeroContent();
  const tilt = useMouseTilt(12);
  const { t, isArabic } = useLanguage();

  const hero = supabaseHero
    ? {
        heading: supabaseHero.heading,
        name: supabaseHero.name,
        roles: supabaseHero.roles,
        description: supabaseHero.description,
        github: supabaseHero.github_url,
        linkedin: supabaseHero.linkedin_url,
        email: supabaseHero.email,
        available: supabaseHero.available,
        cvFileName: supabaseHero.cv_file_name ?? "Mustafa_Sayed_Resume.pdf",
      }
    : {
        ...HERO,
        available: true,
        cvFileName: "Mustafa_Sayed_Resume.pdf",
      };

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  if (isLoading) {
    return <HeroSkeleton />;
  }

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden"
    >
      <BackgroundOrbs />

      <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center gap-10 md:gap-16 pt-20 relative z-10">
        <div className="animate-fade-up flex-1 text-center md:text-left">
          {hero.available && (
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              {t.hero.availableForWork}
            </div>
          )}

          <h1 className="text-4xl md:text-6xl font-display font-bold mb-3 leading-tight">
            <span className="text-foreground">{hero.heading} </span>
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient-x">
              {hero.name}
            </span>
          </h1>

          <div className="text-xl md:text-2xl font-display font-semibold text-muted-foreground min-h-[2rem] mb-4">
            <HeroTypewriter texts={hero.roles} />
          </div>

          <div className="flex items-center gap-1.5 justify-center md:justify-start text-sm text-muted-foreground mb-6">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{"Cairo, Egypt"}</span>
          </div>

          <p className="text-muted-foreground leading-relaxed max-w-md mx-auto md:mx-0 mb-8 text-sm md:text-base">
            {hero.description}
          </p>

          <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-8">
            <button
              onClick={() => scrollTo("#contact")}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-[var(--shadow-float)]"
              data-testid="btn-get-in-touch"
            >
              {t.contact.title}
            </button>
            <button
              onClick={() => scrollTo("#projects")}
              className="px-6 py-2.5 rounded-xl border border-border bg-card/70 text-foreground font-semibold text-sm hover:opacity-70 transition-opacity"
              data-testid="btn-view-projects"
            >
              {t.hero.viewProjects}
            </button>
            <a
              href={`${import.meta.env.VITE_API_URL ?? ""}/api/v1/cv`}
              download
              title="Download CV — includes QR code linking to this portfolio"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-primary/40 bg-primary/8 text-primary font-semibold text-sm hover:opacity-70 transition-opacity"
              data-testid="btn-download-cv"
              onClick={() => {
                if (isSupabaseConfigured) {
                  trackEvent(getSupabase(), "cv_download", "/", { source: "hero" }).catch(() => {});
                }
              }}
            >
              <Download className="h-4 w-4" />
              {t.hero.downloadCV}
            </a>
          </div>

          <div className="flex items-center gap-3 justify-center md:justify-start">
            <a
              href={hero.github}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 w-10 rounded-xl flex items-center justify-center glass border hover:border-primary/40 hover:text-primary text-muted-foreground transition-all"
              aria-label="GitHub"
              data-testid="link-github"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href={hero.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 w-10 rounded-xl flex items-center justify-center glass border hover:border-primary/40 hover:text-primary text-muted-foreground transition-all"
              aria-label="LinkedIn"
              data-testid="link-linkedin"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href={`mailto:${hero.email}`}
              className="h-10 w-10 rounded-xl flex items-center justify-center glass border hover:border-primary/40 hover:text-primary text-muted-foreground transition-all"
              aria-label="Email"
              data-testid="link-email"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="relative shrink-0 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <motion.div
            ref={tilt.ref}
            onMouseMove={tilt.onMouseMove}
            onMouseEnter={tilt.onMouseEnter}
            onMouseLeave={tilt.onMouseLeave}
            style={tilt.style}
            className="relative cursor-pointer hidden md:block"
          >
            <div className="relative h-56 w-56 md:h-72 md:w-72">
              <RotatingRing />
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 blur-xl" />
              <div className="relative h-full w-full rounded-3xl glass border border-primary/20 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
                <div className="relative z-10 text-center p-6">
                  <div className="font-display font-bold text-6xl md:text-7xl text-primary mb-1">MS</div>
                  <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Data Engineer</div>
                </div>
              </div>
              <FloatingIcon icon={Code} className="absolute -top-4 -right-4 h-7 w-7 text-primary/40" delay={0} />
              <FloatingIcon icon={Cpu} className="absolute -bottom-4 -left-4 h-7 w-7 text-accent/40" delay={1} />
            </div>
          </motion.div>

          <div className="md:hidden">
            <div className="relative h-56 w-56 md:h-72 md:w-72">
              <RotatingRing />
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 blur-xl" />
              <div className="relative h-full w-full rounded-3xl glass border border-primary/20 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
                <div className="relative z-10 text-center p-6">
                  <div className="font-display font-bold text-6xl md:text-7xl text-primary mb-1">MS</div>
                  <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Data Engineer</div>
                </div>
              </div>
              <FloatingIcon icon={Code} className="absolute -top-4 -right-4 h-7 w-7 text-primary/40" delay={0} />
              <FloatingIcon icon={Cpu} className="absolute -bottom-4 -left-4 h-7 w-7 text-accent/40" delay={1} />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => scrollTo("#about")}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors group"
        aria-label="Scroll down"
      >
        <span className="text-xs font-medium">{t.common.readMore}</span>
        <ArrowDown className={`h-4 w-4 animate-bounce ${isArabic ? "flip-rtl" : ""}`} />
      </button>
    </section>
  );
}
