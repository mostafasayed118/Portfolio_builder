import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";

/**
 * Tables to subscribe to via Supabase realtime.
 *
 * Reduced from 12 to 3 in 2026-06-01: the 9 dropped tables
 * (about, skills, experience, certifications, contact_info,
 * theme, typography, seo, section_settings) change rarely — once
 * per week at most. Admin users who want fresh data for those
 * sections can click the "Force Refetch All" button in SyncDebug.
 *
 * The 3 kept tables (hero, projects, site_settings) are the ones
 * the admin touches most often when making a quick fix.
 */
const WATCHED_TABLES: { table: string; queryKey: string[] }[] = [
  { table: "hero_content", queryKey: ["hero"] },
  { table: "projects", queryKey: ["projects"] },
  { table: "site_settings", queryKey: ["siteSettings"] },
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
            if (table === "projects") {
              queryClient.invalidateQueries({ queryKey: ["project"] });
            }
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
