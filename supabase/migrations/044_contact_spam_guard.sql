-- ============================================================================
-- 044_contact_spam_guard.sql
--
-- DB-level backstop for the contact form. The Express API already applies
-- honeypot + time-trap + IP rate limiting, but the `messages` table must
-- stay insertable by anon users (public contact form, no auth), which means
-- a spammer can bypass the API and insert rows directly with the anon key.
-- This trigger caps how many NEW messages one email address can create
-- within an hour — a loose cap that never affects legit visitors but stops
-- bulk junk from flooding the inbox.
-- ============================================================================

CREATE OR REPLACE FUNCTION reject_messages_spam()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM messages
  WHERE email = NEW.email
    AND created_at > NOW() - INTERVAL '1 hour'
    AND deleted_at IS NULL;

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many messages from this email';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_spam_guard ON messages;
CREATE TRIGGER trg_messages_spam_guard
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION reject_messages_spam();