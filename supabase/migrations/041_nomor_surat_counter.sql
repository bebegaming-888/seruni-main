-- Migration 041: Nomor Surat Counter Table
-- Created: 2026-05-18
-- Purpose: Atomic counter untuk generate nomor surat resmi (prevent duplicates)

CREATE TABLE IF NOT EXISTS public.nomor_surat_counter (
  tahun        int PRIMARY KEY,
  counter      int NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);

-- Index for monitoring
CREATE INDEX IF NOT EXISTS nomor_surat_counter_tahun_idx
  ON public.nomor_surat_counter(tahun);

-- Enable RLS
ALTER TABLE public.nomor_surat_counter ENABLE ROW LEVEL SECURITY;

-- Only service_role can access (all access via edge functions)
DROP POLICY IF EXISTS "Service role nomor_surat_counter" ON public.nomor_surat_counter;
CREATE POLICY "Service role nomor_surat_counter" ON public.nomor_surat_counter
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Atomic increment function (race-condition safe within transaction)
CREATE OR REPLACE FUNCTION public.increment_nomor_surat_counter(p_tahun int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next int;
BEGIN
  INSERT INTO public.nomor_surat_counter (tahun, counter, updated_at)
    VALUES (p_tahun, 1, NOW())
    ON CONFLICT (tahun) DO UPDATE
      SET counter = nomor_surat_counter.counter + 1,
          updated_at = NOW()
    RETURNING counter INTO v_next;
  RETURN v_next;
END;
$$;

-- Grant execute to service_role
GRANT EXECUTE ON FUNCTION public.increment_nomor_surat_counter(int) TO service_role;

-- Audit log
INSERT INTO public.audit_log (action, table_name, details, ip_address, username)
VALUES (
  'MIGRATION',
  'nomor_surat_counter',
  'Migration 041: Created nomor_surat_counter table + atomic increment function',
  '127.0.0.1',
  'system'
);
