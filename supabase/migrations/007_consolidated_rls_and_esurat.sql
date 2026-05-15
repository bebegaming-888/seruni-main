-- ============================================================
-- MIGRATION 007: RLS Consolidation & E-Surat Policies
-- Replaces: 007_esurat_security_and_sync + 008_admin_sync_and_rls_fix
-- ============================================================

-- ── Reset ALL policies on affected tables ──
-- admin_users
DROP POLICY IF EXISTS "Admin read all" ON public.admin_users;
DROP POLICY IF EXISTS "Admin insert admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin update admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin read audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Append audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Public insert audit_log" ON public.audit_log;

-- app_settings
DROP POLICY IF EXISTS "Admin write app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public read app_settings" ON public.app_settings;

-- cms_contents
DROP POLICY IF EXISTS "Admin write cms_contents" ON public.cms_contents;
DROP POLICY IF EXISTS "Public read cms_contents" ON public.cms_contents;

-- komoditas
DROP POLICY IF EXISTS "Admin write komoditas" ON public.komoditas;
DROP POLICY IF EXISTS "Public read komoditas" ON public.komoditas;

-- surat_requests
DROP POLICY IF EXISTS "Warga read own requests" ON public.surat_requests;
DROP POLICY IF EXISTS "Admin write surat_requests" ON public.surat_requests;
DROP POLICY IF EXISTS "Admin update surat_requests" ON public.surat_requests;
DROP POLICY IF EXISTS "Admin select all" ON public.surat_requests;
DROP POLICY IF EXISTS "Public tracking select" ON public.surat_requests;
DROP POLICY IF EXISTS "Public insert request" ON public.surat_requests;
DROP POLICY IF EXISTS "Admin insert request" ON public.surat_requests;
DROP POLICY IF EXISTS "Admin update request" ON public.surat_requests;

-- ── admin_users policies (permissive — no Supabase Auth) ──
CREATE POLICY "Admin read all" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Admin insert admin_users" ON public.admin_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update admin_users" ON public.admin_users FOR UPDATE USING (true);

-- ── audit_log policies ──
CREATE POLICY "Admin read audit_log" ON public.audit_log FOR SELECT USING (true);
CREATE POLICY "Public insert audit_log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- ── app_settings policies ──
CREATE POLICY "Admin write app_settings" ON public.app_settings FOR ALL USING (true);
CREATE POLICY "Public read app_settings" ON public.app_settings FOR SELECT USING (true);

-- ── cms_contents policies ──
CREATE POLICY "Admin write cms_contents" ON public.cms_contents FOR ALL USING (true);
CREATE POLICY "Public read cms_contents" ON public.cms_contents FOR SELECT USING (true);

-- ── komoditas policies ──
CREATE POLICY "Admin write komoditas" ON public.komoditas FOR ALL USING (true);
CREATE POLICY "Public read komoditas" ON public.komoditas FOR SELECT USING (true);

-- ── surat_requests policies ──
-- SELECT: admin sees all; public tracks via tracking number
CREATE POLICY "Admin select all" ON public.surat_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public tracking select" ON public.surat_requests
  FOR SELECT TO anon USING (true);

-- INSERT: public creates new request (status must be initial)
CREATE POLICY "Public insert request" ON public.surat_requests
  FOR INSERT TO anon WITH CHECK (status = 'Menunggu Verifikasi');

CREATE POLICY "Admin insert request" ON public.surat_requests
  FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: admin only
CREATE POLICY "Admin update request" ON public.surat_requests
  FOR UPDATE TO authenticated USING (true);

-- ── Add tracking_no column if missing ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'surat_requests' AND column_name = 'tracking_no') THEN
    ALTER TABLE public.surat_requests ADD COLUMN tracking_no text;
  END IF;
END $$;

-- ── RPC for safe public tracking ──
CREATE OR REPLACE FUNCTION public.track_surat(p_no_surat text, p_nik text)
RETURNS SETOF public.surat_requests AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.surat_requests
  WHERE (no_surat = p_no_surat OR tracking_no = p_no_surat)
    AND nik = p_nik;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Grants ──
GRANT SELECT ON public.admin_users TO anon, authenticated;
GRANT ALL ON public.admin_users TO authenticated;

GRANT SELECT ON public.audit_log TO anon, authenticated;
GRANT INSERT ON public.audit_log TO anon, authenticated;

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO authenticated;

GRANT SELECT ON public.cms_contents TO anon, authenticated;
GRANT ALL ON public.cms_contents TO authenticated;

GRANT SELECT ON public.komoditas TO anon, authenticated;
GRANT ALL ON public.komoditas TO authenticated;

GRANT SELECT ON public.surat_requests TO anon, authenticated;
GRANT INSERT ON public.surat_requests TO anon, authenticated;
GRANT ALL ON public.surat_requests TO authenticated;

GRANT EXECUTE ON FUNCTION public.track_surat(text, text) TO anon, authenticated;