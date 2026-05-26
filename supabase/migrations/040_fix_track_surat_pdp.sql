-- ============================================================
-- MIGRATION 040: Fix track_surat RPC — UU PDP Compliance
-- Created: 2026-05-18
-- Severity: HIGH — data leak ke anonymous user
-- Root cause: `SELECT *` return semua kolom sensitif
--   (nik, pemohon, kontak, no_kk, alamat, data_json, attachments)
-- Fix: explicit column allowlist — hanya field safe untuk public
-- ============================================================

-- ── Drop old unsafe version ──
DROP FUNCTION IF EXISTS public.track_surat(text, text);

-- ── Safe RPC: hanya return kolom non-sensitif ──
CREATE OR REPLACE FUNCTION public.track_surat(p_no_surat text, p_nik text)
RETURNS TABLE (
  no_surat     text,
  kode         text,
  nama_surat   text,
  status       text,
  created_at   timestamptz,
  catatan     text,
  signed_at    timestamptz,
  signed_by    text,
  qr_payload   text,
  verified_at  timestamptz,
  approved_at  timestamptz,
  updated_at   timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.no_surat,
    s.kode,
    s.nama_surat,
    s.status::text,
    s.created_at,
    s.catatan,
    s.signed_at,
    s.signed_by,
    s.qr_payload,
    s.verified_at,
    s.approved_at,
    s.updated_at
  FROM public.surat_requests s
  WHERE (s.no_surat   = p_no_surat
      OR s.tracking_no = p_no_surat)
    AND s.nik         = p_nik;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Verify: grant hanya SELECT pada return columns ──
GRANT EXECUTE ON FUNCTION public.track_surat(text, text) TO anon, authenticated;

-- ── Audit trail ──
INSERT INTO public.audit_log (action, table_name, details, ip_address, username)
VALUES (
  'MIGRATION',
  'surat_requests',
  'Migration 040: track_surat RPC fixed — UU PDP compliance. '
  || 'Removed: nik, pemohon, kontak, no_kk, data_json, attachments. '
  || 'Allowed: no_surat, kode, nama_surat, status, catatan, timestamps, qr_payload.',
  '127.0.0.1',
  'system'
);

-- ============================================================
-- Verifikasi kolom yang TIDAK di-return:
-- ❌ nik         → PII, hanya boleh di-authenticated context
-- ❌ pemohon     → PII
-- ❌ kontak      → PII
-- ❌ no_kk       → PII
-- ❌ warga_id    → bisa di-map ke data pribadi
-- ❌ data_json   → bisa berisi field sensitif apapun
-- ❌ attachments → URL bisa expose dokumen pribadi
--
-- Verifikasi kolom yang DI-return (safe):
-- ✅ no_surat    → tracking identifier
-- ✅ kode        → jenis surat
-- ✅ nama_surat  → label surat
-- ✅ status      → status pengajuan
-- ✅ catatan    → catatan admin (tidak PII)
-- ✅ signed_at   → timestamp tanda tangan
-- ✅ signed_by   → nama penandatangan (umum)
-- ✅ qr_payload  → QR code identifier
-- ✅ verified_at → timeline
-- ✅ approved_at → timeline
-- ✅ updated_at  → timeline
-- ============================================================