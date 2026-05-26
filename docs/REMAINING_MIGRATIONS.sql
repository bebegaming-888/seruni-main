-- ============================================================
-- REMAINING MIGRATIONS — Supabase Production
-- Apply via: SQL Editor → New Query → Paste → Run
-- Date: 23 Mei 2026
--
-- ALREADY EXISTS in production (SKIP these):
--   ✓ revoked_sessions (empty, needs RLS policies)
--   ✓ submission_rate_limit
--   ✓ surat_request_versions
--
-- NEED TO APPLY (remaining fixes):
-- ============================================================

-- ============================================================
-- FIX 1: RLS Policies for revoked_sessions (already exists)
-- Add RLS policies to existing table
-- ============================================================
ALTER TABLE revoked_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON revoked_sessions;
CREATE POLICY "Service role full access" ON revoked_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read for health checks" ON revoked_sessions;
CREATE POLICY "Public read for health checks" ON revoked_sessions
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- FIX 2: OTP Rate Limit Function + RLS (055)
-- Missing from production — creates check_otp_rate_limit function
-- ============================================================
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
  v_window   integer := 60;
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

-- Revoke from anon (CRITICAL SECURITY FIX H-03)
REVOKE ALL ON FUNCTION public.check_otp_rate_limit(char) FROM anon;
REVOKE ALL ON FUNCTION public.check_otp_rate_limit(char) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_otp_rate_limit(char) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_otp_rate_limit(char) TO postgres;

-- ============================================================
-- FIX 3: Infinite Loop Trigger Fix (047)
-- Fixes AFTER→BEFORE to prevent infinite recursion
-- ============================================================
DROP TRIGGER IF EXISTS sync_surat_metadata_to_versions ON surat_requests;

CREATE OR REPLACE FUNCTION public.sync_surat_request_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO surat_request_versions(surat_no, version, data, changed_by, change_type)
    VALUES (
      OLD.no,
      COALESCE((SELECT MAX(version) + 1 FROM surat_request_versions WHERE surat_no = OLD.no), 1),
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
-- FIX 4: Authorized Admin Delete RPC (050)
-- ============================================================
CREATE OR REPLACE FUNCTION delete_admin_user(p_id uuid, p_session_role text, p_session_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
BEGIN
  IF p_session_role != 'Super Admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Hanya Super Admin yang dapat menghapus pengguna');
  END IF;
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
-- FIX 5: Authorized Admin Upsert RPC (051)
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_admin_user(
  p_id uuid, p_username text, p_name text, p_email text, p_role text,
  p_password text, p_fixed boolean, p_session_role text, p_session_user_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing record;
BEGIN
  IF p_session_role != 'Super Admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Hanya Super Admin yang dapat mengelola pengguna');
  END IF;
  SELECT id, fixed INTO v_existing FROM admin_users WHERE id = p_id;
  IF v_existing.fixed = true AND p_fixed = false THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Akun tetap tidak dapat dimodifikasi');
  END IF;
  INSERT INTO admin_users (id, username, name, email, role, fixed, updated_at)
  VALUES (p_id, p_username, p_name, p_email, p_role, p_fixed, NOW())
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = NOW()
  RETURNING id INTO v_existing;
  RETURN jsonb_build_object('ok', true, 'id', v_existing.id);
END;
$$;

REVOKE ALL ON FUNCTION upsert_admin_user(uuid,text,text,text,text,text,boolean,text,text) FROM anon;
REVOKE ALL ON FUNCTION upsert_admin_user(uuid,text,text,text,text,text,boolean,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION upsert_admin_user(uuid,text,text,text,text,text,boolean,text,text) TO service_role;

-- ============================================================
-- FIX 6: Submission Rate Limit Increment RPC
-- ============================================================
CREATE OR REPLACE FUNCTION increment_submission_count(p_nik char(16))
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE submission_rate_limit SET count = count + 1 WHERE nik = p_nik;
END;
$$;

REVOKE ALL ON FUNCTION increment_submission_count(char) FROM anon;
REVOKE ALL ON FUNCTION increment_submission_count(char) FROM authenticated;
GRANT EXECUTE ON FUNCTION increment_submission_count(char) TO service_role;

-- ============================================================
-- FIX 7: Atomic OTP Verification (049)
-- ============================================================
CREATE OR REPLACE FUNCTION verify_warga_otp(p_nik char(16), p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
  v_session text;
BEGIN
  SELECT id, expires_at INTO v_request
  FROM otp_requests
  WHERE nik = p_nik AND code = p_code AND verified = false AND expires_at > NOW()
  ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kode OTP tidak valid atau sudah kadaluarsa');
  END IF;
  UPDATE otp_requests SET verified = true WHERE id = v_request.id;
  v_session := encode(gen_random_bytes(32), 'hex');
  INSERT INTO warga_sessions (nik, token, expires_at, created_at)
  VALUES (p_nik, v_session, NOW() + INTERVAL '7 days', NOW());
  RETURN jsonb_build_object('ok', true, 'token', v_session, 'expires_at', NOW() + INTERVAL '7 days');
END;
$$;

REVOKE ALL ON FUNCTION verify_warga_otp(char, text) FROM anon;
REVOKE ALL ON FUNCTION verify_warga_otp(char, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION verify_warga_otp(char, text) TO service_role;

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'revoked_sessions: OK' as status WHERE EXISTS (SELECT 1 FROM revoked_sessions LIMIT 1);
SELECT 'check_otp_rate_limit: OK' as status WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_otp_rate_limit');
SELECT 'sync_surat_metadata trigger: OK' as status WHERE EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_surat_metadata_to_versions');
SELECT 'delete_admin_user: OK' as status WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_admin_user');
SELECT 'upsert_admin_user: OK' as status WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'upsert_admin_user');
SELECT 'increment_submission_count: OK' as status WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_submission_count');
SELECT 'verify_warga_otp: OK' as status WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'verify_warga_otp');