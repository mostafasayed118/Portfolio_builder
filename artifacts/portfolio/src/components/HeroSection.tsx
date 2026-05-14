import { Github, Linkedin, Mail, MapPin, ArrowDown, Download } from "lucide-react";
import { useTypewriter } from "@/hooks/use-typewriter";
import { HERO } from "@/data/portfolio";
import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { getHeroContent } from "@workspace/db/hero-content";

function HeroTypewriter({ texts }: { texts: string[] }) {
  const role = useTypewriter(texts, { typingSpeed: 70, deletingSpeed: 40, pauseMs: 2000 });
  return (
    <span className="text-primary">
      {role}
      <span className="typewriter-cursor" aria-hidden />
    </span>
  );
}

export default function HeroSection() {
  const { data: supabaseHero } = useQuery({
    queryKey: ["heroContent"],
    queryFn: () => getHeroContent(getSupabase()),
    enabled: isSupabaseConfigured,
  });

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

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center gap-10 md:gap-16 pt-20 relative z-10">
        <div className="animate-fade-up flex-1 text-center md:text-left">
          {hero.available && (
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Available for Work
            </div>
          )}

          <h1 className="text-4xl md:text-6xl font-display font-bold mb-3 leading-tight text-foreground">
            {hero.heading}{" "}
            <span className="text-primary">{hero.name}</span>
          </h1>

          <div className="text-xl md:text-2xl font-display font-semibold text-muted-foreground min-h-[2rem] mb-4">
            <HeroTypewriter texts={hero.roles} />
          </div>

          <div className="flex items-center gap-1.5 justify-center md:justify-start text-sm text-muted-foreground mb-6">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Cairo, Egypt</span>
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
              Get In Touch
            </button>
            <button
              onClick={() => scrollTo("#projects")}
              className="px-6 py-2.5 rounded-xl border border-border bg-card/70 text-foreground font-semibold text-sm hover:opacity-70 transition-opacity"
              data-testid="btn-view-projects"
            >
              View Projects
            </button>
            <a
              href="/api/cv"
              download={hero.cvFileName}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-primary/40 bg-primary/8 text-primary font-semibold text-sm hover:opacity-70 transition-opacity"
              data-testid="btn-download-cv"
            >
              <Download className="h-4 w-4" />
              Download CV
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
          <div className="relative h-56 w-56 md:h-72 md:w-72">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 blur-xl" />
            <div className="relative h-full w-full rounded-3xl glass border border-primary/20 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
              <div className="relative z-10 text-center p-6">
                <div className="font-display font-bold text-6xl md:text-7xl text-primary mb-1">MS</div>
                <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Data Engineer</div>
              </div>
            </div>
            <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-sm flex items-center justify-center">
              <span className="text-xs">🐍</span>
            </div>
            <div className="absolute -bottom-3 -left-3 h-8 w-8 rounded-full bg-accent/20 border border-accent/30 backdrop-blur-sm flex items-center justify-center">
              <span className="text-xs">☁️</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => scrollTo("#about")}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors group"
        aria-label="Scroll down"
      >
        <span className="text-xs font-medium">Scroll Down</span>
        <ArrowDown className="h-4 w-4 animate-bounce" />
      </button>
    </section>
  );
}
