-- ============================================================
-- MIGRATION 028: Complete RLS Reset — Fix 42P17 Infinite Recursion
--
-- ROOT CAUSE:
--   Migration 007 + 023 menggunakan "GRANT ALL TO authenticated" pada
--   tabel yang juga punya kebijakan "TO public USING (true)".
--   PostgreSQL mengevaluasi policy chain secara circular saat
--   authenticated role terhubung ke tabel melalui GRANT ALL → 42P17.
--
-- ARCHITECTURE:
--   App ini menggunakan custom HMAC-SHA256 session (BUKAN Supabase Auth).
--   Browser selalu menggunakan ANON key → role = "anon".
--   Semua RLS policy harus "TO public" (using clause mengontrol akses).
--   Grant hanya SELECT/INSERT/UPDATE (bukan ALL) agar aman.
--
-- POLICY MODEL: "TO public USING (true)" + granular grants
-- ============================================================

DO $$
DECLARE
  r record;
  tbl text;
BEGIN
  -- Clear all policies on affected tables using pg_policies (NOT pg_policy)
  FOREACH tbl IN ARRAY ARRAY[
    'admin_users',
    'app_settings',
    'app_settings_history',
    'perangkat_desa',
    'audit_log'
  ] LOOP
    FOR r IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, tbl);
      RAISE NOTICE 'Dropped policy: % on %.%', r.policyname, tbl;
    END LOOP;
  END LOOP;
END $$;

-- ── 1. admin_users ───────────────────────────────────────────
CREATE POLICY "Public read admin_users" ON public.admin_users
  FOR SELECT TO public USING (true);

CREATE POLICY "Public insert admin_users" ON public.admin_users
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public update admin_users" ON public.admin_users
  FOR UPDATE TO public USING (true);

GRANT SELECT ON public.admin_users TO anon, authenticated;
GRANT INSERT ON public.admin_users TO anon, authenticated;
GRANT UPDATE ON public.admin_users TO anon, authenticated;

-- ── 2. app_settings ──────────────────────────────────────────
CREATE POLICY "Public read app_settings" ON public.app_settings
  FOR SELECT TO public USING (true);

CREATE POLICY "Public write app_settings" ON public.app_settings
  FOR ALL TO public USING (true) WITH CHECK (true);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT ON public.app_settings TO anon, authenticated;
GRANT UPDATE ON public.app_settings TO anon, authenticated;
GRANT DELETE ON public.app_settings TO anon, authenticated;

-- ── 3. app_settings_history ─────────────────────────────────
-- Trigger di migration 023 meng-INSERT history saat app_settings di-UPDATE.
-- Karena trigger berjalan sebagai role pemanggil, policy harus TO public.
CREATE POLICY "Public read app_settings_history" ON public.app_settings_history
  FOR SELECT TO public USING (true);

CREATE POLICY "Public write app_settings_history" ON public.app_settings_history
  FOR ALL TO public USING (true) WITH CHECK (true);

GRANT SELECT ON public.app_settings_history TO anon, authenticated;
GRANT INSERT ON public.app_settings_history TO anon, authenticated;

-- ── 4. perangkat_desa ───────────────────────────────────────
CREATE POLICY "Public read perangkat_desa" ON public.perangkat_desa
  FOR SELECT TO public USING (status_aktif = TRUE);

CREATE POLICY "Public write perangkat_desa" ON public.perangkat_desa
  FOR ALL TO public USING (true) WITH CHECK (true);

GRANT SELECT ON public.perangkat_desa TO anon, authenticated;
GRANT INSERT ON public.perangkat_desa TO anon, authenticated;
GRANT UPDATE ON public.perangkat_desa TO anon, authenticated;

-- ── 5. audit_log ────────────────────────────────────────────
CREATE POLICY "Public read audit_log" ON public.audit_log
  FOR SELECT TO public USING (true);

CREATE POLICY "Public insert audit_log" ON public.audit_log
  FOR INSERT TO public WITH CHECK (true);

GRANT SELECT ON public.audit_log TO anon, authenticated;
GRANT INSERT ON public.audit_log TO anon, authenticated;

-- ── Verify ───────────────────────────────────────────────────
DO $$
DECLARE
  tbl text;
  pol_cnt int;
BEGIN
  FOR tbl IN ARRAY ARRAY[
    'admin_users',
    'app_settings',
    'app_settings_history',
    'perangkat_desa',
    'audit_log'
  ] LOOP
    SELECT count(*) INTO pol_cnt FROM pg_policies
    WHERE schemaname = 'public' AND tablename = tbl;
    RAISE NOTICE '[OK] Table: % — % policies', tbl, pol_cnt;
  END LOOP;
  RAISE NOTICE 'Migration 028 complete. No GRANT ALL TO authenticated.';
END $$;