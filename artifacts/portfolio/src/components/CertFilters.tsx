import type { TranslationKeys } from "@/i18n";

interface FilterDef {
  key: string;
  label: string;
}

export function getFilters(t: TranslationKeys): FilterDef[] {
  return [
    { key: "all", label: t.certifications.all },
    { key: "python", label: "Python" },
    { key: "data-engineering", label: "Data Engineering" },
    { key: "ai", label: "AI & Data Science" },
    { key: "cloud", label: "Cloud" },
    { key: "database", label: "Database" },
  ];
}

interface CertFiltersProps {
  filters: FilterDef[];
  active: string;
  onFilterChange: (key: string) => void;
  counts: Record<string, number>;
}

export default function CertFilters({
  filters,
  active,
  onFilterChange,
  counts,
}: CertFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onFilterChange(f.key)}
          aria-pressed={active === f.key}
          data-testid={`cert-filter-${f.key}`}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            active === f.key
              ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-float)]"
              : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {f.label} ({counts[f.key] ?? 0})
        </button>
      ))}
    </div>
  );
}
