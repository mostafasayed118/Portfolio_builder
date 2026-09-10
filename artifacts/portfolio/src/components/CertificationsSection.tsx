import { useState } from "react";
import { useLanguage } from "@/lib/language";
import { Award, ScrollText } from "lucide-react";
import EmptyState from "./EmptyState";
import SectionHeader from "./SectionHeader";
import { CertCard } from "./CertCard";
import CertFilters, { getFilters } from "./CertFilters";
import CertStats from "./CertStats";
import { CERTIFICATIONS, type Certificate } from "@/data/portfolio";
import { useCertifications } from "@/hooks/use-portfolio-data";

const VALID_CATEGORIES = new Set([
  "python",
  "data-engineering",
  "cloud",
  "database",
  "ai",
]);

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
        <div className="relative ms-2">
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
  const { data: certsData, isLoading } = useCertifications();
  const FILTERS = getFilters(t);

  if (isLoading) {
    return <CertificationsSkeleton />;
  }

  const allCerts: Certificate[] =
    certsData && certsData.length > 0
      ? [...certsData]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((c, i) => ({
            id: i + 1,
            title: c.title,
            issuer: c.issuer,
            issuerLogo: c.image_url ?? "\uD83C\uDF93",
            date: c.date,
            dateSort: c.date,
            category: (VALID_CATEGORIES.has(c.category ?? "")
              ? c.category
              : "other") as Certificate["category"],
            credentialUrl: c.cert_url ?? "",
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
      className="py-24 px-6"
    >
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          label={<><Award className="h-3.5 w-3.5" />{t.certifications.title}</>}
          title={t.certifications.title}
          description={`${allCerts.length} verified certifications from IBM, DataCamp, Microsoft, and HackerRank.`}
          descriptionClassName="mb-8"
        >
          <CertFilters
            filters={FILTERS}
            active={active}
            onFilterChange={setActive}
            counts={Object.fromEntries(
              FILTERS.map((f) => [
                f.key,
                f.key === "all"
                  ? allCerts.length
                  : allCerts.filter((c) => c.category === f.key).length,
              ]),
            )}
          />
        </SectionHeader>

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
            className="absolute start-4 top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent md:hidden"
            aria-hidden="true"
          />
          <div className="md:grid md:grid-cols-2 md:gap-x-12 md:gap-y-4">
            {sortedGroups.map(([monthKey, certs]) => (
              <div key={monthKey} className="mb-4">
                <div className="flex items-center gap-2 mb-3 md:ms-0 ms-12">
                  <span className="text-sm font-bold text-primary uppercase tracking-wide">
                    {monthLabel(monthKey)}
                  </span>
                  <div className="flex-1 h-px bg-primary/15" />
                  <span className="text-[11px] text-muted-foreground bg-primary/8 border border-primary/15 px-2 py-0.5 rounded-full">
                    {certs.length} cert{certs.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {certs.map((cert) => (
                  <CertCard key={cert.id} cert={cert} t={t} />
                ))}
              </div>
            ))}
          </div>
        </div>
        )}

        <CertStats allCerts={allCerts} />
      </div>
    </section>
  );
}
