-- ============================================================================
-- 046_blog_posts.sql
--
-- Adds a Markdown-backed blog to the portfolio CMS.
--
-- Public visitors can only SELECT published (non-deleted) posts. Admins
-- (resolved via is_admin(), which reads the users table synced by the API
-- server from Clerk) get full CRUD and can edit drafts/unpublished posts.
-- ============================================================================

-- 1. blog_posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT blog_posts_user_slug_unique UNIQUE (user_id, slug)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_deleted ON blog_posts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_user ON blog_posts(user_id);

-- 3. Auto-update updated_at on row changes
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies
-- Public: read only published posts (not deleted)
DROP POLICY IF EXISTS "public_read_published_blog_posts" ON public.blog_posts;
CREATE POLICY "public_read_published_blog_posts"
  ON public.blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (
    is_published = TRUE
    AND deleted_at IS NULL
  );

-- Admins: full access (realized via service-role key on the API server; this
-- policy also lets authenticated admins manage posts directly from Supabase).
DROP POLICY IF EXISTS "admin_all_blog_posts" ON public.blog_posts;
CREATE POLICY "admin_all_blog_posts"
  ON public.blog_posts
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
