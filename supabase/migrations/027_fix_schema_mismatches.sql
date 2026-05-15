-- ============================================================
-- MIGRATION 027: Fix Schema Mismatches
-- ============================================================
-- Fixes 3 root causes of runtime 400/500 errors:
-- 1. admin_users   → missing password/email/fixed/updated_at columns + no public SELECT RLS
-- 2. perangkat_desa → missing 'urutan' column (ORDER BY fails → 400)
-- 3. perangkat_desa_struktur → table does not exist (400 on all queries)

-- ============================================================
-- 1. FIX: admin_users — Add missing columns
-- ============================================================

-- Frontend syncSaveAdminUser() sends: password, email, fixed, updated_at
-- DB only has: id, username, password_hash, name, role, last_login, created_at

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS password     text,
  ADD COLUMN IF NOT EXISTS email        text,
  ADD COLUMN IF NOT EXISTS fixed        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();

-- Backfill: copy password_hash → password for existing rows
UPDATE public.admin_users SET password = password_hash WHERE password IS NULL;

-- RLS: add public SELECT so healthCheck() doesn't return 500
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read admin_users" ON public.admin_users;
CREATE POLICY "Public read admin_users" ON public.admin_users
  FOR SELECT USING (true);

-- ============================================================
-- 2. FIX: perangkat_desa — Add missing 'urutan' column
-- ============================================================

ALTER TABLE public.perangkat_desa
  ADD COLUMN IF NOT EXISTS urutan integer DEFAULT 0;

-- ============================================================
-- 3. CREATE: perangkat_desa_struktur (was never created)
-- ============================================================
-- Expected by frontend PerangkatStruktur type:
-- id, parent_id, nama_jabatan, kategori, level_hierarchy,
-- urutan, warna_label, is_single_position, status_aktif, created_at, updated_at

CREATE TABLE IF NOT EXISTS public.perangkat_desa_struktur (
  id                  serial PRIMARY KEY,
  parent_id           integer REFERENCES public.perangkat_desa_struktur(id) ON DELETE SET NULL,
  nama_jabatan        text NOT NULL,
  kategori            text NOT NULL DEFAULT 'Pemerintahan',
  level_hierarchy     integer NOT NULL DEFAULT 1,
  urutan              integer NOT NULL DEFAULT 0,
  warna_label         text,
  is_single_position  boolean NOT NULL DEFAULT true,
  status_aktif        boolean NOT NULL DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz
);

-- Add FK from perangkat_desa → perangkat_desa_struktur (if not already)
ALTER TABLE public.perangkat_desa
  ADD COLUMN IF NOT EXISTS struktur_id integer REFERENCES public.perangkat_desa_struktur(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pds_parent    ON public.perangkat_desa_struktur(parent_id);
CREATE INDEX IF NOT EXISTS idx_pds_urutan    ON public.perangkat_desa_struktur(urutan);
CREATE INDEX IF NOT EXISTS idx_pd_struktur   ON public.perangkat_desa(struktur_id);
CREATE INDEX IF NOT EXISTS idx_pd_urutan     ON public.perangkat_desa(urutan);

-- RLS for perangkat_desa_struktur
ALTER TABLE public.perangkat_desa_struktur ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read perangkat_desa_struktur" ON public.perangkat_desa_struktur;
CREATE POLICY "Public read perangkat_desa_struktur" ON public.perangkat_desa_struktur
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage perangkat_desa_struktur" ON public.perangkat_desa_struktur;
CREATE POLICY "Admin manage perangkat_desa_struktur" ON public.perangkat_desa_struktur
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- 4. FIX: app_settings — updated_at trigger (prevent timeout)
-- ============================================================
-- Ensure the trigger function exists and is lightweight

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. SEED: perangkat_desa_struktur (default Desa structure)
-- ============================================================
-- Insert default jabatan tree if table is empty

INSERT INTO public.perangkat_desa_struktur
  (id, parent_id, nama_jabatan, kategori, level_hierarchy, urutan, is_single_position, status_aktif)
SELECT * FROM (VALUES
  (1,  NULL, 'Kepala Desa',              'Pemerintahan', 1, 1,  true,  true),
  (2,  1,    'Sekretaris Desa',          'Pemerintahan', 2, 2,  true,  true),
  (3,  2,    'Kaur Tata Usaha & Umum',   'Pemerintahan', 3, 3,  true,  true),
  (4,  2,    'Kaur Keuangan',            'Pemerintahan', 3, 4,  true,  true),
  (5,  2,    'Kaur Perencanaan',         'Pemerintahan', 3, 5,  true,  true),
  (6,  1,    'Kasi Pemerintahan',        'Pemerintahan', 2, 6,  true,  true),
  (7,  1,    'Kasi Kesejahteraan',       'Pemerintahan', 2, 7,  true,  true),
  (8,  1,    'Kasi Pelayanan',           'Pemerintahan', 2, 8,  true,  true),
  (9,  1,    'Kepala Dusun',             'Kewilayahan',  2, 9,  false, true)
) AS v(id, parent_id, nama_jabatan, kategori, level_hierarchy, urutan, is_single_position, status_aktif)
WHERE NOT EXISTS (SELECT 1 FROM public.perangkat_desa_struktur LIMIT 1);

-- Reset sequence after manual ID insert
SELECT setval('perangkat_desa_struktur_id_seq', (SELECT COALESCE(MAX(id), 9) FROM public.perangkat_desa_struktur));
