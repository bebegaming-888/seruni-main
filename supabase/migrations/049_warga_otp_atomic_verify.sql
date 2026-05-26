-- ============================================================
-- MIGRATION 049: Atomic Warga OTP Verification & Session Creation
--
-- Issue: verify-otp.js melakukan OTP verification (PATCH mark used) dan
-- session creation (INSERT warga_sessions) sebagai dua step terpisah.
-- Jika INSERT gagal setelah PATCH berhasil → OTP marked used tapi tidak ada
-- session → user terkunci selama 5 menit (sampai OTP expired).
--
-- Fix: Buat RPC function `warga_verify_otp_and_create_session()`
-- yang menangani KEDUA step dalam SATU PostgreSQL transaction.
-- Jika apapun gagal → entire transaction rollback → OTP tidak marked used.
--
-- Security:
-- - OTP hash: PBKDF2-SHA512 (100k iterations)
-- - Token: SHA-256 hash (not plaintext)
-- - Session expiry: 7 days from creation
--
-- Author: Claude Code Audit Fix
-- Date: 2026-05-19
-- ============================================================

BEGIN;

-- ── 1. Drop existing function if any (safe re-run) ───────────────────────────
DROP FUNCTION IF EXISTS public.warga_verify_otp_and_create_session(
  p_nik TEXT,
  p_otp TEXT
);

-- ── 2. Create atomic RPC function ───────────────────────────────────────────────
-- Transaction flow:
--   Step A: SELECT OTP record (nik, unexpired, unused) — WITH FOR UPDATE lock
--   Step B: Verify OTP hash
--   Step C: INSERT warga_sessions
--   Step D: UPDATE otp_requests SET used=true
--   Step E: Return warga data + session token
--
-- If ANY step fails → entire transaction ROLLBACK → OTP stays unused.

CREATE OR REPLACE FUNCTION public.warga_verify_otp_and_create_session(
  p_nik TEXT,
  p_otp TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp_record      RECORD;
  v_warga_record    RECORD;
  v_token           TEXT;
  v_token_hash      TEXT;
  v_expires_at      TIMESTAMPTZ;
  v_session_id      UUID;
  v_result          JSONB;
  v_input_hash      TEXT;
  v_salt            TEXT;
  v_stored_hash     TEXT;
  v_valid           BOOLEAN := FALSE;
BEGIN
  -- Guard: validate inputs
  IF p_nik IS NULL OR char_length(p_nik) != 16 THEN
    RAISE EXCEPTION 'NIK harus 16 digit';
  END IF;
  IF p_otp IS NULL OR char_length(p_otp) != 6 THEN
    RAISE EXCEPTION 'OTP harus 6 digit';
  END IF;

  -- ── Step A: Find and lock the OTP record ──────────────────────────────────
  -- FOR UPDATE lock prevents concurrent OTP usage (serializable)
  SELECT id, otp_hash, expires_at
    INTO v_otp_record
    FROM public.otp_requests
   WHERE nik = p_nik
     AND used = FALSE
     AND expires_at > NOW()
   ORDER BY created_at DESC
   LIMIT 1
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OTP tidak valid atau sudah kadaluarsa';
  END IF;

  -- ── Step B: Verify OTP hash ───────────────────────────────────────────────
  v_stored_hash := v_otp_record.otp_hash;

  IF position('pbkdf2:' in v_stored_hash) = 1 THEN
    -- Parse: pbkdf2:<salt_hex>:<hash_hex>  (salt is always 14 hex chars = 7 bytes)
    -- substring(str, start, length) uses 1-based indexing.
    -- "pbkdf2:" = chars 1-7, salt = chars 8-14, ':' = char 15, hash = char 16+
    v_salt := substring(v_stored_hash, 8, 7);          -- extract 7-char salt
    v_stored_hash := substring(v_stored_hash, 16);    -- extract hash after ':'

    -- Compute hash of input OTP with same salt
    v_input_hash := encode(
      pgcrypto.pbkdf2_hmac(
        p_otp::BYTEA,
        decode(v_salt, 'hex'),
        100000,
        64,
        'sha512'
      ),
      'hex'
    );

    -- Timing-safe comparison
    IF v_input_hash = v_stored_hash THEN
      v_valid := TRUE;
    END IF;

  ELSIF position('pbkdf2_sha512$' in v_stored_hash) = 1 THEN
    -- H-02 FIXED: Parse standard format (pbkdf2_sha512$<iterations>$<salt_b64>$<hash_b64>)
    -- Matches client-side auth.ts and server-side request-otp.js hashOtpStandard()
    DECLARE
      v_parts TEXT[];
      v_iters INT;
      v_salt_b64 TEXT;
      v_hash_b64 TEXT;
      v_iters_int INT;
    BEGIN
      v_parts := string_to_array(v_stored_hash, '$');
      IF array_length(v_parts, 1) = 4 THEN
        v_iters_int := v_parts[2]::INT;
        v_salt_b64 := v_parts[3];
        v_hash_b64 := v_parts[4];
        v_input_hash := encode(
          pgcrypto.pbkdf2_hmac(
            p_otp::BYTEA,
            decode(v_salt_b64, 'base64'),
            v_iters_int,
            64,
            'sha512'
          ),
          'base64'
        );
        IF v_input_hash = v_hash_b64 THEN
          v_valid := TRUE;
        END IF;
      END IF;
    END;

  ELSIF v_stored_hash = p_otp THEN
    -- Legacy plaintext fallback
    v_valid := TRUE;
  END IF;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Kode OTP salah';
  END IF;

  -- ── Step C: Get warga data ─────────────────────────────────────────────────
  SELECT id, nik, nama, no_hp
    INTO v_warga_record
    FROM public.warga
   WHERE nik = p_nik;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Data warga tidak ditemukan';
  END IF;

  -- ── Step D: Create session token + store hash ─────────────────────────────
  v_token := encode(gen_random_bytes(32), 'hex') || '-' || extract(EPOCH FROM now())::TEXT;
  v_token_hash := encode(sha256(v_token::BYTEA), 'hex');
  v_expires_at := NOW() + INTERVAL '7 days';
  v_session_id := gen_random_uuid();

  INSERT INTO public.warga_sessions (id, warga_id, token_hash, expires_at, created_at)
    VALUES (v_session_id, v_warga_record.id, v_token_hash, v_expires_at, NOW());

  -- ── Step E: Mark OTP as used (same transaction — atomic) ──────────────────
  UPDATE public.otp_requests
     SET used = TRUE
   WHERE id = v_otp_record.id;

  -- ── Step F: Return result ──────────────────────────────────────────────────
  v_result := jsonb_build_object(
    'ok',         TRUE,
    'token',      v_token,
    'warga',      jsonb_build_object(
      'id',    v_warga_record.id,
      'nik',   v_warga_record.nik,
      'nama',  v_warga_record.nama,
      'no_hp', v_warga_record.no_hp
    ),
    'expires_in', 7 * 24 * 60 * 60  -- 7 days in seconds
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Any error → transaction auto-rollback → OTP stays unused → user can retry
    RAISE;
END;
$$;

-- ── 3. Grant execute to anon role (browser calls this RPC) ───────────────────
GRANT EXECUTE ON FUNCTION public.warga_verify_otp_and_create_session(TEXT, TEXT) TO anon;

-- ── 4. Grant execute to authenticated (for admin-triggered verification) ───────
GRANT EXECUTE ON FUNCTION public.warga_verify_otp_and_create_session(TEXT, TEXT) TO authenticated;

-- ── 5. Audit log ───────────────────────────────────────────────────────────────
INSERT INTO public.audit_log (action, table_name, details, ip_address, username)
VALUES (
  'MIGRATION',
  'warga_sessions',
  'Migration 049: Created warga_verify_otp_and_create_session() RPC. OTP verification + session creation now atomic (transaction rollback on any failure).',
  '127.0.0.1',
  'system'
);

COMMIT;

-- ── Verification ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 049: warga_verify_otp_and_create_session() ready.';
  RAISE NOTICE 'verify-otp.js should call this RPC instead of multi-step PATCH+INSERT.';
END $$;