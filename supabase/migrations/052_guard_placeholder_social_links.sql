-- ============================================================================
-- 052_guard_placeholder_social_links.sql
--
-- One-shot backstop at migration time: fail loudly (and roll back) if any
-- *published* hero_content row or any contact_info row still holds a
-- placeholder social handle — `yourusername`-style starter-template values,
-- the legacy `mustafasayed` / `mustafa-sayed` handles that migration 050
-- rewrote, or `example.com`-style fillers.
--
-- Migrations 050/051 fixed the rows that existed then, but a migration can
-- only repair the patterns it knows about; a fresh seed or manual edit could
-- reintroduce a placeholder that no future migration would think to fix. This
-- guard makes `supabase db push` fail instead of silently deploying broken
-- links, so the regression is caught at apply time.
--
-- The same detection logic lives in lib/db/src/contactFields.ts as the
-- read-time backstop (lib/db normalizes placeholders away on every read).
-- Keep the two pattern sets in sync when extending either side.
--
-- NOTE: legacy handles are matched as exact path segments (github.com/<handle>
-- and linkedin.com/in/<handle>), never as bare substrings, so the canonical
-- `linkedin.com/in/mustafa-sayed11` is not mistaken for `mustafa-sayed`.
-- ============================================================================

DO $$
DECLARE
  v_hero    INTEGER;
  v_contact INTEGER;
BEGIN
  -- Generic starter-template markers (covers yourusername variants,
  -- yourname/yourchannel/yourhandle/yourprofile variants, example.com/.org
  -- and the literal word "placeholder").
  SELECT COUNT(*) INTO v_hero
    FROM public.hero_content
   WHERE is_published
     AND (
       github_url   ~* '(your[-_]?username|your[-_]?name|your[-_]?handle|your[-_]?channel|your[-_]?profile|example\.(com|org)|placeholder)'
       OR github_url ~* 'github\.com/(mustafasayed|mustafa-sayed)(/|$)'
       OR linkedin_url ~* '(your[-_]?username|your[-_]?name|your[-_]?handle|your[-_]?channel|your[-_]?profile|example\.(com|org)|placeholder)'
       OR linkedin_url ~* 'linkedin\.com/in/(mustafasayed|mustafa-sayed)(/|$)'
       OR COALESCE(youtube_url, '')  ~* '(your[-_]?username|your[-_]?name|your[-_]?handle|your[-_]?channel|your[-_]?profile|example\.(com|org)|placeholder)'
       OR COALESCE(facebook_url, '') ~* '(your[-_]?username|your[-_]?name|your[-_]?handle|your[-_]?channel|your[-_]?profile|example\.(com|org)|placeholder)'
     );

  SELECT COUNT(*) INTO v_contact
    FROM public.contact_info
   WHERE
       COALESCE(github, '')   ~* '(your[-_]?username|your[-_]?name|your[-_]?handle|your[-_]?channel|your[-_]?profile|example\.(com|org)|placeholder)'
       OR COALESCE(github, '')   ~* 'github\.com/(mustafasayed|mustafa-sayed)(/|$)'
       OR COALESCE(linkedin, '') ~* '(your[-_]?username|your[-_]?name|your[-_]?handle|your[-_]?channel|your[-_]?profile|example\.(com|org)|placeholder)'
       OR COALESCE(linkedin, '') ~* 'linkedin\.com/in/(mustafasayed|mustafa-sayed)(/|$)'
       OR COALESCE(youtube, '')  ~* '(your[-_]?username|your[-_]?name|your[-_]?handle|your[-_]?channel|your[-_]?profile|example\.(com|org)|placeholder)'
       OR COALESCE(facebook, '') ~* '(your[-_]?username|your[-_]?name|your[-_]?handle|your[-_]?channel|your[-_]?profile|example\.(com|org)|placeholder)';

  IF v_hero > 0 OR v_contact > 0 THEN
    RAISE EXCEPTION
      'Placeholder social handles found: % published hero_content row(s) and % contact_info row(s). '
      'Fix them before applying this migration (see migrations 050/051 and lib/db/src/contactFields.ts).',
      v_hero, v_contact;
  END IF;
END $$;
