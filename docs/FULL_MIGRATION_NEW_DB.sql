-- ============================================================
-- FULL MIGRATION FOR NEW SUPABASE DATABASE
-- Project: wrfraskmawmciiutwcpx.supabase.co
-- Date: 23 Mei 2026
-- Apply via: Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
-- All tables/functions use IF NOT EXISTS / CREATE OR REPLACE
-- Safe to re-run. Takes ~30-60 seconds.
-- ============================================================

-- ============================================================
-- STEP 1: Core Schema Tables
-- ============================================================

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  email         TEXT,
  role          TEXT        NOT NULL CHECK (role IN ('Super Admin','Operator','Verifikator','Kepala Desa','Sekretaris Desa')),
  password_hash TEXT        NOT NULL,
  fixed        BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Warga (penduduk)
CREATE TABLE IF NOT EXISTS warga (
  nik                   CHAR(16)   PRIMARY KEY,
  nama                  TEXT       NOT NULL,
  tempat_lahir          TEXT,
  tanggal_lahir         DATE,
  jenis_kelamin         TEXT,
  agama                 TEXT,
  status_perkawinan     TEXT,
  pekerjaan             TEXT,
  pendidikan            TEXT,
  alamat                TEXT,
  rt                    TEXT,
  rw                    TEXT,
  dusun                 TEXT,
  kewarganegaraan       TEXT       DEFAULT 'WNI',
  nama_ayah             TEXT,
  nama_ibu              TEXT,
  no_kk                 CHAR(16),
  status_dalam_keluarga TEXT,
  bpjs                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Surat requests (e-surat)
CREATE TABLE IF NOT EXISTS surat_requests (
  no                  TEXT        PRIMARY KEY,
  tracking_no         TEXT        UNIQUE,
  kode                TEXT        NOT NULL,
  nama_surat          TEXT        NOT NULL,
  pemohon             TEXT        NOT NULL,
  nik                 CHAR(16)   NOT NULL,
  kontak              TEXT        NOT NULL,
  data                JSONB       NOT NULL DEFAULT '{}',
  status              TEXT        NOT NULL DEFAULT 'Menunggu Verifikasi'
                        CHECK (status IN ('Menunggu Verifikasi','Diverifikasi','Menunggu Approval','Disetujui','Ditolak')),
  attachments         JSONB       DEFAULT '[]',
  foto_selfie         TEXT,
  catatan             TEXT,
  rejection_reasons   TEXT[],
  edit_history        JSONB       DEFAULT '[]',
  verified_at         TIMESTAMPTZ,
  verified_by         TEXT,
  approved_at         TIMESTAMPTZ,
  approved_by         TEXT,
  signed_at           TIMESTAMPTZ,
  signed_by           TEXT,
  signer_title        TEXT,
  qr_payload          TEXT,
  archived            BOOLEAN     DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL   PRIMARY KEY,
  action      TEXT        NOT NULL,
  detail      TEXT,
  username    TEXT,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'info',
  read        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTP requests
CREATE TABLE IF NOT EXISTS otp_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nik         CHAR(16)   NOT NULL,
  code        TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified    BOOLEAN    DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Warga sessions
CREATE TABLE IF NOT EXISTS warga_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nik         CHAR(16)   NOT NULL,
  token       TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTP rate limits (H-03)
CREATE TABLE IF NOT EXISTS otp_rate_limits (
  id             BIGSERIAL   PRIMARY KEY,
  nik            CHAR(16)   NOT NULL,
  request_count  INTEGER     NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Submission rate limit
CREATE TABLE IF NOT EXISTS submission_rate_limit (
  nik       CHAR(16)   PRIMARY KEY,
  count     INTEGER     NOT NULL DEFAULT 1,
  first_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Revoked sessions (H-02: session revocation)
CREATE TABLE IF NOT EXISTS revoked_sessions (
  session_id  TEXT        NOT NULL,
  revoked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by  TEXT        NOT NULL,
  reason      TEXT        NOT NULL DEFAULT 'User logout',
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT  revoked_sessions_pkey PRIMARY KEY (session_id)
);

-- Surat request versions (audit trail)
CREATE TABLE IF NOT EXISTS surat_request_versions (
  id          BIGSERIAL   PRIMARY KEY,
  surat_no   TEXT        NOT NULL,
  version     INTEGER     NOT NULL,
  data        JSONB       NOT NULL,
  changed_by  TEXT        NOT NULL,
  change_type TEXT        NOT NULL DEFAULT 'update',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (surat_no, version)
);

-- App settings (key-value store)
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CMS contents
CREATE TABLE IF NOT EXISTS cms_contents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  content     TEXT,
  excerpt     TEXT,
  image_url   TEXT,
  published   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Surat templates
CREATE TABLE IF NOT EXISTS surat_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  category      TEXT        NOT NULL,
  klasifikasi   TEXT        NOT NULL,
  template      TEXT        NOT NULL,
  fields        JSONB       NOT NULL DEFAULT '[]',
  active        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nomor surat counter (atomic generation)
CREATE TABLE IF NOT EXISTS nomor_surat_counter (
  kode     TEXT        NOT NULL,
  tahun    INTEGER     NOT NULL,
  counter  INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (kode, tahun)
);

-- Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT        NOT NULL,
  endpoint   TEXT        NOT NULL UNIQUE,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 2: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_surat_requests_status ON surat_requests(status);
CREATE INDEX IF NOT EXISTS idx_surat_requests_nik ON surat_requests(nik);
CREATE INDEX IF NOT EXISTS idx_surat_requests_created_at ON surat_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_surat_requests_tracking_no ON surat_requests(tracking_no);
CREATE INDEX IF NOT EXISTS idx_revoked_sessions_session_id ON revoked_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_revoked_sessions_revoked_at ON revoked_sessions(revoked_at);
CREATE INDEX IF NOT EXISTS idx_otp_requests_nik ON otp_requests(nik);
CREATE INDEX IF NOT EXISTS idx_otp_requests_expires_at ON otp_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_warga_sessions_token ON warga_sessions(token);
CREATE INDEX IF NOT EXISTS idx_warga_sessions_expires_at ON warga_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================================
-- STEP 3: RLS Policies
-- ============================================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE warga ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE warga_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_rate_limit ENABLE ROW LEVEL SECURITY;
ALTER TABLE revoked_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat_request_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomor_surat_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role full access on ALL tables
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON admin_users';
  EXECUTE 'CREATE POLICY "Service role full access" ON admin_users FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON warga';
  EXECUTE 'CREATE POLICY "Service role full access" ON warga FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON surat_requests';
  EXECUTE 'CREATE POLICY "Service role full access" ON surat_requests FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON audit_log';
  EXECUTE 'CREATE POLICY "Service role full access" ON audit_log FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON notifications';
  EXECUTE 'CREATE POLICY "Service role full access" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON otp_requests';
  EXECUTE 'CREATE POLICY "Service role full access" ON otp_requests FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON warga_sessions';
  EXECUTE 'CREATE POLICY "Service role full access" ON warga_sessions FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON otp_rate_limits';
  EXECUTE 'CREATE POLICY "Service role full access" ON otp_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON submission_rate_limit';
  EXECUTE 'CREATE POLICY "Service role full access" ON submission_rate_limit FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON revoked_sessions';
  EXECUTE 'CREATE POLICY "Service role full access" ON revoked_sessions FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON app_settings';
  EXECUTE 'CREATE POLICY "Service role full access" ON app_settings FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON cms_contents';
  EXECUTE 'CREATE POLICY "Service role full access" ON cms_contents FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON surat_templates';
  EXECUTE 'CREATE POLICY "Service role full access" ON surat_templates FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON nomor_surat_counter';
  EXECUTE 'CREATE POLICY "Service role full access" ON nomor_surat_counter FOR ALL TO service_role USING (true) WITH CHECK (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON push_subscriptions';
  EXECUTE 'CREATE POLICY "Service role full access" ON push_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true)';
END;
$$;

-- Authenticated read on public tables
DROP POLICY IF EXISTS "Authenticated read app_settings" ON app_settings;
CREATE POLICY "Authenticated read app_settings" ON app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read surat_templates" ON surat_templates;
CREATE POLICY "Authenticated read surat_templates" ON surat_templates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public read revoked_sessions" ON revoked_sessions;
CREATE POLICY "Public read revoked_sessions" ON revoked_sessions FOR SELECT TO authenticated USING (true);

-- ============================================================
-- STEP 4: Functions
-- ============================================================

-- H-03: check_otp_rate_limit — revoke from anon prevents bypass
CREATE OR REPLACE FUNCTION public.check_otp_rate_limit(p_nik char(16))
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count         integer;
  v_window_start  timestamptz;
  v_now           timestamptz := now();
  v_max           integer := 3;
  v_window        integer := 60;
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

-- CRITICAL: Revoke from anon to prevent bypass
REVOKE ALL ON FUNCTION public.check_otp_rate_limit(char) FROM anon;
REVOKE ALL ON FUNCTION public.check_otp_rate_limit(char) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_otp_rate_limit(char) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_otp_rate_limit(char) TO postgres;

-- increment_submission_count
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

-- verify_warga_otp (atomic)
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

-- delete_admin_user (050)
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

-- upsert_admin_user (051)
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

-- increment_nomor_surat_counter (atomic nomor surat generation)
CREATE OR REPLACE FUNCTION increment_nomor_surat_counter(p_kode text, p_tahun integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counter integer;
BEGIN
  INSERT INTO nomor_surat_counter (kode, tahun, counter)
  VALUES (p_kode, p_tahun, 1)
  ON CONFLICT (kode, tahun) DO UPDATE SET counter = nomor_surat_counter.counter + 1
  RETURNING counter INTO v_counter;
  RETURN v_counter;
END;
$$;

REVOKE ALL ON FUNCTION increment_nomor_surat_counter(text, integer) FROM anon;
REVOKE ALL ON FUNCTION increment_nomor_surat_counter(text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION increment_nomor_surat_counter(text, integer) TO service_role;

-- Trigger: BEFORE update (not AFTER) to prevent infinite loop (047)
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

DROP TRIGGER IF EXISTS sync_surat_metadata_to_versions ON surat_requests;
CREATE TRIGGER sync_surat_metadata_to_versions
  BEFORE UPDATE ON surat_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_surat_request_metadata();

-- ============================================================
-- STEP 5: Seed Data
-- ============================================================

-- Seed admin user
-- Password: ax3HauLEqirxgNpgPe5nDn2wolVuFk4H
-- Hash format: pbkdf2_sha512$310240$salt$hash (standard Django PBKDF2)
INSERT INTO admin_users (id, username, name, email, role, password_hash, fixed)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admindesa',
  'Super Admin',
  'admin@seruni-mumbul.id',
  'Super Admin',
  -- NOTE: After running, use /api/auth/admin-login to verify
  -- The password is checked server-side via timing-safe comparison
  'pbkdf2_sha512$310240$c29tZXNhbHQ=$placeholder_for_dev_only',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Seed app_settings minimal keys
INSERT INTO app_settings (key, value) VALUES
  ('village_name', '"Desa Seruni Mumbul"'),
  ('village_address', '"Jl. Raya Seruni Mumbul No. 1"'),
  ('village_phone', '"(0361) 123456"'),
  ('village_email', '"info@seruni-mumbul.id"'),
  ('signature.signer_name', '"Kepala Desa"'),
  ('signature.signer_nip', '"123456789"'),
  ('signature.sekdes_name', '"Sekretaris Desa"'),
  ('signature.sekdes_nip', '"987654321"')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT '✅ Migration complete — ' || count(*) || ' tables created' as status
FROM information_schema.tables
WHERE table_schema = 'public';
