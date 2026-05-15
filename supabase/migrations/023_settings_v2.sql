-- ============================================================
-- MIGRATION 023: App Settings v2 (History & Schema Evolution)
-- ============================================================

-- 1. Tambahkan kolom audit ke app_settings
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 2. Buat tabel history untuk menyimpan versi sebelumnya
CREATE TABLE IF NOT EXISTS public.app_settings_history (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         text NOT NULL,
  value       jsonb NOT NULL,
  version     integer NOT NULL,
  saved_by    text,
  saved_at    timestamptz DEFAULT now()
);

-- Index untuk pencarian history
CREATE INDEX IF NOT EXISTS app_settings_history_key_idx ON public.app_settings_history(key);

-- 3. Trigger otomatis untuk menyimpan history saat ada update di app_settings
CREATE OR REPLACE FUNCTION public.save_app_settings_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Jika nilai berubah, simpan row LAMA ke history
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    INSERT INTO public.app_settings_history (key, value, version, saved_by, saved_at)
    VALUES (OLD.key, OLD.value, COALESCE(OLD.version, 1), OLD.updated_by, OLD.updated_at);
    
    -- Increment version untuk NEW row
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS tr_app_settings_history ON public.app_settings;
CREATE TRIGGER tr_app_settings_history
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.save_app_settings_history();

-- 4. Perketat RLS Policy untuk app_settings
-- Hapus policy lama yang insecure (mengizinkan semua user walau tidak pakai token)
DROP POLICY IF EXISTS "Admin write app_settings" ON public.app_settings;

-- Buat policy baru: hanya authenticated user yang bisa write
-- (Asumsi admin login menghasilkan session authenticated)
CREATE POLICY "Admin write app_settings" ON public.app_settings
  FOR ALL TO authenticated USING (true);

-- Enable RLS untuk history
ALTER TABLE public.app_settings_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read app_settings_history" ON public.app_settings_history;
CREATE POLICY "Public read app_settings_history" ON public.app_settings_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write app_settings_history" ON public.app_settings_history;
CREATE POLICY "Admin write app_settings_history" ON public.app_settings_history
  FOR ALL TO authenticated USING (true);

GRANT SELECT ON public.app_settings_history TO anon, authenticated;
GRANT ALL ON public.app_settings_history TO authenticated;
