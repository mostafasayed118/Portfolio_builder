-- AI spam scoring: quarantine (never delete) likely-spam contact messages.
-- No enum change (avoids the ALTER TYPE … ADD VALUE transaction hazard with
-- existing CHECK constraints). The AI classifier sets is_spam=true when the
-- score meets AI_SPAM_THRESHOLD.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS spam_score INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS spam_reason TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_spam BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_messages_is_spam ON messages(is_spam) WHERE is_spam = true;
