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

/**
 * Fetches the cover image (lowest sort_order) for each entity in one query.
 * Rows are ordered by sort_order then creation time, so the first row seen
 * per entity is its cover. Returns exactly one row per entity, keyed by
 * `entity_id`, for entity types where a card grid needs a single thumbnail
 * (e.g. the portfolio projects section).
 */
export async function listCoversByEntity(
  supabase: SupabaseClient,
  entityType: string,
  entityIds: string[],
): Promise<ImageMetadata[]> {
  if (entityIds.length === 0) return [];
  const rows = await queryOrThrow<ImageMetadata[]>(
    supabase
      .from(IMAGE_TABLE)
      .select("*")
      .eq("entity_type", entityType)
      .in("entity_id", entityIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    { table: IMAGE_TABLE, operation: "listCoversByEntity" },
  );
  const seen = new Set<string>();
  const covers: ImageMetadata[] = [];
  for (const row of rows) {
    if (row.entity_id && !seen.has(row.entity_id)) {
      seen.add(row.entity_id);
      covers.push(row);
    }
  }
  return covers;
}
