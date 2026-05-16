-- MIGRATION 031: Add composite index on surat_requests for admin dashboard performance
--
-- Background: Admin dashboard filters by status + sorts by created_at.
-- Without composite index, large tables (10.000+ records) do full scans.
--
-- Run: supabase db push  atau  psql -f supabase/migrations/031_surat_requests_perf_index.sql
-- Idempotent: DROP INDEX IF EXISTS sebelum CREATE.

-- ── 1. surat_requests ───────────────────────────────────────────────────────

-- Composite index: status filter + created_at sort
-- Ini INI yang utama — mempercepat query yang paling sering di admin dashboard:
--   SELECT * FROM surat_requests
--     WHERE status IN ('Menunggu Verifikasi', 'Diverifikasi', ...)
--     ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS surat_requests_status_created_idx
  ON public.surat_requests(status, created_at DESC);

-- Partial index: only active (non-archived) records
-- surat_requests.archived ditambahkan oleh migration 011.
-- Admin dashboard HANYA menampilkan record non-archived — filter ini sangat membantu.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'surat_requests'
       AND column_name  = 'archived'
  ) THEN
    CREATE INDEX IF NOT EXISTS surat_requests_active_idx
      ON public.surat_requests(created_at DESC)
      WHERE archived IS DISTINCT FROM true;
  ELSE
    RAISE NOTICE 'Column archived belum ada di surat_requests — skip index ini';
  END IF;
END $$;

-- Index for warga lookup by NIK ( sering di-join di surat_requests.nik )
-- Sudah ada di migration 001 (warga_nik_idx) tapi kita ulangi untuk clarity
CREATE INDEX IF NOT EXISTS surat_requests_nik_idx
  ON public.surat_requests(nik);

-- Index for tracking number lookup (unique check di aplikasi)
-- tracking_no ditambahkan oleh migration 007 (conditional).
-- Gunakan DO block agar idempotent even jika kolom belum ada.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'surat_requests'
       AND column_name  = 'tracking_no'
  ) THEN
    CREATE INDEX IF NOT EXISTS surat_requests_tracking_idx
      ON public.surat_requests(tracking_no)
      WHERE tracking_no IS NOT NULL;
  ELSE
    RAISE NOTICE 'Column tracking_no belum ada di surat_requests — skip index ini';
  END IF;
END $$;

-- Index for no_surat prefix search (administrasi lookup)
-- NOTE: Kolom telah direname dari no_surat → no oleh migration 024.
CREATE INDEX IF NOT EXISTS surat_requests_no_prefix_idx
  ON public.surat_requests(no text_pattern_ops);

-- ── 2. warga ─────────────────────────────────────────────────────────────────

-- Partial index: only active (non-archived) warga —加快了 NIK lookup
-- warga.archived ditambahkan oleh migration 013.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'warga'
       AND column_name  = 'archived'
  ) THEN
    CREATE INDEX IF NOT EXISTS warga_nik_active_idx
      ON public.warga(nik)
      WHERE archived IS DISTINCT FROM true;
  ELSE
    RAISE NOTICE 'Column archived belum ada di warga — skip index ini';
  END IF;
END $$;

-- ── 3. perangkat_desa_struktur ──────────────────────────────────────────────

-- Index for parent_id tree traversal ( struktur hierarki )
-- Note:pk menggunakan SERIAL/integer (bukan uuid)
CREATE INDEX IF NOT EXISTS perangkat_desa_struktur_parent_idx
  ON public.perangkat_desa_struktur(parent_id);

-- Verify indexes
DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO idx_count
    FROM pg_indexes
   WHERE schemaname = 'public'
     AND tablename = 'surat_requests'
     AND indexname LIKE 'surat_requests_%';
  RAISE NOTICE 'surat_requests indexes count: %', idx_count;
END $$;
