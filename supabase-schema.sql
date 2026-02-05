-- ============================================
-- SOCIAL CRM - Supabase Database Schema
-- ============================================
-- Versión: 1.0
-- Última actualización: Enero 2026
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ENUMS
-- ============================================

-- Drop and recreate types to avoid conflicts
DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE conversation_status AS ENUM ('open', 'pending', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE channel_type AS ENUM ('instagram_dm', 'whatsapp_business', 'email');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'agent', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_direction AS ENUM ('in', 'out');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE intent_type AS ENUM ('venta', 'soporte', 'informacion', 'otro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE urgency_level AS ENUM ('baja', 'media', 'alta', 'critica');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sentiment_type AS ENUM ('positivo', 'neutro', 'negativo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. TABLA PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. TABLA WORKSPACES
-- ============================================

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. TABLA WORKSPACE_USERS
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL DEFAULT 'agent',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- ============================================
-- 5. TABLA CHANNELS
-- ============================================

CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  channel channel_type NOT NULL,
  channel_account_id TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  -- Encrypted credentials (ciphertext + iv + algorithm)
  credentials_ciphertext TEXT,
  credentials_iv TEXT,
  credentials_algorithm TEXT DEFAULT 'aes-256-gcm',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, channel, channel_account_id)
);

-- ============================================
-- 6. TABLA CONTACTS
-- ============================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  contact_external_id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_external ON contacts(workspace_id, contact_external_id);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_email ON contacts(workspace_id, email);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_phone ON contacts(workspace_id, phone);

-- ============================================
-- 7. TABLA CONVERSATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  channel channel_type NOT NULL,
  conversation_external_id TEXT NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  status conversation_status DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, channel, conversation_external_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_workspace_status ON conversations(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_channel ON conversations(workspace_id, channel);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- ============================================
-- 8. TABLA MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  message_external_id TEXT NOT NULL,
  direction message_direction NOT NULL,
  text TEXT,
  attachments JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, message_external_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_workspace_external ON messages(workspace_id, message_external_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);

-- ============================================
-- 9. TABLA JOBS
-- ============================================

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  status job_status DEFAULT 'pending',
  input JSONB NOT NULL,
  output JSONB,
  error JSONB,
  n8n_execution_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_workspace_status ON jobs(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_message_id ON jobs(message_id);
CREATE INDEX IF NOT EXISTS idx_jobs_conversation_id ON jobs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_jobs_n8n_execution_id ON jobs(n8n_execution_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- ============================================
-- 10. TABLA AI_OUTPUTS
-- ============================================

CREATE TABLE IF NOT EXISTS ai_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  intent intent_type,
  urgency urgency_level,
  sentiment sentiment_type,
  summary TEXT,
  suggested_reply TEXT,
  confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  language TEXT,
  entities JSONB,
  routing JSONB,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_outputs_job_id ON ai_outputs(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_message_id ON ai_outputs(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_conversation_id ON ai_outputs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_workspace ON ai_outputs(workspace_id);

-- ============================================
-- 11. TABLA STYLE_PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  training_samples JSONB,
  prompt_template TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_style_profiles_workspace ON style_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_style_profiles_user ON style_profiles(user_id);

-- ============================================
-- 12. TRIGGERS
-- ============================================

-- Trigger: Crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_users_updated_at ON workspace_users;
CREATE TRIGGER update_workspace_users_updated_at
  BEFORE UPDATE ON workspace_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_style_profiles_updated_at ON style_profiles;
CREATE TRIGGER update_style_profiles_updated_at
  BEFORE UPDATE ON style_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Actualizar last_message_at en conversations
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.timestamp
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON messages;
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- ============================================
-- 13. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Helper function: Check if user belongs to workspace
CREATE OR REPLACE FUNCTION public.user_belongs_to_workspace(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_users
    WHERE workspace_id = workspace_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get user role in workspace
CREATE OR REPLACE FUNCTION public.get_user_role_in_workspace(workspace_uuid UUID)
RETURNS user_role AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val
  FROM workspace_users
  WHERE workspace_id = workspace_uuid
  AND user_id = auth.uid();
  RETURN COALESCE(user_role_val, 'viewer'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- Políticas para PROFILES ---
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- --- Políticas para WORKSPACES ---
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspaces they belong to" ON workspaces
  FOR SELECT USING (user_belongs_to_workspace(id));

CREATE POLICY "Admins can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their workspaces" ON workspaces
  FOR UPDATE USING (
    auth.uid() = created_by OR
    get_user_role_in_workspace(id) = 'admin'
  );

-- --- Políticas para WORKSPACE_USERS ---
ALTER TABLE workspace_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace members" ON workspace_users
  FOR SELECT USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Admins can manage workspace members" ON workspace_users
  FOR ALL USING (
    get_user_role_in_workspace(workspace_id) = 'admin'
  );

-- --- Políticas para CHANNELS ---
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view channels in their workspaces" ON channels
  FOR SELECT USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Admins can manage channels" ON channels
  FOR ALL USING (
    get_user_role_in_workspace(workspace_id) = 'admin'
  );

-- --- Políticas para CONTACTS ---
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contacts in their workspaces" ON contacts
  FOR SELECT USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Agents can manage contacts" ON contacts
  FOR ALL USING (
    get_user_role_in_workspace(workspace_id) IN ('admin', 'agent')
  );

-- --- Políticas para CONVERSATIONS ---
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations in their workspaces" ON conversations
  FOR SELECT USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Agents can manage conversations" ON conversations
  FOR ALL USING (
    get_user_role_in_workspace(workspace_id) IN ('admin', 'agent')
  );

-- --- Políticas para MESSAGES ---
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their workspaces" ON messages
  FOR SELECT USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Agents can insert messages" ON messages
  FOR INSERT WITH CHECK (
    user_belongs_to_workspace(workspace_id) AND
    get_user_role_in_workspace(workspace_id) IN ('admin', 'agent')
  );

-- --- Políticas para JOBS ---
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view jobs in their workspaces" ON jobs
  FOR SELECT USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Service role can manage all jobs" ON jobs
  FOR ALL USING (true);

-- --- Políticas para AI_OUTPUTS ---
ALTER TABLE ai_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AI outputs in their workspaces" ON ai_outputs
  FOR SELECT USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Service role can manage all AI outputs" ON ai_outputs
  FOR ALL USING (true);

-- --- Políticas para STYLE_PROFILES ---
ALTER TABLE style_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view style profiles in their workspaces" ON style_profiles
  FOR SELECT USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Agents can manage style profiles" ON style_profiles
  FOR ALL USING (
    get_user_role_in_workspace(workspace_id) IN ('admin', 'agent')
  );

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Después de ejecutar este script:
-- 1. Verificar que las tablas se crearon correctamente
-- 2. Probar registro de usuario para verificar el trigger
-- 3. Las políticas RLS protegerán los datos automáticamente
-- 4. Crear un workspace inicial y asignar usuarios
-- ============================================
