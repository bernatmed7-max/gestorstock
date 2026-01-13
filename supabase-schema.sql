-- ============================================
-- GESTOR DE STOCK - Supabase Database Schema
-- ============================================
-- Versión: 1.0
-- Última actualización: Enero 2026
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TABLA PROFILES
-- ============================================
-- Almacena información adicional de los usuarios

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. TRIGGER: Crear perfil automáticamente
-- ============================================
-- Cuando un usuario se registra, crea automáticamente su perfil

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 3. TABLA JOBS
-- ============================================
-- Almacena los trabajos de generación de gráficos con IA

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  input JSONB NOT NULL,
  output JSONB,
  error JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  n8n_execution_id TEXT,
  attempts INT DEFAULT 0
);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- --- Políticas para PROFILES ---
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- --- Políticas para JOBS ---
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver sus propios jobs
CREATE POLICY "Users can view own jobs" ON jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios solo pueden crear jobs para sí mismos
CREATE POLICY "Users can insert own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Los usuarios solo pueden actualizar sus propios jobs
CREATE POLICY "Users can update own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 5. ÍNDICES DE RENDIMIENTO
-- ============================================

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- ============================================
-- 6. TABLA SHEET_SYNC (Google Sheets Sync)
-- ============================================
-- Almacena datos sincronizados desde hojas de cálculo externas

CREATE TABLE IF NOT EXISTS sheet_sync (
  id TEXT PRIMARY KEY DEFAULT 'default',
  sheet_id TEXT,
  headers JSONB,
  rows JSONB,
  row_count INT DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permitir acceso público para lectura (los datos de inventario no son sensibles)
ALTER TABLE sheet_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sheet_sync" ON sheet_sync
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage sheet_sync" ON sheet_sync
  FOR ALL USING (true);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Después de ejecutar este script:
-- 1. Verificar que las tablas se crearon correctamente
-- 2. Probar registro de usuario para verificar el trigger
-- 3. Las políticas RLS protegerán los datos automáticamente
-- ============================================
