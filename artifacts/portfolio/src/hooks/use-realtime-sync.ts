import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";

const WATCHED_TABLES: { table: string; queryKey: string[] }[] = [
  { table: "hero_content", queryKey: ["hero"] },
  { table: "about_content", queryKey: ["about"] },
  { table: "skills", queryKey: ["skills"] },
  { table: "projects", queryKey: ["projects"] },
  { table: "experience", queryKey: ["experience"] },
  { table: "certifications", queryKey: ["certifications"] },
  { table: "contact_info", queryKey: ["contactInfo"] },
  { table: "theme_settings", queryKey: ["theme"] },
  { table: "typography_settings", queryKey: ["typography"] },
  { table: "site_settings", queryKey: ["siteSettings"] },
  { table: "seo_settings", queryKey: ["seo"] },
  { table: "section_settings", queryKey: ["sections"] },
];

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const channels = WATCHED_TABLES.map(({ table, queryKey }) => {
      return supabase
        .channel(`portfolio:${table}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
          },
          () => {
            queryClient.invalidateQueries({ queryKey });
          }
        )
        .subscribe();
    });

    return () => {
      for (const channel of channels) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);
}
