import { useState } from "react";
import { ExternalLink, Award } from "lucide-react";
import { CERTIFICATIONS, type Certificate } from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { listCertifications } from "@workspace/db/certifications";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "python", label: "Python" },
  { key: "data-engineering", label: "Data Engineering" },
  { key: "ai", label: "AI & Data Science" },
  { key: "cloud", label: "Cloud" },
  { key: "database", label: "Database" },
];

const VALID_CATEGORIES = new Set([
  "python",
  "data-engineering",
  "cloud",
  "database",
  "ai",
]);

const CATEGORY_COLORS: Record<Certificate["category"], string> = {
  python: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "data-engineering": "bg-primary/10 text-primary border-primary/20",
  cloud: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  database: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  ai: "bg-violet-500/10 text-violet-500 border-violet-500/20",
};

const CATEGORY_LABELS: Record<Certificate["category"], string> = {
  python: "Python",
  "data-engineering": "Data Engineering",
  cloud: "Cloud",
  database: "Database",
  ai: "AI & Data Science",
};

const ISSUER_COLORS: Record<string, string> = {
  DataCamp: "bg-green-500/10 text-green-600 border-green-500/20",
  IBM: "bg-blue-600/10 text-blue-600 border-blue-600/20",
  "Microsoft DEPI": "bg-sky-500/10 text-sky-500 border-sky-500/20",
  Microsoft: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  HackerRank: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Maharatech: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

function CertCard({ cert, index }: { cert: Certificate; index: number }) {
  const { ref, revealed } = useReveal(0.05);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`group relative section-reveal ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${index * 60}ms` }}
      data-testid={`cert-card-${cert.id}`}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent ml-[18px]"
        aria-hidden
      />

      <div className="flex gap-4 items-start pb-6">
        <div className="relative shrink-0 z-10">
          <div className="h-9 w-9 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center text-base shadow-sm group-hover:border-primary transition-colors">
            {cert.issuerLogo}
          </div>
        </div>

        <div className="flex-1 glass rounded-xl border p-4 hover:border-primary/25 transition-all duration-200 hover:shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-sm text-foreground leading-snug mb-1.5 group-hover:text-primary transition-colors">
                {cert.title}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${ISSUER_COLORS[cert.issuer] ?? "bg-muted text-muted-foreground border-border"}`}
                >
                  {cert.issuerLogo} {cert.issuer}
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
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:opacity-80 transition-opacity"
                aria-label={`View ${cert.title} credential`}
                data-testid={`cert-link-${cert.id}`}
              >
                View <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CertificationsSection() {
  const [active, setActive] = useState("all");
  const { ref, revealed } = useReveal();
  const { data: certsData } = useQuery({
    queryKey: ["certifications"],
    queryFn: () => listCertifications(getSupabase()),
    enabled: isSupabaseConfigured,
  });

  const allCerts: Certificate[] =
    certsData && certsData.length > 0
      ? [...certsData]
          .filter((c) => c.is_published !== false)
          .sort((a, b) => {
            const aSort = a.date_sort ?? a.date;
            const bSort = b.date_sort ?? b.date;
            return bSort.localeCompare(aSort);
          })
          .map((c, i) => ({
            id: i + 1,
            title: c.title,
            issuer: c.issuer,
            issuerLogo: c.issuer_logo ?? "🎓",
            date: c.date,
            dateSort: c.date_sort ?? c.date,
            category: (VALID_CATEGORIES.has(c.category ?? "")
              ? c.category
              : "python") as Certificate["category"],
            credentialUrl: c.credential_url ?? "#",
          }))
      : CERTIFICATIONS;

  const filtered =
    active === "all" ? allCerts : allCerts.filter((c) => c.category === active);

  const grouped = filtered.reduce<Record<string, Certificate[]>>(
    (acc, cert) => {
      const key = cert.dateSort.slice(0, 7);
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
    const [y, m] = key.split("-");
    const date = new Date(Number(y), Number(m) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <section
      id="certifications"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 px-6"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4">
            <Award className="h-3.5 w-3.5" />
            Certifications
          </div>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
            Credentials & Learning
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

        <div
          className={`md:grid md:grid-cols-2 md:gap-x-12 section-reveal ${revealed ? "revealed" : ""}`}
        >
          {sortedGroups.map(([monthKey, certs]) => (
            <div key={monthKey} className="mb-2">
              <div className="flex items-center gap-2 mb-3 ml-12">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">
                  {monthLabel(monthKey)}
                </span>
                <div className="flex-1 h-px bg-primary/15" />
                <span className="text-[11px] text-muted-foreground bg-primary/8 border border-primary/15 px-2 py-0.5 rounded-full">
                  {certs.length} cert{certs.length !== 1 ? "s" : ""}
                </span>
              </div>
              {certs.map((cert, i) => (
                <CertCard key={cert.id} cert={cert} index={i} />
              ))}
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "DataCamp",
              count: allCerts.filter((c) => c.issuer === "DataCamp").length,
              color: "text-green-600",
              bg: "bg-green-500/10",
              border: "border-green-500/20",
              logo: "🎓",
            },
            {
              label: "IBM",
              count: allCerts.filter((c) => c.issuer === "IBM").length,
              color: "text-blue-600",
              bg: "bg-blue-600/10",
              border: "border-blue-600/20",
              logo: "🔵",
            },
            {
              label: "Microsoft",
              count: allCerts.filter((c) => c.issuer.startsWith("Microsoft"))
                .length,
              color: "text-sky-500",
              bg: "bg-sky-500/10",
              border: "border-sky-500/20",
              logo: "🪟",
            },
            {
              label: "HackerRank",
              count: allCerts.filter((c) => c.issuer === "HackerRank").length,
              color: "text-emerald-600",
              bg: "bg-emerald-500/10",
              border: "border-emerald-500/20",
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
