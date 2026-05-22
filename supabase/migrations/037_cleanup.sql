-- 037_cleanup.sql
-- Drop legacy contact_messages table (consolidated into messages in migration 028)

DO $$
DECLARE
  contact_count INTEGER;
  migrated_count INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'contact_messages' AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'contact_messages table does not exist. Nothing to do.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO contact_count FROM contact_messages;

  IF contact_count > 0 THEN
    -- Verify all data exists in messages before dropping
    SELECT COUNT(*) INTO migrated_count
    FROM contact_messages cm
    WHERE EXISTS (
      SELECT 1 FROM messages m
      WHERE m.name = cm.name AND m.email = cm.email AND m.message = cm.message AND m.created_at = cm.created_at
    );

    IF migrated_count < contact_count THEN
      RAISE EXCEPTION 'Aborting: % of % contact_messages rows are missing from messages', contact_count - migrated_count, contact_count;
    END IF;

    RAISE NOTICE 'All % contact_messages rows verified in messages table. Truncating.', contact_count;
  END IF;

  TRUNCATE TABLE contact_messages;
  DROP TABLE IF EXISTS contact_messages;
  RAISE NOTICE 'contact_messages table dropped successfully';
END $$;
