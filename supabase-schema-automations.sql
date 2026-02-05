-- ============================================
-- SOCIAL CRM - Schema Updates for Automations & Messaging
-- ============================================

-- 1. ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'image', 'audio', 'video', 'file', 'template', 'internal_note');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. MESSAGES TABLE UPDATES
-- ============================================

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS status message_status DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS type message_type DEFAULT 'text';

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- 3. CONVERSATIONS TABLE UPDATES
-- ============================================

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- 4. AUTOMATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- e.g., 'new_message', 'tag_added'
  flow_graph JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automations_workspace ON automations(workspace_id);

-- RLS
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view automations in their workspaces" ON automations
  FOR SELECT USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Admins and Agents can manage automations" ON automations
  FOR ALL USING (
    get_user_role_in_workspace(workspace_id) IN ('admin', 'agent')
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_automations_updated_at ON automations;
CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. REALTIME
-- ============================================
-- Add automations to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE automations;
