import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeoSettings, InsertSeoSettings } from "@workspace/supabase/types";

export async function getSeoSettings(
  supabase: SupabaseClient,
): Promise<SeoSettings | null> {
  const { data, error } = await supabase
    .from("seo_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertSeoSettings(
  supabase: SupabaseClient,
  args: Omit<Partial<InsertSeoSettings>, 'id' | 'created_at'>,
): Promise<string> {
  const existing = await getSeoSettings(supabase);
  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from("seo_settings")
      .update({ ...args, updated_at: now })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase
    .from("seo_settings")
    .insert({
      title: args.title ?? "Mustafa Sayed — Data Engineer",
      description:
        args.description ??
        "Data Engineer specializing in ETL pipelines, data warehouses, and BI dashboards. Based in Cairo, Egypt.",
      keywords:
        args.keywords ??
        "data engineer, ETL, Apache Spark, Kafka, Snowflake, BigQuery, Python, SQL",
      og_title: args.og_title ?? "Mustafa Sayed — Data Engineer",
      og_description:
        args.og_description ??
        "Building scalable data pipelines and transforming raw data into actionable insights.",
      canonical_url: args.canonical_url ?? "https://mustafasayed.replit.app",
      twitter_card: args.twitter_card ?? "summary_large_image",
      twitter_creator: args.twitter_creator ?? null,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
