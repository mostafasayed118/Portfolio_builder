import { useState } from "react";
import { useLanguage } from "@/lib/language";
import type { TranslationKeys } from "@/i18n";
import { ExternalLink, Award, ScrollText } from "lucide-react";
import EmptyState from "./EmptyState";
import SectionLabel from "./SectionLabel";
import { CERTIFICATIONS, type Certificate } from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useCertifications } from "@/hooks/use-portfolio-data";

const VALID_CATEGORIES = new Set([
  "python",
  "data-engineering",
  "cloud",
  "database",
  "ai",
]);

function getFilters(t: TranslationKeys) {
  return [
    { key: "all", label: t.certifications.all },
    { key: "python", label: "Python" },
    { key: "data-engineering", label: "Data Engineering" },
    { key: "ai", label: "AI & Data Science" },
    { key: "cloud", label: "Cloud" },
    { key: "database", label: "Database" },
  ];
}

const CATEGORY_COLORS: Record<Certificate["category"], string> = {
  python: "bg-primary/10 text-primary border-primary/20",
  "data-engineering": "bg-accent/10 text-accent-foreground border-accent/20",
  cloud: "bg-secondary text-secondary-foreground border-secondary/30",
  database: "bg-muted text-muted-foreground border-border",
  ai: "bg-primary/15 text-primary border-primary/30", // FIX: UX-040
};

const CATEGORY_LABELS: Record<Certificate["category"], string> = {
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

function CertCard({ cert, index, t }: { cert: Certificate; index: number; t: TranslationKeys }) {
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

function CertificationsSkeleton() {
  return (
    <section id="certifications" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4 animate-pulse">
            <Award className="h-3.5 w-3.5" />
            Certifications
          </div>
          <div className="h-10 w-56 bg-muted rounded mx-auto mb-3 animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mx-auto mb-8 animate-pulse" />
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-28 bg-muted rounded-full animate-pulse" />
            ))}
          </div>
        </div>
        <div className="relative ml-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-6">
              <div className="flex gap-4 items-start pb-6">
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 glass rounded-xl border p-4 animate-pulse">
                  <div className="h-5 w-3/4 bg-muted rounded mb-2" />
                  <div className="flex gap-2">
                    <div className="h-5 w-20 bg-muted rounded" />
                    <div className="h-5 w-24 bg-muted rounded" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="h-3 w-16 bg-muted rounded" />
                  <div className="h-3 w-12 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function CertificationsSection() {
  const { t, lang } = useLanguage();
  const [active, setActive] = useState("all");
  const { ref, revealed } = useReveal();
  const { data: certsData, isLoading } = useCertifications();
  const FILTERS = getFilters(t);

  if (isLoading) {
    return <CertificationsSkeleton />;
  }

  const allCerts: Certificate[] =
    certsData && certsData.length > 0
      ? [...certsData]
          .sort((a, b) => {
            const aSort = a.date;
            const bSort = b.date;
            return bSort.localeCompare(aSort);
          })
          .map((c, i) => ({
            id: i + 1,
            title: c.title,
            issuer: c.issuer,
            issuerLogo: c.image_url ?? "🎓",
            date: c.date,
            dateSort: c.date,
            category: (VALID_CATEGORIES.has(c.category ?? "")
              ? c.category
              : "python") as Certificate["category"],
            credentialUrl: c.cert_url ?? "#",
          }))
      : CERTIFICATIONS;

  const filtered =
    active === "all" ? allCerts : allCerts.filter((c) => c.category === active);

  const grouped = filtered.reduce<Record<string, Certificate[]>>(
    (acc, cert) => {
      const raw = cert.dateSort;
      const key = /^\d{4}-\d{2}/.test(raw) ? raw.slice(0, 7) : raw;
      if (!acc[key]) acc[key] = [];
      acc[key].push(cert);
      return acc;
    },
    {},
  );

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) =>
    b.localeCompare(a),
  );

  const monthLabel = (key: string) => {
    if (/^\d{4}-\d{2}/.test(key)) {
      const [y, m] = key.split("-");
      const date = new Date(Number(y), Number(m) - 1);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "long", year: "numeric" });
      }
    }
    return key;
  };

  return (
    <section
      id="certifications"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 px-6"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <SectionLabel><Award className="h-3.5 w-3.5" />{t.certifications.title}</SectionLabel> {/* FIX: UX-002 */}
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
            {t.certifications.title}
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto mb-8">
            {allCerts.length} verified certifications from IBM, DataCamp,
            Microsoft, and HackerRank.
          </p>

          <div className="flex flex-wrap gap-2 justify-center">
            {FILTERS.map((f) => {
              const count =
                f.key === "all"
                  ? allCerts.length
                  : allCerts.filter((c) => c.category === f.key).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setActive(f.key)}
                  aria-pressed={active === f.key}
                  data-testid={`cert-filter-${f.key}`}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    active === f.key
                      ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-float)]"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {f.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {allCerts.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No certifications yet"
            description="Certifications will appear here once added."
            compact
          />
        ) : (
        <div className="relative">
          <div
            className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent md:hidden"
            aria-hidden="true"
          />
          <div className="md:grid md:grid-cols-2 md:gap-x-12 md:gap-y-4 section-reveal"> {/* FIX: UX-010, UX-017 */}
            {sortedGroups.map(([monthKey, certs]) => (
              <div key={monthKey} className="mb-4">
                <div className="flex items-center gap-2 mb-3 md:ml-0 ml-12">
                  <span className="text-sm font-bold text-primary uppercase tracking-wide">
                    {monthLabel(monthKey)}
                  </span>
                  <div className="flex-1 h-px bg-primary/15" />
                  <span className="text-[11px] text-muted-foreground bg-primary/8 border border-primary/15 px-2 py-0.5 rounded-full">
                    {certs.length} cert{certs.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {certs.map((cert, i) => (
                  <CertCard key={cert.id} cert={cert} index={i} t={t} />
                ))}
              </div>
            ))}
          </div>
        </div>
        )}

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "DataCamp",
              count: allCerts.filter((c) => c.issuer === "DataCamp").length,
              color: "text-primary",
              bg: "bg-primary/10",
              border: "border-primary/20",
              logo: "🎓",
            },
            {
              label: "IBM",
              count: allCerts.filter((c) => c.issuer === "IBM").length,
              color: "text-accent-foreground",
              bg: "bg-accent/10",
              border: "border-accent/20",
              logo: "🔵",
            },
            {
              label: "Microsoft",
              count: allCerts.filter((c) => c.issuer.startsWith("Microsoft"))
                .length,
              color: "text-secondary-foreground",
              bg: "bg-secondary/10",
              border: "border-secondary/20",
              logo: "🪟",
            },
            {
              label: "HackerRank",
              count: allCerts.filter((c) => c.issuer === "HackerRank").length,
              color: "text-primary",
              bg: "bg-primary/5",
              border: "border-primary/10",
              logo: "💻",
            },
          ].map((org) => (
            <div
              key={org.label}
              className={`glass rounded-xl p-4 border ${org.border} text-center`}
            >
              <div className="text-xl mb-1">{org.logo}</div>
              <div className={`font-display font-bold text-xl ${org.color}`}>
                {org.count}
              </div>
              <div className="text-xs text-muted-foreground">{org.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}