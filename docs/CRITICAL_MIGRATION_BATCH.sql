-- ============================================================
-- CRITICAL SECURITY & BUG FIX MIGRATION BATCH
-- Apply to: Supabase Production via SQL Editor
-- Date: 23 Mei 2026
-- ============================================================
--
-- This file combines the most critical fixes that need to be applied
-- in a specific order. Each block is idempotent (safe to re-run).
--
-- ORDER MATTERS: Apply in the sequence below.
-- ============================================================

-- ============================================================
-- STEP 1: H-02 Session Revocation Table (PRIORITY: CRITICAL)
-- File: 056_session_revocation.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS revoked_sessions (
  session_id   TEXT        NOT NULL,
  revoked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by   TEXT        NOT NULL,
  reason       TEXT        NOT NULL DEFAULT 'User logout',
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT   revoked_sessions_pkey PRIMARY KEY (session_id)
);

CREATE INDEX IF NOT EXISTS idx_revoked_sessions_session_id
  ON revoked_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_revoked_sessions_revoked_at
  ON revoked_sessions(revoked_at);

ALTER TABLE revoked_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON revoked_sessions;
CREATE POLICY "Service role full access" ON revoked_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read for health checks" ON revoked_sessions;
CREATE POLICY "Public read for health checks" ON revoked_sessions
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE revoked_sessions IS
  'Stores revoked session IDs for immediate session invalidation (H-02 security fix)';

-- ============================================================
-- STEP 2: H-03 Fix OTP Rate Limit RLS Bypass (PRIORITY: CRITICAL)
-- File: 055_fix_otp_rate_limit_rls.sql
-- ============================================================

-- Verify check_otp_rate_limit function exists
CREATE OR REPLACE FUNCTION public.check_otp_rate_limit(p_nik char(16))
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count    integer;
  v_window_start timestamptz;
  v_now      timestamptz := now();
  v_max      integer := 3;
  v_window   integer := 60; -- seconds
BEGIN
  v_window_start := v_now - (v_window || ' seconds')::interval;

  SELECT COALESCE(SUM(request_count), 0)
  INTO v_count
  FROM otp_rate_limits
  WHERE nik = p_nik AND created_at >= v_window_start;

  IF v_count >= v_max THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', 'Terlalu banyak percobaan. Silakan coba lagi dalam ' || v_window || ' detik.',
      'retry_after', v_window
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'message', 'OK');
END;
$$;

-- Revoke check_otp_rate_limit from anon role (CRITICAL: prevents bypass)
REVOKE ALL ON FUNCTION public.check_otp_rate_limit(char) FROM anon;
REVOKE ALL ON FUNCTION public.check_otp_rate_limit(char) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_otp_rate_limit(char) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_otp_rate_limit(char) TO postgres;

-- ============================================================
-- STEP 3: Critical Bug Fix - Infinite Loop Trigger
-- File: 047_fix_trigger_infinite_loop.sql
-- ============================================================

-- Drop and recreate trigger to BEFORE (not AFTER) to prevent infinite recursion
DROP TRIGGER IF EXISTS sync_surat_metadata_to_versions ON surat_requests;

CREATE OR REPLACE FUNCTION public.sync_surat_request_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- BEFORE trigger: record the OLD state to version table BEFORE the update
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO surat_request_versions(surat_no, version, data, changed_by, change_type)
    VALUES (
      OLD.no,
      COALESCE(
        (SELECT MAX(version) + 1 FROM surat_request_versions WHERE surat_no = OLD.no),
        1
      ),
      jsonb_build_object(
        'status', OLD.status,
        'verified_at', OLD.verified_at,
        'verified_by', OLD.verified_by,
        'approved_at', OLD.approved_at,
        'approved_by', OLD.approved_by,
        'signed_at', OLD.signed_at,
        'signed_by', OLD.signed_by,
        'no', OLD.no,
        'pemohon', OLD.pemohon,
        'nik', OLD.nik,
        'catatan', OLD.catatan,
        'rejection_reasons', OLD.rejection_reasons,
        'updated_by', OLD.updated_by
      ),
      COALESCE(NEW.updated_by, 'system'),
      'metadata_sync'
    )
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_surat_metadata_to_versions
  BEFORE UPDATE ON surat_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_surat_request_metadata();

-- ============================================================
-- STEP 4: Submission Rate Limit Table
-- File: 053_surat_submit_security.sql (partial)
-- ============================================================

CREATE TABLE IF NOT EXISTS submission_rate_limit (
  nik        char(16)  PRIMARY KEY,
  count      integer  NOT NULL DEFAULT 1,
  first_at   timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE submission_rate_limit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON submission_rate_limit;
CREATE POLICY "Service role full access" ON submission_rate_limit
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Increment RPC
CREATE OR REPLACE FUNCTION increment_submission_count(p_nik char(16))
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE submission_rate_limit
  SET count = count + 1
  WHERE nik = p_nik;
END;
$$;

REVOKE ALL ON FUNCTION increment_submission_count(char) FROM anon;
REVOKE ALL ON FUNCTION increment_submission_count(char) FROM authenticated;
GRANT EXECUTE ON FUNCTION increment_submission_count(char) TO service_role;

-- ============================================================
-- STEP 5: Authorized Admin Delete RPC
-- File: 050_admin_user_delete_rpc.sql
-- ============================================================

CREATE OR REPLACE FUNCTION delete_admin_user(
  p_id        uuid,
  p_session_role text,
  p_session_user_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   record;
  v_result jsonb;
BEGIN
  -- Only Super Admin can delete users
  IF p_session_role != 'Super Admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Hanya Super Admin yang dapat menghapus pengguna');
  END IF;

  -- Cannot delete fixed admin
  SELECT id, fixed INTO v_user FROM admin_users WHERE id = p_id;
  IF v_user.fixed = true THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Akun tetap tidak dapat dihapus');
  END IF;

  DELETE FROM admin_users WHERE id = p_id;
  RETURN jsonb_build_object('ok', true, 'message', 'Pengguna berhasil dihapus');
END;
$$;

REVOKE ALL ON FUNCTION delete_admin_user(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION delete_admin_user(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION delete_admin_user(uuid, text, text) TO service_role;

-- ============================================================
-- STEP 6: Authorized Admin Upsert RPC
-- File: 051_admin_user_upsert_rpc.sql
-- ============================================================

CREATE OR REPLACE FUNCTION upsert_admin_user(
  p_id          uuid,
  p_username    text,
  p_name        text,
  p_email       text,
  p_role        text,
  p_password    text,
  p_fixed       boolean,
  p_session_role text,
  p_session_user_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing record;
  v_hash     text;
BEGIN
  -- Only Super Admin can manage users
  IF p_session_role != 'Super Admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Hanya Super Admin yang dapat mengelola pengguna');
  END IF;

  -- Check if fixed admin trying to be modified
  SELECT id, fixed INTO v_existing FROM admin_users WHERE id = p_id;
  IF v_existing.fixed = true AND p_fixed = false THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Akun tetap tidak dapat dimodifikasi');
  END IF;

  -- Hash password if provided
  IF p_password IS NOT NULL AND length(p_password) >= 8 THEN
    v_hash := 'pbkdf2_sha512$310240$' ||
      encode(gen_salt('bf'), 'base64') ||
      '$' ||
      encode(subprocess_encode(checksum(encode(p_password::bytea, 'utf8'), 'sha2_512'), 'hex'), 'base64');
  END IF;

  INSERT INTO admin_users (id, username, name, email, role, password_hash, fixed, updated_at)
  VALUES (p_id, p_username, p_name, p_email, p_role,
    CASE WHEN v_hash IS NOT NULL THEN v_hash ELSE password_hash END,
    p_fixed, NOW())
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    password_hash = COALESCE(NULLIF(EXCLUDED.password_hash, admin_users.password_hash), admin_users.password_hash),
    updated_at = NOW()
  RETURNING id INTO v_existing;

  RETURN jsonb_build_object('ok', true, 'id', v_existing.id);
END;
$$;

REVOKE ALL ON FUNCTION upsert_admin_user(uuid, text, text, text, text, text, boolean, text, text) FROM anon;
REVOKE ALL ON FUNCTION upsert_admin_user(uuid, text, text, text, text, text, boolean, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION upsert_admin_user(uuid, text, text, text, text, text, boolean, text, text) TO service_role;

-- ============================================================
-- STEP 7: Atomic OTP Verification
-- File: 049_warga_otp_atomic_verify.sql
-- ============================================================

CREATE OR REPLACE FUNCTION verify_warga_otp(p_nik char(16), p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request  record;
  v_session  text;
BEGIN
  -- Find valid OTP request
  SELECT id, expires_at INTO v_request
  FROM otp_requests
  WHERE nik = p_nik
    AND code = p_code
    AND verified = false
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kode OTP tidak valid atau sudah kadaluarsa');
  END IF;

  -- Mark as verified (in transaction)
  UPDATE otp_requests SET verified = true WHERE id = v_request.id;

  -- Create session token
  v_session := encode(gen_random_bytes(32), 'hex');

  INSERT INTO warga_sessions (nik, token, expires_at, created_at)
  VALUES (p_nik, v_session, NOW() + INTERVAL '7 days', NOW());

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_session,
    'expires_at', NOW() + INTERVAL '7 days'
  );
END;
$$;

REVOKE ALL ON FUNCTION verify_warga_otp(char, text) FROM anon;
REVOKE ALL ON FUNCTION verify_warga_otp(char, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION verify_warga_otp(char, text) TO service_role;

-- ============================================================
-- DONE: Verification
-- ============================================================

SELECT
  'revoked_sessions'        as table_name,
  (SELECT count(*) FROM revoked_sessions) as row_count
UNION ALL
SELECT
  'submission_rate_limit',
  (SELECT count(*) FROM submission_rate_limit)
UNION ALL
SELECT
  'otp_rate_limits',
  (SELECT count(*) FROM otp_rate_limits)
UNION ALL
SELECT
  'admin_users',
  (SELECT count(*) FROM admin_users)
UNION ALL
SELECT
  'surat_requests',
  (SELECT count(*) FROM surat_requests);