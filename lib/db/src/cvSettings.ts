import type { SupabaseClient } from "@supabase/supabase-js";
import type { CvSettings } from "@workspace/supabase/types";
import { queryOrThrow } from "./query";

export async function getLatestCvSettings(
  supabase: SupabaseClient,
): Promise<CvSettings | null> {
  return queryOrThrow(
    supabase.from("cv_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    { table: "cv_settings", operation: "getLatestCvSettings" },
  );
}

export async function upsertCvSettings(
  supabase: SupabaseClient,
  args: { object_path: string; file_name: string },
): Promise<string> {
  const existing = await getLatestCvSettings(supabase);
  const now = new Date().toISOString();
  if (existing) {
    await queryOrThrow(
      supabase.from("cv_settings").update({ object_path: args.object_path, file_name: args.file_name, updated_at: now }).eq("id", existing.id),
      { table: "cv_settings", operation: "upsertCvSettings.update" },
    );
    return existing.id;
  }
  const data = await queryOrThrow<{ id: string }>(
    supabase.from("cv_settings").insert({ object_path: args.object_path, file_name: args.file_name, updated_at: now }).select("id").single(),
    { table: "cv_settings", operation: "upsertCvSettings.insert" },
  );
  return data.id;
}
