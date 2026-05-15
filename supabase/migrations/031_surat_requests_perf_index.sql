-- MIGRATION 031: Add composite index on surat_requests for admin dashboard performance
--
-- Background: Admin dashboard filters by status + sorts by created_at.
-- Without this index, queries on large tables (10.000+ records) do full scans.
--
-- Run: supabase/migrations/031_surat_requests_perf_index.sql
-- Idempotent: DROP INDEX IF EXISTS sebelum CREATE.

-- Composite index: status filter + created_at sort
-- Ini mempercepat:
--   SELECT * FROM surat_requests
--     WHERE status IN ('Menunggu Verifikasi', 'Diverifikasi', ...)
--     ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS surat_requests_status_created_idx
  ON public.surat_requests(status, created_at DESC);

-- Partial index: active (non-archived) records only
-- Admin dashboard mostly queries non-archived records.
-- Partial index lebih kecil dan lebih cepat daripada full table index.
CREATE INDEX IF NOT EXISTS surat_requests_active_idx
  ON public.surat_requests(created_at DESC)
  WHERE archived IS DISTINCT FROM true;

-- Index for warga lookup by NIK ( sering di-join )
CREATE INDEX IF NOT EXISTS surat_requests_nik_idx
  ON public.surat_requests(nik);

-- Index for tracking number lookup (unique check)
CREATE INDEX IF NOT EXISTS surat_requests_tracking_idx
  ON public.surat_requests(tracking_no)
  WHERE tracking_no IS NOT NULL;

-- Index for perangkat_desa performance (hierarki struktur)
CREATE INDEX IF NOT EXISTS perangkat_desa_struktur_aktif_idx
  ON public.perangkat_desa_struktur(parent_id)
  WHERE archived IS DISTINCT FROM true;

-- Verify indexes created
DO $$
BEGIN
  RAISE NOTICE 'Performance indexes created successfully';
END $$;