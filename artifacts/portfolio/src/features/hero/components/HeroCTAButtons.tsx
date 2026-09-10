import { Download } from "lucide-react";
import type { HeroCTAAction } from "@/features/hero/types";
import type { TranslationKeys } from "@/i18n/en";

interface HeroCTAButtonsProps {
  cvHref: string;
  onCvDownload: () => void;
  scrollTo: HeroCTAAction;
  t: TranslationKeys;
}

export function HeroCTAButtons({ cvHref, onCvDownload, scrollTo, t }: HeroCTAButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-8">
      <a href="#contact" onClick={() => scrollTo("#contact")}
        className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-[var(--shadow-float)]"
        data-testid="btn-get-in-touch">
        {t.contact?.title || "Get In Touch"}
      </a>
      <a href="#projects" onClick={() => scrollTo("#projects")}
        className="px-6 py-2.5 rounded-xl border border-border bg-card/70 text-foreground font-semibold text-sm hover:opacity-70 transition-opacity"
        data-testid="btn-view-projects">
        {t.hero?.viewProjects || "View Projects"}
      </a>
      <a href={cvHref || undefined} download aria-disabled={!cvHref}
        title={cvHref ? "Download CV" : "CV download unavailable"}
        className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border font-semibold text-sm transition-opacity ${
          cvHref ? "border-primary/40 bg-primary/8 text-primary hover:opacity-70" : "border-border/40 bg-muted/40 text-muted-foreground cursor-not-allowed"
        }`}
        data-testid="btn-download-cv"
        onClick={(e) => { if (!cvHref) { e.preventDefault(); return; } onCvDownload(); }}>
        <Download className="h-4 w-4" />
        {t.hero?.downloadCV || "Download CV"}
      </a>
    </div>
  );
}
