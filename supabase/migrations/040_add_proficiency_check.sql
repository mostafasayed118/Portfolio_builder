-- Migration 040 — Defense-in-depth CHECK constraints (Safe & Idempotent)
-- --------------------------------------------------------------
-- This migration adds DB-level constraints that the app layer
-- already enforces in form validation. They exist so a future
-- contributor who writes directly to the DB cannot store out-of-range
-- values.

-- ---------------------------------------------------------------------------
-- skills.proficiency must be 0..100
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Check if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skills' AND column_name = 'proficiency'
  ) THEN
    -- Check for invalid data
    IF EXISTS (
      SELECT 1 FROM skills
      WHERE proficiency < 0 OR proficiency > 100
      LIMIT 1
    ) THEN
      RAISE EXCEPTION 'skills.proficiency has out-of-range values; backfill before adding the CHECK';
    END IF;
    
    -- Add constraint if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'chk_skills_proficiency_range'
    ) THEN
      ALTER TABLE skills
        ADD CONSTRAINT chk_skills_proficiency_range
        CHECK (proficiency BETWEEN 0 AND 100);
      RAISE NOTICE '✅ Added chk_skills_proficiency_range';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ Column skills.proficiency does not exist, skipping';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- sort_order columns must be non-negative integers (only where column exists)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  bad_count int;
  has_column boolean;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'projects', 'skills', 'experience', 'certifications',
      'section_settings', 'contact_info'
    ])
  LOOP
    -- Check if sort_order column exists in this table
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = t AND column_name = 'sort_order'
    ) INTO has_column;
    
    IF has_column THEN
      -- Check for negative values
      EXECUTE format(
        'SELECT count(*) FROM %I WHERE sort_order IS NOT NULL AND sort_order < 0',
        t
      ) INTO bad_count;
      
      IF bad_count > 0 THEN
        RAISE EXCEPTION '%.sort_order has % negative values; backfill before adding the CHECK', t, bad_count;
      END IF;
      
      -- Add constraint if not exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_' || t || '_sort_order_nonneg'
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I ADD CONSTRAINT chk_%s_sort_order_nonneg CHECK (sort_order IS NULL OR sort_order >= 0)',
          t, t
        );
        RAISE NOTICE '✅ Added chk_%_sort_order_nonneg', t;
      END IF;
    ELSE
      RAISE NOTICE 'ℹ️ Table %.sort_order does not exist, skipping', t;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- email fields must look like an email (only where column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- site_settings.email
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_settings' AND column_name = 'email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_site_settings_email'
  ) THEN
    ALTER TABLE site_settings
      ADD CONSTRAINT chk_site_settings_email
      CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    RAISE NOTICE '✅ Added chk_site_settings_email';
  END IF;
  
  -- contact_info.email
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contact_info' AND column_name = 'email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_contact_info_email'
  ) THEN
    ALTER TABLE contact_info
      ADD CONSTRAINT chk_contact_info_email
      CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    RAISE NOTICE '✅ Added chk_contact_info_email';
  END IF;
  
  -- hero_content.email
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hero_content' AND column_name = 'email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_hero_content_email'
  ) THEN
    ALTER TABLE hero_content
      ADD CONSTRAINT chk_hero_content_email
      CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    RAISE NOTICE '✅ Added chk_hero_content_email';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- image_metadata: file size must be positive and under 50MB
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'image_metadata' AND column_name = 'file_size_bytes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_image_metadata_size'
  ) THEN
    ALTER TABLE image_metadata
      ADD CONSTRAINT chk_image_metadata_size
      CHECK (
        file_size_bytes IS NULL
        OR (file_size_bytes > 0 AND file_size_bytes < 52428800)
      );
    RAISE NOTICE '✅ Added chk_image_metadata_size';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- messages: enforce reasonable length limits
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- name length
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_messages_lengths'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT chk_messages_lengths
      CHECK (name IS NULL OR length(name) <= 200);
    RAISE NOTICE '✅ Added chk_messages_lengths';
  END IF;
  
  -- email length
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_messages_email_len'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT chk_messages_email_len
      CHECK (email IS NULL OR length(email) <= 320);
    RAISE NOTICE '✅ Added chk_messages_email_len';
  END IF;
  
  -- message length
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'message'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_messages_msg_len'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT chk_messages_msg_len
      CHECK (message IS NULL OR length(message) <= 10000);
    RAISE NOTICE '✅ Added chk_messages_msg_len';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Verification: List all CHECK constraints added
-- ---------------------------------------------------------------------------
SELECT 
    tc.constraint_name,
    tc.table_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.constraint_name LIKE 'chk_%'
ORDER BY tc.table_name, tc.constraint_name;