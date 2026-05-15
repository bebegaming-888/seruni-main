-- ============================================================
-- MIGRATION 024: Backend-Frontend Synchronization (Deep Scan)
-- ============================================================
-- Melakukan penyelarasan skema tabel agar sesuai 1:1 dengan TS Interface.

-- 1. WARGA
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warga' AND column_name = 'status_kawin') THEN
    ALTER TABLE public.warga RENAME COLUMN status_kawin TO status_perkawinan;
  END IF;
END $$;

-- 2. PERANGKAT DESAa
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perangkat_desa' AND column_name = 'is_aktif') THEN
    ALTER TABLE public.perangkat_desa RENAME COLUMN is_aktif TO status_aktif;
  END IF;
END $$;

ALTER TABLE public.perangkat_desa ADD COLUMN IF NOT EXISTS foto_storage_path text;
ALTER TABLE public.perangkat_desa ADD COLUMN IF NOT EXISTS nomor_sk text;
ALTER TABLE public.perangkat_desa ADD COLUMN IF NOT EXISTS tanggal_terbit_sk text;
ALTER TABLE public.perangkat_desa ADD COLUMN IF NOT EXISTS tanggal_berakhir text;
ALTER TABLE public.perangkat_desa ADD COLUMN IF NOT EXISTS pendidikan text;
ALTER TABLE public.perangkat_desa ADD COLUMN IF NOT EXISTS alamat text;
ALTER TABLE public.perangkat_desa ADD COLUMN IF NOT EXISTS tanggal_lahir text;
ALTER TABLE public.perangkat_desa ADD COLUMN IF NOT EXISTS tempat_lahir text;
ALTER TABLE public.perangkat_desa ADD COLUMN IF NOT EXISTS jenis_kelamin text;

-- 3. LEMBAGA DESA
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lembaga_desa' AND column_name = 'is_aktif') THEN
    ALTER TABLE public.lembaga_desa RENAME COLUMN is_aktif TO enabled;
  END IF;
END $$;

ALTER TABLE public.lembaga_desa ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.lembaga_desa ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.lembaga_desa ADD COLUMN IF NOT EXISTS logo_storage_path text;
ALTER TABLE public.lembaga_desa ADD COLUMN IF NOT EXISTS urutan integer DEFAULT 0;
ALTER TABLE public.lembaga_desa ADD COLUMN IF NOT EXISTS periode_mulai text;
ALTER TABLE public.lembaga_desa ADD COLUMN IF NOT EXISTS periode_selesai text;
ALTER TABLE public.lembaga_desa ADD COLUMN IF NOT EXISTS kontak_info jsonb DEFAULT '{}'::jsonb;

-- 4. SURAT REQUESTS
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surat_requests' AND column_name = 'no_surat') THEN
    ALTER TABLE public.surat_requests RENAME COLUMN no_surat TO no;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surat_requests' AND column_name = 'data_json') THEN
    ALTER TABLE public.surat_requests RENAME COLUMN data_json TO data;
  END IF;
END $$;

ALTER TABLE public.surat_requests ADD COLUMN IF NOT EXISTS tracking_no text;
ALTER TABLE public.surat_requests ADD COLUMN IF NOT EXISTS warga_id uuid REFERENCES public.warga(id);

-- 5. SURAT TEMPLATE
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surat_template' AND column_name = 'kode_surat') THEN
    ALTER TABLE public.surat_template RENAME COLUMN kode_surat TO code;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surat_template' AND column_name = 'nama_surat') THEN
    ALTER TABLE public.surat_template RENAME COLUMN nama_surat TO name;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surat_template' AND column_name = 'kategori_surat') THEN
    ALTER TABLE public.surat_template RENAME COLUMN kategori_surat TO category;
  END IF;
END $$;

ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS syarat jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS fields jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS eta text;
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS dna_clauses jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS subject_fields jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS closing text;
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS subject_count integer DEFAULT 1;
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS status text DEFAULT 'Draft';
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS catatan text;
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS verified_by text;
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS approved_by text;
ALTER TABLE public.surat_template ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;
