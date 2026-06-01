import type { Certificate } from "@/data/portfolio";

const ISSUER_STATS = [
  {
    label: "DataCamp",
    match: (c: Certificate) => c.issuer === "DataCamp",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    logo: "\uD83C\uDF93",
  },
  {
    label: "IBM",
    match: (c: Certificate) => c.issuer === "IBM",
    color: "text-accent-foreground",
    bg: "bg-accent/10",
    border: "border-accent/20",
    logo: "\uD83D\uDD35",
  },
  {
    label: "Microsoft",
    match: (c: Certificate) => c.issuer.startsWith("Microsoft"),
    color: "text-secondary-foreground",
    bg: "bg-secondary/10",
    border: "border-secondary/20",
    logo: "\uD83E\uDDF2",
  },
  {
    label: "HackerRank",
    match: (c: Certificate) => c.issuer === "HackerRank",
    color: "text-primary",
    bg: "bg-primary/5",
    border: "border-primary/10",
    logo: "\uD83D\uDCBB",
  },
] as const;

export default function CertStats({
  allCerts,
}: {
  allCerts: Certificate[];
}) {
  return (
    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
      {ISSUER_STATS.map((org) => (
        <div
          key={org.label}
          className={`glass rounded-xl p-4 border ${org.border} text-center`}
        >
          <div className="text-xl mb-1">{org.logo}</div>
          <div className={`font-display font-bold text-xl ${org.color}`}>
            {allCerts.filter(org.match).length}
          </div>
          <div className="text-xs text-muted-foreground">{org.label}</div>
        </div>
      ))}
    </div>
  );
}
