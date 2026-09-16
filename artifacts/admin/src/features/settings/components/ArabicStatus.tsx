import { useQuery } from "@tanstack/react-query";
import { Check, X, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api-client";

function StatusRow({ label, status }: { label: string; status: "complete" | "partial" | "missing" }) {
  const icon = status === "complete" ? <Check className="h-4 w-4 text-success" />
    : status === "partial" ? <AlertTriangle className="h-4 w-4 text-warning" />
    : <X className="h-4 w-4 text-destructive" />;
  return <div className="flex items-center justify-between text-sm py-1"><span className="text-muted-foreground">{label}</span>{icon}</div>;
}

export function ArabicContentStatus() {
  const { data: stats } = useQuery({
    queryKey: ["arabic-content-status"],
    queryFn: async () => {
      const res = await api.arabicStatus.get();
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
    staleTime: 1000 * 60,
  });

  return (
    <div className="rounded-lg border p-4 space-y-1.5">
      <p className="text-sm font-medium mb-2">Arabic Content Status</p>
      <StatusRow label="Hero" status={stats?.hero ? "complete" : "missing"} />
      <StatusRow label="About" status={stats?.about ? "complete" : "missing"} />
      <StatusRow label={`Projects (${stats?.projects.filled ?? "?"})`} status={stats?.projects && stats.projects.filled > 0 ? "complete" : "missing"} />
      <StatusRow label={`Experience (${stats?.experience.filled ?? "?"})`} status={stats?.experience && stats.experience.filled > 0 ? "complete" : "missing"} />
      <StatusRow label={`Certifications (${stats?.certifications.filled ?? "?"})`} status={stats?.certifications && stats.certifications.filled > 0 ? "complete" : "missing"} />
    </div>
  );
}
