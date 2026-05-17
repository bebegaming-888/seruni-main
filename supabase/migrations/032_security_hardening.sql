/**
 * Migration 032: Security hardening — Legacy OTP cleanup + Secret migration
 *
 * Run di Supabase Dashboard → SQL Editor
 *
 * Apa yang dilakukan:
 *   1. Nonaktifkan semua OTP lama (format bukan PBKDF2)
 *      → Warga harus minta OTP baru saat login
 *   2. Tandai qr_secret di settings sebagai "diambil dari Cloudflare Secrets"
 *   3. Hapus fonnte_token plaintext dari settings
 *      → Baca dari FONNTE_API_KEY Cloudflare Secret sebagai fallback
 *
 * Dampak:
 *   - Semua OTP lama di-invalidate (warga minta OTP baru)
 *   - qr_secret & fonnte_token tidak lagi ada di database
 *   - Fonnte WA tetap berfungsi (edge function fallback ke env var)
 *   - QR verification tetap berfungsi (edge function baca dari Cloudflare Secret)
 */

-- ================================================================
-- Step 1: Legacy OTP Cleanup
-- ================================================================

-- Hapus semua OTP yang sudah expired > 7 hari (cleanup)
DELETE FROM otp_requests WHERE expires_at < NOW() - INTERVAL '7 days';

-- Nonaktifkan semua OTP lama (bukan PBKDF2) → paksa minta OTP baru
UPDATE otp_requests
SET
  used = TRUE,
  expires_at = NOW()
WHERE
  otp_hash NOT LIKE 'pbkdf2:%'
  AND used = FALSE;

-- Verifikasi: tidak boleh ada OTP aktif dengan format lama
DO $$
DECLARE
  old_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count
  FROM otp_requests
  WHERE
    used = FALSE
    AND expires_at > NOW()
    AND otp_hash NOT LIKE 'pbkdf2:%';

  RAISE NOTICE 'Active legacy OTP records (should be 0): %', old_count;
END $$;

-- ================================================================
-- Step 2: Remove secrets from app_settings
-- ================================================================

-- qr_secret → dari Cloudflare Secrets (QR_SECRET env var)
-- fonnte_token → dari Cloudflare Secrets (FONNTE_API_KEY env var)
UPDATE app_settings
SET
  value = JSONB_SET(
    JSONB_SET(value, '{signature,qr_secret}', '"__CF_SECRET__"'),
    '{notifications,fonnte_token}',
    '"__CF_SECRET__"'
  )
WHERE key = 'main_settings';

-- ================================================================
-- Step 3: Verifikasi
-- ================================================================

-- Cek OTP distribution
SELECT
  CASE
    WHEN otp_hash LIKE 'pbkdf2:%' THEN 'PBKDF2 (aman)'
    WHEN otp_hash LIKE 'MIGRATED:%' THEN 'Legacy (inactive)'
    WHEN used = TRUE THEN 'Already used'
    ELSE 'Other'
  END as status,
  COUNT(*) as jumlah
FROM otp_requests
GROUP BY 1
ORDER BY 1;

-- Cek settings secrets sudah dihapus
SELECT
  value->'signature'->>'qr_secret' as qr_secret_marker,
  value->'notifications'->>'fonnte_token' as fonnte_token_marker
FROM app_settings
WHERE key = 'main_settings';
-- Kedua kolom harus berisi "__CF_SECRET__"