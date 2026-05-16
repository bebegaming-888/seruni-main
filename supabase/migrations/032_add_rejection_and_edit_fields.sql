-- Migration: 032_add_rejection_and_edit_fields
-- Adds fields for rejection reasons tracking, selfie photo, and edit audit trail.

BEGIN;

-- 1. foto_selfie: JSONB column for storing selfie photo as base64 data URL
--    (stored inline for small files; large files use surat-attachments storage)
ALTER TABLE surat_requests
  ADD COLUMN IF NOT EXISTS foto_selfie JSONB DEFAULT NULL;

COMMENT ON COLUMN surat_requests.foto_selfie IS
  'Foto selfie dengan KTP (base64 data URL atau { storage_path, name, type, size }). NULL jika belum ada.';

-- 2. rejection_reasons: TEXT[] array storing structured rejection reason keys
--    Matches the REJECTION_REASONS array keys in SuratPreviewPanel.tsx
ALTER TABLE surat_requests
  ADD COLUMN IF NOT EXISTS rejection_reasons TEXT[] DEFAULT NULL;

COMMENT ON COLUMN surat_requests.rejection_reasons IS
  'Array reason key dari daftar alasan penolakan. Contoh: {"REASON_1", "REASON_3"}. Untuk audit trail terstruktur.';

-- 3. rejection_detail: TEXT for free-text reason (custom "lainnya" input)
ALTER TABLE surat_requests
  ADD COLUMN IF NOT EXISTS rejection_detail TEXT DEFAULT NULL;

COMMENT ON COLUMN surat_requests.rejection_detail IS
  'Alasan penolakan kustom (field "Lainnya" dari form checkbox). NULL jika tidak ada.';

-- 4. edit_history: JSONB[] array for tracking correction/edit history
--    Each entry: { timestamp, edited_by, correction_note, changed_fields: [...] }
ALTER TABLE surat_requests
  ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT NULL;

COMMENT ON COLUMN surat_requests.edit_history IS
  'Riwayat koreksi warga. Array of { timestamp, edited_by, correction_note, changed_fields: [...], kontak?, data?, attachments? }.';

-- 5. updated_by: TEXT column to track who last updated the record
ALTER TABLE surat_requests
  ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT NULL;

COMMENT ON COLUMN surat_requests.updated_by IS
  'Nama user/admin terakhir yang mengubah record. Untuk audit trail.';

-- 6. verified_at + verified_by: fill gap — these were missing in previous schema
-- (If they already exist, this is a no-op)
ALTER TABLE surat_requests
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE surat_requests
  ADD COLUMN IF NOT EXISTS verified_by TEXT DEFAULT NULL;

-- Index untuk query cepat berdasarkan rejection_reasons
CREATE INDEX IF NOT EXISTS idx_surat_requests_rejection_reasons
  ON surat_requests USING GIN (rejection_reasons)
  WHERE rejection_reasons IS NOT NULL;

-- Index untuk edit_history
CREATE INDEX IF NOT EXISTS idx_surat_requests_edit_history
  ON surat_requests USING GIN (edit_history)
  WHERE edit_history IS NOT NULL;

-- Index untuk foto_selfie (berkas kecil, inline)
CREATE INDEX IF NOT EXISTS idx_surat_requests_foto_selfie
  ON surat_requests (created_at DESC)
  WHERE foto_selfie IS NOT NULL;

COMMIT;

-- Seed: update rejection_reasons comment to include key labels
-- This is metadata-only, no data change needed for existing rows