-- Migration 039: Enforce Surat Status Transitions
-- Created: 2026-05-18
-- Purpose: Server-side enforcement untuk workflow status surat

CREATE OR REPLACE FUNCTION enforce_surat_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Valid transitions dari Menunggu Verifikasi
  IF OLD.status = 'Menunggu Verifikasi' AND NEW.status NOT IN ('Diverifikasi', 'Ditolak') THEN
    RAISE EXCEPTION 'Invalid transition: % -> %. Harus Diverifikasi atau Ditolak dulu.', OLD.status, NEW.status;
  END IF;

  -- Valid transitions dari Diverifikasi
  IF OLD.status = 'Diverifikasi' AND NEW.status NOT IN ('Menunggu Approval', 'Ditolak') THEN
    RAISE EXCEPTION 'Invalid transition: % -> %. Harus Menunggu Approval atau Ditolak.', OLD.status, NEW.status;
  END IF;

  -- Valid transitions dari Menunggu Approval
  IF OLD.status = 'Menunggu Approval' AND NEW.status NOT IN ('Disetujui', 'Ditolak') THEN
    RAISE EXCEPTION 'Invalid transition: % -> %. Harus Disetujui atau Ditolak.', OLD.status, NEW.status;
  END IF;

  -- Final states tidak bisa diubah
  IF OLD.status IN ('Disetujui', 'Ditolak') THEN
    RAISE EXCEPTION 'Cannot modify final status: %', OLD.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER surat_status_transition_check
  BEFORE UPDATE OF status ON public.surat_requests
  FOR EACH ROW
  EXECUTE FUNCTION enforce_surat_status_transition();

-- Audit log
INSERT INTO public.audit_log (action, table_name, details, ip_address, username)
VALUES (
  'MIGRATION',
  'surat_requests',
  'Migration 039: Status transition enforcement trigger created',
  '127.0.0.1',
  'system'
);
