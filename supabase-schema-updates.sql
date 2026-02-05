-- ============================================
-- SOCIAL CRM - Schema Updates v1.1
-- ============================================
-- Ejecutar DESPUÉS del schema inicial
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TABLA AUDIT_LOG (Nueva)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_workspace ON audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- RLS para audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs in their workspaces" ON audit_log
  FOR SELECT USING (
    get_user_role_in_workspace(workspace_id) = 'admin'
  );

CREATE POLICY "Service role can insert audit logs" ON audit_log
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 2. EMAIL THREADING - Conversaciones
-- ============================================

-- Añadir columnas de email threading a conversations
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS email_subject TEXT,
  ADD COLUMN IF NOT EXISTS email_thread_id TEXT;

-- Índice para buscar por thread_id
CREATE INDEX IF NOT EXISTS idx_conversations_email_thread 
  ON conversations(workspace_id, email_thread_id) 
  WHERE email_thread_id IS NOT NULL;

-- ============================================
-- 3. EMAIL THREADING - Mensajes
-- ============================================

-- Añadir columnas de email threading a messages
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS email_message_id TEXT,
  ADD COLUMN IF NOT EXISTS email_in_reply_to TEXT,
  ADD COLUMN IF NOT EXISTS email_references TEXT[];

-- Índices para email threading en messages
CREATE INDEX IF NOT EXISTS idx_messages_email_message_id 
  ON messages(email_message_id) 
  WHERE email_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_email_in_reply_to 
  ON messages(email_in_reply_to) 
  WHERE email_in_reply_to IS NOT NULL;

-- ============================================
-- 4. CONTACT UNIFICATION - Mejoras
-- ============================================

-- Añadir campo para marcar contacto principal en caso de merge
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel_identifiers JSONB DEFAULT '{}';

-- channel_identifiers estructura:
-- {
--   "instagram_dm": ["ig_user_123"],
--   "whatsapp_business": ["+34612345678"],
--   "email": ["user@example.com"]
-- }

-- Índice para buscar contactos por identificador de canal
CREATE INDEX IF NOT EXISTS idx_contacts_channel_identifiers 
  ON contacts USING GIN (channel_identifiers);

-- Función para buscar contacto por identificador
CREATE OR REPLACE FUNCTION find_contact_by_identifier(
  p_workspace_id UUID,
  p_channel TEXT,
  p_identifier TEXT
) RETURNS UUID AS $$
DECLARE
  v_contact_id UUID;
BEGIN
  SELECT id INTO v_contact_id
  FROM contacts
  WHERE workspace_id = p_workspace_id
    AND merged_into_id IS NULL
    AND channel_identifiers->p_channel ? p_identifier
  LIMIT 1;
  
  RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql;

-- Función para merge de contactos
CREATE OR REPLACE FUNCTION merge_contacts(
  p_keep_contact_id UUID,
  p_merge_contact_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_keep_identifiers JSONB;
  v_merge_identifiers JSONB;
BEGIN
  -- Obtener identificadores actuales
  SELECT channel_identifiers INTO v_keep_identifiers
  FROM contacts WHERE id = p_keep_contact_id;
  
  SELECT channel_identifiers INTO v_merge_identifiers
  FROM contacts WHERE id = p_merge_contact_id;
  
  -- Combinar identificadores
  UPDATE contacts
  SET channel_identifiers = v_keep_identifiers || v_merge_identifiers
  WHERE id = p_keep_contact_id;
  
  -- Reasignar conversaciones
  UPDATE conversations
  SET contact_id = p_keep_contact_id
  WHERE contact_id = p_merge_contact_id;
  
  -- Marcar contacto como merged
  UPDATE contacts
  SET merged_into_id = p_keep_contact_id
  WHERE id = p_merge_contact_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. SUPABASE STORAGE - Bucket para adjuntos
-- ============================================
-- NOTA: Ejecutar esto en la sección Storage de Supabase
-- o usar la API de administración

-- Crear bucket (ejecutar via Supabase Dashboard o API):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('attachments', 'attachments', false);

-- Policies para storage (crear en Dashboard):
-- 1. Allow users to upload to their workspace folder
-- 2. Allow users to read from their workspace folder

-- ============================================
-- 6. REALTIME - Habilitar publicaciones
-- ============================================

-- Habilitar Realtime para las tablas principales
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_outputs;

-- ============================================
-- 7. FUNCIÓN AUXILIAR - Logging de auditoría
-- ============================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_workspace_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_log (
    workspace_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    ip_address,
    user_agent
  ) VALUES (
    p_workspace_id,
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_data,
    p_new_data,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIN DEL SCRIPT DE ACTUALIZACIONES
-- ============================================
-- Verificaciones post-ejecución:
-- 1. SELECT * FROM audit_log LIMIT 1; (debe existir la tabla)
-- 2. SELECT column_name FROM information_schema.columns 
--    WHERE table_name = 'conversations' AND column_name = 'email_subject';
-- 3. SELECT column_name FROM information_schema.columns 
--    WHERE table_name = 'messages' AND column_name = 'email_message_id';
-- 4. Verificar en Dashboard > Realtime que las tablas están habilitadas
-- ============================================
