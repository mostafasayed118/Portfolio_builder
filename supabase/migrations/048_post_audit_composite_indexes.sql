-- 048: Post-audit composite indexes for hot public list queries.
--
-- Every portfolio list query filters `WHERE is_published = true
-- AND deleted_at IS NULL ORDER BY sort_order` (or the skills
-- `is_visible` variant). Pre-existing indexes cover each predicate
-- column separately; these composite partial indexes let Postgres
-- satisfy filter + order from one index instead of a sort node.
--
-- RLS note: public_read_* SELECT policies were already tightened to
-- published/alive predicates in 025 + 042 (collections) and 046
-- (blog_posts). Remaining USING(true) policies are singleton config
-- tables without publish columns and image galleries (intentional).
--
-- Idempotent: IF NOT EXISTS everywhere; safe to re-run.

CREATE INDEX IF NOT EXISTS idx_projects_pub_sort_alive
  ON projects (is_published, sort_order) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_experience_pub_sort_alive
  ON experience (is_published, sort_order) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_certifications_pub_sort_alive
  ON certifications (is_published, sort_order) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_skills_vis_sort_alive
  ON skills (is_visible, sort_order) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_blog_posts_pub_alive
  ON blog_posts (is_published, published_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON users (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_status_alive_created
  ON messages (status, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_user_status_alive
  ON messages (user_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_image_entity_sort
  ON image_metadata (entity_type, entity_id, sort_order, created_at);
