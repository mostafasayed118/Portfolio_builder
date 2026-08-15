import { ArrowDown, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useHero } from "@/features/hero/hooks/useHero";
import { BackgroundOrbs } from "@/features/hero/components/HeroBackground";
import { AvatarContent } from "@/features/hero/components/HeroAvatar";
import { HeroTypewriter } from "@/features/hero/components/HeroTypewriter";
import { HeroCTAButtons } from "@/features/hero/components/HeroCTAButtons";
import { HeroSocialLinks } from "@/features/hero/components/HeroSocialLinks";
import { HeroSkeleton } from "@/features/hero/components/HeroSkeleton";
import { CONTACT } from "@/data/portfolio";

export default function HeroSection() {
  const { hero, isLoading, tilt, t, isArabic, reducedMotion, cvHref, scrollTo, trackCvDownload } = useHero();

  if (isLoading) return <HeroSkeleton />;

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      <BackgroundOrbs reduced={reducedMotion} />
      <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center gap-10 md:gap-16 pt-20 relative z-10">
        <div className="animate-fade-up flex-1 text-center md:text-left">
          {hero.available && (
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
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
            <HeroTypewriter texts={hero.roles} fallback={t.hero.fallbackRole} />
          </div>
          <div className="flex items-center gap-1.5 justify-center md:justify-start text-sm text-muted-foreground mb-6">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{CONTACT.location}</span>
          </div>
          <p className="text-muted-foreground leading-relaxed max-w-md mx-auto md:mx-0 mb-8 text-sm md:text-base">
            {hero.description}
          </p>
          <HeroCTAButtons cvHref={cvHref} onCvDownload={trackCvDownload} scrollTo={scrollTo} t={t} />
          <HeroSocialLinks hero={hero} />
        </div>
        <div className="relative shrink-0 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <motion.div ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseEnter={tilt.onMouseEnter}
            onMouseLeave={tilt.onMouseLeave} style={tilt.style} className="relative cursor-pointer hidden md:block">
            <AvatarContent reduced={reducedMotion} />
          </motion.div>
          <div className="md:hidden">
            <AvatarContent reduced={reducedMotion} />
          </div>
        </div>
      </div>
      <button onClick={() => scrollTo("#about")}
        className="absolute bottom-4 sm:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors group"
        aria-label="Scroll down">
        <span className="text-xs font-medium">{t.common.readMore}</span>
        <ArrowDown className={`h-4 w-4 animate-bounce ${isArabic ? "flip-rtl" : ""}`} />
      </button>
    </section>
  );
}
