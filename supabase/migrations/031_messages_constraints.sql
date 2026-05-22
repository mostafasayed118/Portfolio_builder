-- Add foreign key constraint for messages table
-- The status column should reference the msg_status enum type

-- First, ensure the enum type exists
DO $$ BEGIN
  CREATE TYPE msg_status AS ENUM ('unread', 'read', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add CHECK constraint to ensure status is valid
ALTER TABLE messages 
ADD CONSTRAINT messages_status_check 
CHECK (status IN ('unread', 'read', 'archived'));

-- Add index for status queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Add index for deleted_at queries (soft-delete)
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add composite index for common queries (status + deleted_at)
CREATE INDEX IF NOT EXISTS idx_messages_status_active ON messages(status, deleted_at) WHERE deleted_at IS NULL;