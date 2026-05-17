-- Consolidate contact_messages into messages (two tables serving the same purpose)

-- 1. Add subject column to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS subject TEXT;

-- 2. Migrate contact_messages data into messages
INSERT INTO messages (name, email, subject, message, status, created_at)
SELECT
  cm.name,
  cm.email,
  cm.subject,
  cm.message,
  CASE WHEN cm.is_read THEN 'read' ELSE 'unread' END,
  cm.created_at
FROM contact_messages cm
WHERE NOT EXISTS (
  SELECT 1 FROM messages m
  WHERE m.name = cm.name AND m.email = cm.email AND m.message = cm.message AND m.created_at = cm.created_at
);

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

-- Note: contact_messages table is kept for backward compatibility.
-- New code should use the messages table exclusively.
-- contact_messages can be dropped in a future cleanup migration once all apps are updated.
