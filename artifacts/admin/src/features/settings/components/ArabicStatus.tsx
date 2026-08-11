import { useQuery } from "@tanstack/react-query";
import { Check, X, AlertTriangle } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

function StatusRow({ label, status }: { label: string; status: "complete" | "partial" | "missing" }) {
  const icon = status === "complete" ? <Check className="h-4 w-4 text-green-500" />
    : status === "partial" ? <AlertTriangle className="h-4 w-4 text-yellow-500" />
    : <X className="h-4 w-4 text-red-500" />;
  return <div className="flex items-center justify-between text-sm py-1"><span className="text-muted-foreground">{label}</span>{icon}</div>;
}

export function ArabicContentStatus() {
  const { data: stats } = useQuery({
    queryKey: ["arabic-content-status"],
    queryFn: async () => {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      const [heroRes, aboutRes, projectsRes, experienceRes, certsRes] = await Promise.all([
        supabase.from("hero_content").select("name_ar").not("name_ar", "is", null).maybeSingle(),
        supabase.from("about_content").select("bio_ar").not("bio_ar", "is", null).maybeSingle(),
        supabase.from("projects").select("id, title_ar").not("title_ar", "is", null),
        supabase.from("experience").select("id, title_ar").not("title_ar", "is", null),
        supabase.from("certifications").select("id, title_ar").not("title_ar", "is", null),
      ]);
      return { hero: !!heroRes.data, about: !!aboutRes.data, projects: { filled: projectsRes.data?.length ?? 0 }, experience: { filled: experienceRes.data?.length ?? 0 }, certifications: { filled: certsRes.data?.length ?? 0 } };
    },
    enabled: isSupabaseConfigured,
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
