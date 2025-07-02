-- Migration script to upgrade from legacy memory schema to email memory schema
-- Run this in your D1 database console or through Wrangler

-- Step 1: Create new email_memories table
CREATE TABLE IF NOT EXISTS email_memories (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  senderEmail TEXT NOT NULL,
  senderName TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  attachments TEXT,
  dateSent TEXT NOT NULL,
  threadId TEXT,
  conversationId TEXT,
  relatedEmailIds TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sender_email ON email_memories(senderEmail);
CREATE INDEX IF NOT EXISTS idx_thread_id ON email_memories(threadId);
CREATE INDEX IF NOT EXISTS idx_conversation_id ON email_memories(conversationId);
CREATE INDEX IF NOT EXISTS idx_date_sent ON email_memories(dateSent);

-- Step 3: Create email_relationships table
CREATE TABLE IF NOT EXISTS email_relationships (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL,
  related_email_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email_id) REFERENCES email_memories(id),
  FOREIGN KEY (related_email_id) REFERENCES email_memories(id)
);

-- Step 4: Migrate existing memories to email format (if memories table exists)
-- This preserves your existing memories as "notes" in the email system
INSERT INTO email_memories (id, userId, senderEmail, senderName, subject, body, attachments, dateSent, created_at)
SELECT 
  id,
  userId,
  'notes@system.internal' as senderEmail,
  'Legacy Memory' as senderName,
  'Imported Memory' as subject,
  content as body,
  '' as attachments,
  COALESCE(created_at, CURRENT_TIMESTAMP) as dateSent,
  created_at
FROM memories
WHERE NOT EXISTS (SELECT 1 FROM email_memories WHERE email_memories.id = memories.id);

-- Step 5: Optional - Drop old memories table after verification
-- WARNING: Only run this after confirming all data is migrated successfully!
-- DROP TABLE IF EXISTS memories;

-- Verification queries:
-- SELECT COUNT(*) as legacy_count FROM memories;
-- SELECT COUNT(*) as email_count FROM email_memories WHERE senderEmail = 'notes@system.internal';
-- SELECT * FROM email_memories ORDER BY created_at DESC LIMIT 10;