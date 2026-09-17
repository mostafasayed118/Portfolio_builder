import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImageMetadata } from "@workspace/supabase/types";
import { MAX_LIST_ROWS, queryOrThrow } from "./query";

const IMAGE_TABLE = "image_metadata" as const;

/**
 * Lists the image metadata rows attached to an entity (e.g. a project),
 * ordered by sort_order then creation time. `image_metadata` is publicly
 * readable (RLS policy `public_read_image_metadata`), so the portfolio can
 * fetch a project's gallery without any auth. The caller builds public
 * storage URLs from each row's `storage_path`.
 *
 * Capped at MAX_LIST_ROWS (500) so a runaway entity cannot return an
 * unbounded result set.
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
      .order("created_at", { ascending: true })
      .limit(MAX_LIST_ROWS),
    { table: IMAGE_TABLE, operation: "listEntityImages" },
  );
}

/**
 * Fetches the cover image (lowest sort_order) for each entity in one query.
 * Rows are ordered by sort_order then creation time, so the first row seen
 * per entity is its cover. Returns exactly one row per entity, keyed by
 * `entity_id`, for entity types where a card grid needs a single thumbnail
 * (e.g. the portfolio projects section).
 *
 * Capped at MAX_LIST_ROWS (500) so a runaway entity set cannot return an
 * unbounded result set; ordering is preserved so the first row per entity
 * stays deterministic.
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
      .order("created_at", { ascending: true })
      .limit(MAX_LIST_ROWS),
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

export interface ImageOwnershipRow {
  id: string;
  portfolio_id: string | null;
}

/** Admin: ownership pre-check rows for a set of image ids (reorder flow). */
export async function listImageOwnership(
  supabase: SupabaseClient,
  ids: string[],
): Promise<ImageOwnershipRow[]> {
  return queryOrThrow<ImageOwnershipRow[]>(
    supabase.from(IMAGE_TABLE).select("id, portfolio_id").in("id", ids),
    { table: IMAGE_TABLE, operation: "listImageOwnership" },
  );
}

/** Admin: set one image's sort_order (0-based reorder position). */
export async function setImageSortOrder(
  supabase: SupabaseClient,
  id: string,
  sortOrder: number,
): Promise<void> {
  await queryOrThrow(
    supabase.from(IMAGE_TABLE).update({ sort_order: sortOrder }).eq("id", id),
    { table: IMAGE_TABLE, operation: "setImageSortOrder" },
  );
}

export interface ImageMetadataRow {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

/** Admin: the metadata surface exposed by GET /images/:id/metadata. */
export async function getImageMetadataById(
  supabase: SupabaseClient,
  id: string,
): Promise<ImageMetadataRow | null> {
  return queryOrThrow<ImageMetadataRow | null>(
    supabase
      .from(IMAGE_TABLE)
      .select("id, original_filename, mime_type, file_size_bytes, entity_type, entity_id, created_at")
      .eq("id", id)
      .single(),
    { table: IMAGE_TABLE, operation: "getImageMetadataById" },
  );
}

export interface ImageDeleteTarget {
  storage_path: string;
  id: string;
  portfolio_id: string | null;
}

/** Admin: the columns the DELETE flow needs (storage path + ownership). */
export async function getImageDeleteTarget(
  supabase: SupabaseClient,
  id: string,
): Promise<ImageDeleteTarget | null> {
  return queryOrThrow<ImageDeleteTarget | null>(
    supabase.from(IMAGE_TABLE).select("storage_path, id, portfolio_id").eq("id", id).single(),
    { table: IMAGE_TABLE, operation: "getImageDeleteTarget" },
  );
}

/** Admin: remove an image's metadata row after its storage object is gone. */
export async function deleteImageMetadata(supabase: SupabaseClient, id: string): Promise<void> {
  await queryOrThrow(
    supabase.from(IMAGE_TABLE).delete().eq("id", id),
    { table: IMAGE_TABLE, operation: "deleteImageMetadata" },
  );
}
