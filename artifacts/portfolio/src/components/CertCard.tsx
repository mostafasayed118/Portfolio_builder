import type { Certificate } from "@/data/portfolio";
import type { TranslationKeys } from "@/i18n";
import { ExternalLink } from "lucide-react";
import { useReveal } from "@/hooks/use-reveal";

export const CATEGORY_COLORS: Record<Certificate["category"], string> = {
  python: "bg-primary/10 text-primary border-primary/20",
  "data-engineering": "bg-accent/10 text-accent-foreground border-accent/20",
  cloud: "bg-secondary text-secondary-foreground border-secondary/30",
  database: "bg-muted text-muted-foreground border-border",
  ai: "bg-primary/15 text-primary border-primary/30",
};

export const CATEGORY_LABELS: Record<Certificate["category"], string> = {
  python: "Python",
  "data-engineering": "Data Engineering",
  cloud: "Cloud",
  database: "Database",
  ai: "AI & Data Science",
};

const ISSUER_COLORS: Record<string, string> = {
  DataCamp: "bg-primary/10 text-primary border-primary/20",
  IBM: "bg-accent/10 text-accent-foreground border-accent/20",
  "Microsoft DEPI": "bg-secondary text-secondary-foreground border-secondary/30",
  Microsoft: "bg-secondary text-secondary-foreground border-secondary/30",
  HackerRank: "bg-primary/5 text-primary border-primary/10",
  Maharatech: "bg-muted text-muted-foreground border-border",
};

export function CertCard({ cert, index, t }: { cert: Certificate; index: number; t: TranslationKeys }) {
  const { ref, revealed } = useReveal(0.05);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`group relative section-reveal ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${index * 60}ms` }}
      data-testid={`cert-card-${cert.id}`}
    >
      <div className="flex gap-4 items-start pb-6">
        <div className="relative shrink-0 z-10">
          <div className="h-9 w-9 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center text-base shadow-sm group-hover:border-primary transition-colors">
            {cert.issuerLogo}
          </div>
        </div>

        <div className="flex-1 glass rounded-xl border p-5 hover:border-primary/25 transition-all duration-200 hover:shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-sm text-foreground leading-snug mb-1.5 group-hover:text-primary transition-colors">
                {cert.title}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${ISSUER_COLORS[cert.issuer] ?? "bg-muted text-muted-foreground border-border"}`}
                >
                  {cert.issuer}
                </span>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cert.category]}`}
                >
                  {CATEGORY_LABELS[cert.category]}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                {cert.date}
              </span>
              <a
                href={cert.credentialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
                aria-label={`View ${cert.title} credential`}
                data-testid={`cert-link-${cert.id}`}
              >
                {t.certifications.viewCertificate} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
