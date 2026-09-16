-- ============================================================================
-- 062_drop_image_metadata_public_read.sql
--
-- Removes the public (anon/authenticated) SELECT policies on image_metadata
-- and image_variants, originally created by 017 (and recreated identically
-- by 024 and 042). Unauthenticated anon reads of the image inventory are
-- not needed: nothing in the portfolio reads these tables directly —
-- image listing flows through /api/v1/admin/images, which uses the
-- service-role key and therefore bypasses RLS entirely. The admin-only
-- write policies ("admin_all_image_metadata" / "admin_all_image_variants")
-- and the storage.objects policies (037) are intentionally kept.
--
-- Idempotent: IF EXISTS; safe to re-run.
-- ============================================================================

DROP POLICY IF EXISTS "public_read_image_metadata" ON image_metadata;
DROP POLICY IF EXISTS "public_read_image_variants" ON image_variants;
