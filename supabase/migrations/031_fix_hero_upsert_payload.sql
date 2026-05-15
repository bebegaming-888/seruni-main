-- ============================================================
-- MIGRATION 031: Fix hero_config upsert payload
--
-- ROOT CAUSE: kolom cloudSynced tidak ada di tabel hero_config.
-- Setiap saveHeroConfig() mengirim cloudSynced di upsert payload
-- PostgreSQL reject karena kolom tidak ada -> upsert selalu gagal.
-- Banner "IDB data is newer than Supabase" selalu muncul.
--
-- FIX:
--   1. Tambahkan kolom cloud_synced (snake_case, nullable)
--   2. Verifikasi primary key constraint
-- ============================================================

-- Add cloud_synced column
ALTER TABLE public.hero_config
ADD COLUMN IF NOT EXISTS cloud_synced boolean DEFAULT NULL;

-- Verify primary key exists (for upsert ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'hero_config'
      AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.hero_config ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Verify
DO $$
DECLARE
  has_col boolean;
  has_pkey boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hero_config'
      AND column_name = 'cloud_synced'
  ) INTO has_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'hero_config'
      AND constraint_type = 'PRIMARY KEY'
  ) INTO has_pkey;

  IF has_col THEN
    RAISE NOTICE '[OK] Column cloud_synced exists';
  ELSE
    RAISE WARNING '[WARN] Column cloud_synced NOT added - check permissions';
  END IF;

  IF has_pkey THEN
    RAISE NOTICE '[OK] Primary key on hero_config.id exists';
  ELSE
    RAISE WARNING '[WARN] Primary key NOT found';
  END IF;
END $$;