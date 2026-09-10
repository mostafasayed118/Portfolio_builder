-- 047_image_metadata_user_id.sql
-- Adds user_id ownership to image_metadata for per-user delete scoping
-- (Task 4 post-audit batch fix). Additive only: existing rows keep
-- user_id NULL and are fail-closed to non-superadmin deletes at the app
-- layer. Public gallery reads are untouched (RLS policies unchanged).

ALTER TABLE image_metadata ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_image_metadata_user ON image_metadata(user_id);
