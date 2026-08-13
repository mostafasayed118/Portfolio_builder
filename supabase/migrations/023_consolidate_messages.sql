-- Consolidate contact_messages into messages (Safe & Idempotent)

-- 1. Add subject column to messages (Safe if already exists)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS subject TEXT;

-- 2. Migrate contact_messages data into messages ONLY IF the table exists
DO $$
BEGIN
  -- Check if contact_messages table exists in the public schema
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'contact_messages' AND table_schema = 'public'
  ) THEN
    -- Perform the migration
    INSERT INTO messages (name, email, subject, message, status, created_at)
    SELECT 
      cm.name,
      cm.email,
      cm.subject,
      cm.message,
      CASE WHEN cm.is_read THEN 'read'::msg_status ELSE 'unread'::msg_status END,
      cm.created_at
    FROM contact_messages cm
    WHERE NOT EXISTS (
      SELECT 1 FROM messages m
      WHERE m.name = cm.name AND m.email = cm.email AND m.message = cm.message AND m.created_at = cm.created_at
    );
    
    RAISE NOTICE '✅ Successfully migrated data from contact_messages to messages.';
  ELSE
    RAISE NOTICE 'ℹ️ Table contact_messages does not exist. Skipping data migration (already consolidated or never created).';
  END IF;
END $$;

-- 3. Add index on new subject column
CREATE INDEX IF NOT EXISTS idx_messages_subject ON messages(subject);

-- 4. Update RLS for messages table to allow public insert (same as contact_messages had)
DROP POLICY IF EXISTS "public_insert_messages" ON messages;
CREATE POLICY "public_insert_messages" ON messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "admin_select_messages" ON messages;
CREATE POLICY "admin_select_messages" ON messages FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "admin_update_messages" ON messages;
CREATE POLICY "admin_update_messages" ON messages FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "admin_delete_messages" ON messages;
CREATE POLICY "admin_delete_messages" ON messages FOR DELETE USING (is_admin());

-- Note: contact_messages table is kept for backward compatibility (if it exists).
-- New code should use the messages table exclusively.