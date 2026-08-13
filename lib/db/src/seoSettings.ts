import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeoSettings, InsertSeoSettings } from "@workspace/supabase/types";
import { queryOrThrow } from "./query";

const TABLE = "seo_settings" as const;

export async function getSeoSettings(
  supabase: SupabaseClient,
): Promise<SeoSettings | null> {
  return queryOrThrow(
    supabase.from(TABLE).select("*").limit(1).maybeSingle(),
    { table: TABLE, operation: "getSeoSettings" },
  );
}

export async function upsertSeoSettings(
  supabase: SupabaseClient,
  args: Omit<Partial<InsertSeoSettings>, 'id' | 'created_at'>,
): Promise<string> {
  const existing = await getSeoSettings(supabase);
  const now = new Date().toISOString();
  if (existing) {
    await queryOrThrow(
      supabase.from(TABLE).update({ ...args, updated_at: now }).eq("id", existing.id),
      { table: TABLE, operation: "upsertSeoSettings.update" },
    );
    return existing.id;
  }
  const data = await queryOrThrow<{ id: string }>(
    supabase.from(TABLE).insert({
      title: args.title ?? "Mustafa Sayed — Data Engineer",
      description: args.description ?? "Data Engineer specializing in ETL pipelines, data warehouses, and BI dashboards. Based in Cairo, Egypt.",
      keywords: args.keywords ?? "data engineer, ETL, Apache Spark, Kafka, Snowflake, BigQuery, Python, SQL",
      og_title: args.og_title ?? "Mustafa Sayed — Data Engineer",
      og_description: args.og_description ?? "Building scalable data pipelines and transforming raw data into actionable insights.",
      canonical_url: args.canonical_url ?? "https://mustafasayed.replit.app",
      twitter_card: args.twitter_card ?? "summary_large_image",
      twitter_creator: args.twitter_creator ?? null,
      updated_at: now,
    }).select("id").single(),
    { table: TABLE, operation: "upsertSeoSettings.insert" },
  );
  return data.id;
}
