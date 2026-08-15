import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImageMetadata } from "@workspace/supabase/types";
import { queryOrThrow } from "./query";

const IMAGE_TABLE = "image_metadata" as const;

/**
 * Lists the image metadata rows attached to an entity (e.g. a project),
 * ordered by sort_order then creation time. `image_metadata` is publicly
 * readable (RLS policy `public_read_image_metadata`), so the portfolio can
 * fetch a project's gallery without any auth. The caller builds public
 * storage URLs from each row's `storage_path`.
 */
export async function listEntityImages(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
): Promise<ImageMetadata[]> {
  return queryOrThrow<ImageMetadata[]>(
    supabase
      .from(IMAGE_TABLE)
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    { table: IMAGE_TABLE, operation: "listEntityImages" },
  );
}
