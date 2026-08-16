-- ============================================================================
-- 054_reject_placeholder_contact_fields.sql
--
-- Write-time backstop: BEFORE INSERT OR UPDATE triggers on hero_content and
-- contact_info that reject placeholder social handles and emails outright,
-- so placeholder values cannot be saved by ANY write path (admin UI, seed
-- route, SQL editor, direct client) — not merely caught later by the
-- migration-time guards (052/053) or normalized away on read
-- (lib/db/src/contactFields.ts).
--
-- The pattern sets below mirror the read-time and migration-time guards;
-- keep all three in sync when extending either side.
-- ============================================================================

-- 1. hero_content trigger function
CREATE OR REPLACE FUNCTION public.reject_placeholder_hero_contact_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_social      TEXT := '(your[-_]?username|your[-_]?name|your[-_]?handle|your[-_]?channel|your[-_]?profile|example\.(com|org)|placeholder)';
  v_github      TEXT := 'github\.com/(mustafasayed|mustafa-sayed)(/|$)';
  v_linkedin    TEXT := 'linkedin\.com/in/(mustafasayed|mustafa-sayed)(/|$)';
  v_email_dom   TEXT := '@(example\.(com|org|net)|yourdomain\.(com|org|net)|yourmail\.com|testmail\.com|examplemail\.com)$';
  v_email_local TEXT := '^(yourname|your-name|your_name|yourusername|your-username|your_username|name)@';
BEGIN
  IF NEW.github_url ~* v_social OR NEW.github_url ~* v_github THEN
    RAISE EXCEPTION 'Placeholder social URL rejected on hero_content.github_url: %', NEW.github_url;
  END IF;
  IF NEW.linkedin_url ~* v_social OR NEW.linkedin_url ~* v_linkedin THEN
    RAISE EXCEPTION 'Placeholder social URL rejected on hero_content.linkedin_url: %', NEW.linkedin_url;
  END IF;
  IF NEW.youtube_url ~* v_social THEN
    RAISE EXCEPTION 'Placeholder social URL rejected on hero_content.youtube_url: %', NEW.youtube_url;
  END IF;
  IF NEW.facebook_url ~* v_social THEN
    RAISE EXCEPTION 'Placeholder social URL rejected on hero_content.facebook_url: %', NEW.facebook_url;
  END IF;
  IF NEW.email ~* v_email_dom OR NEW.email ~* v_email_local THEN
    RAISE EXCEPTION 'Placeholder email rejected on hero_content.email: %', NEW.email;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reject_placeholder_contact_fields ON public.hero_content;
CREATE TRIGGER reject_placeholder_contact_fields
  BEFORE INSERT OR UPDATE ON public.hero_content
  FOR EACH ROW EXECUTE FUNCTION public.reject_placeholder_hero_contact_fields();

-- 2. contact_info trigger function
CREATE OR REPLACE FUNCTION public.reject_placeholder_contact_info_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_social      TEXT := '(your[-_]?username|your[-_]?name|your[-_]?handle|your[-_]?channel|your[-_]?profile|example\.(com|org)|placeholder)';
  v_github      TEXT := 'github\.com/(mustafasayed|mustafa-sayed)(/|$)';
  v_linkedin    TEXT := 'linkedin\.com/in/(mustafasayed|mustafa-sayed)(/|$)';
  v_email_dom   TEXT := '@(example\.(com|org|net)|yourdomain\.(com|org|net)|yourmail\.com|testmail\.com|examplemail\.com)$';
  v_email_local TEXT := '^(yourname|your-name|your_name|yourusername|your-username|your_username|name)@';
BEGIN
  IF NEW.github ~* v_social OR NEW.github ~* v_github THEN
    RAISE EXCEPTION 'Placeholder social URL rejected on contact_info.github: %', NEW.github;
  END IF;
  IF NEW.linkedin ~* v_social OR NEW.linkedin ~* v_linkedin THEN
    RAISE EXCEPTION 'Placeholder social URL rejected on contact_info.linkedin: %', NEW.linkedin;
  END IF;
  IF NEW.youtube ~* v_social THEN
    RAISE EXCEPTION 'Placeholder social URL rejected on contact_info.youtube: %', NEW.youtube;
  END IF;
  IF NEW.facebook ~* v_social THEN
    RAISE EXCEPTION 'Placeholder social URL rejected on contact_info.facebook: %', NEW.facebook;
  END IF;
  IF NEW.email ~* v_email_dom OR NEW.email ~* v_email_local THEN
    RAISE EXCEPTION 'Placeholder email rejected on contact_info.email: %', NEW.email;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reject_placeholder_contact_fields ON public.contact_info;
CREATE TRIGGER reject_placeholder_contact_fields
  BEFORE INSERT OR UPDATE ON public.contact_info
  FOR EACH ROW EXECUTE FUNCTION public.reject_placeholder_contact_info_fields();
