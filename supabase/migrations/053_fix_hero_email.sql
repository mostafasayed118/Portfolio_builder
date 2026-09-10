-- ============================================================================
-- 053_fix_hero_email.sql
--
-- Migration 001 seeded `admin@example.com` (and `yourusername` social
-- handles) into both hero_content and contact_info. The live hero row still
-- holds that placeholder, so the hero's email icon renders a dead
-- mailto:admin@example.com link. This migration:
--   1. rewrites placeholder emails to the canonical address
--      (mustafasayed20002@gmail.com — the address already live on
--      contact_info),
--   2. sets column defaults so fresh installs can't seed a placeholder, and
--   3. guards (like 052) so a future `supabase db push` fails loudly if any
--      published hero row or contact row still holds a placeholder email.
--
-- The same detection logic lives in lib/db/src/contactFields.ts as the
-- read-time backstop. Keep the two pattern sets in sync.
-- ============================================================================

-- 1. Fix placeholder emails (matches the read-time rule in contactFields.ts:
--    template domains like example.com, or yourname-style local parts).
UPDATE hero_content
SET email = 'mustafasayed20002@gmail.com'
WHERE email ~* '@(example\.(com|org|net)|yourdomain\.(com|org|net)|yourmail\.com|testmail\.com|examplemail\.com)$'
   OR email ~* '^(yourname|your-name|your_name|yourusername|your-username|your_username|name)@';

UPDATE contact_info
SET email = 'mustafasayed20002@gmail.com'
WHERE email ~* '@(example\.(com|org|net)|yourdomain\.(com|org|net)|yourmail\.com|testmail\.com|examplemail\.com)$'
   OR email ~* '^(yourname|your-name|your_name|yourusername|your-username|your_username|name)@';

-- 2. Defaults for fresh installs.
ALTER TABLE hero_content ALTER COLUMN email SET DEFAULT 'mustafasayed20002@gmail.com';
ALTER TABLE contact_info ALTER COLUMN email SET DEFAULT 'mustafasayed20002@gmail.com';

-- 3. Guard: fail loudly if any published hero row or contact row still holds
--    a placeholder email after this migration.
DO $$
DECLARE
  v_hero    INTEGER;
  v_contact INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_hero
    FROM public.hero_content
   WHERE is_published
     AND (
       email ~* '@(example\.(com|org|net)|yourdomain\.(com|org|net)|yourmail\.com|testmail\.com|examplemail\.com)$'
       OR email ~* '^(yourname|your-name|your_name|yourusername|your-username|your_username|name)@'
     );

  SELECT COUNT(*) INTO v_contact
    FROM public.contact_info
   WHERE
       email ~* '@(example\.(com|org|net)|yourdomain\.(com|org|net)|yourmail\.com|testmail\.com|examplemail\.com)$'
       OR email ~* '^(yourname|your-name|your_name|yourusername|your-username|your_username|name)@';

  IF v_hero > 0 OR v_contact > 0 THEN
    RAISE EXCEPTION
      'Placeholder emails found: % published hero_content row(s) and % contact_info row(s). '
      'Fix them before applying this migration (see lib/db/src/contactFields.ts).',
      v_hero, v_contact;
  END IF;
END $$;
