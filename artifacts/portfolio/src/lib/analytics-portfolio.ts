import { getSupabase } from "@workspace/supabase/client";

let cached: Promise<string | null> | null = null;

export function resolveDefaultPortfolioId(): Promise<string | null> {
  if (cached) return cached;
  cached = (async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("public_portfolios")
        .select("id")
        .eq("is_published", true)
        .order("slug", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error !== null || data === null) return null;
      return typeof data.id === "string" ? data.id : null;
    } catch {
      return null;
    }
  })();
  return cached;
}
