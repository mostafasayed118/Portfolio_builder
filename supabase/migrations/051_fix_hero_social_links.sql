-- ============================================================================
-- 051_fix_hero_social_links.sql
--
-- Migration 050 corrected GitHub/LinkedIn handles on rows holding the *old*
-- placeholder values (mustafasayed / mustafa-sayed), but the live hero row
-- was seeded with `yourusername` placeholders that never matched those WHERE
-- clauses. This targets the published hero row directly by id, sets the real
-- GitHub/LinkedIn URLs, and stores the YouTube/Facebook URLs so the database
-- (not just the frontend code fallbacks) is the source of truth.
-- ============================================================================

-- 1. Fix the hero row's placeholder handles and persist YouTube/Facebook.
UPDATE hero_content
SET github_url   = 'https://github.com/mostafasayed118',
    linkedin_url = 'https://www.linkedin.com/in/mustafa-sayed11',
    youtube_url  = 'https://www.youtube.com/@MustafaSayed273',
    facebook_url = 'https://www.facebook.com/mustafa.sayed.91259'
WHERE id = 'e03ae434-dca4-48b2-a253-1e5a75ba9c87';

-- 2. Persist the same YouTube/Facebook URLs on the contact row so the admin
--    UI and the DB both carry them (the deployed code already falls back to
--    these values when the columns are NULL).
UPDATE contact_info
SET youtube  = 'https://www.youtube.com/@MustafaSayed273',
    facebook = 'https://www.facebook.com/mustafa.sayed.91259'
WHERE id = '06ad01bc-78d8-438b-8430-151ddfc4508f';
