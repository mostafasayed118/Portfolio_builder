-- Migration 041 — content_snapshots version uniqueness
-- --------------------------------------------------------------
-- The previous schema allowed two snapshots of the same entity to
-- share a version number (the default of 1 was applied in two
-- concurrent inserts). This migration adds a UNIQUE constraint
-- on (entity_type, entity_id, version) so duplicates cannot
-- accumulate. If your dev DB already has duplicates, this
-- migration will fail — backfill first (e.g. bump duplicates'
-- version by 1) before re-running.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM content_snapshots a
    JOIN content_snapshots b
      ON a.entity_type = b.entity_type
     AND a.entity_id = b.entity_id
     AND a.version = b.version
     AND a.id <> b.id
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'content_snapshots has duplicate (entity_type, entity_id, version) tuples; dedupe before adding UNIQUE';
  END IF;
END $$;

-- Idempotent: drop the constraint first if it already exists (e.g. from
-- a run under the pre-renumbering file names).
ALTER TABLE content_snapshots
  DROP CONSTRAINT IF EXISTS uq_content_snapshots_entity_version;

ALTER TABLE content_snapshots
  ADD CONSTRAINT uq_content_snapshots_entity_version
  UNIQUE (entity_type, entity_id, version);

-- ---------------------------------------------------------------------------
-- content_snapshots entity_id must be non-empty
-- ---------------------------------------------------------------------------
ALTER TABLE content_snapshots
  DROP CONSTRAINT IF EXISTS chk_content_snapshots_entity_id_nonempty;

ALTER TABLE content_snapshots
  ADD CONSTRAINT chk_content_snapshots_entity_id_nonempty
  CHECK (entity_id IS NOT NULL AND length(entity_id) > 0);
