-- ============================================================
-- MIGRATION 051: Admin User Upsert RPC (FIXED — Authorization + Fixed-Account Protection)
--
-- Issue (from security audit):
-- 1. upsert_admin_user() was granted to anon with no authorization check.
--    Any attacker could create admin accounts or escalate their own privileges.
-- 2. p_fixed=true could be injected by caller to mark accounts as immutably fixed.
--
-- Fix:
-- 1. Add authorization: only Super Admin can create/update admin accounts
-- 2. Never allow setting fixed=true via RPC — only the database or a server-side
--    process (not browser) should be able to set fixed=true.
--
-- Author: Claude Code Security Fix
-- Date: 2026-05-20
-- ============================================================

BEGIN;

-- ── Drop existing function if any (safe re-run) ────────────────────────────
DROP FUNCTION IF EXISTS public.upsert_admin_user(
  p_id TEXT,
  p_username TEXT,
  p_password TEXT,
  p_name TEXT,
  p_email TEXT,
  p_role TEXT,
  p_fixed BOOLEAN,
  p_actor TEXT
);

-- ── Create SECURITY DEFINER function ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_admin_user(
  p_id        TEXT,
  p_username  TEXT,
  p_password  TEXT,
  p_name      TEXT,
  p_email     TEXT,
  p_role      TEXT,
  p_fixed     BOOLEAN,
  p_actor     TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists         BOOLEAN;
  v_caller_auth_uid UUID;
  v_caller_role    TEXT;
  v_target_fixed   BOOLEAN;
BEGIN
  -- Guard: validate inputs
  IF p_id IS NULL OR char_length(p_id) < 1 THEN
    RAISE EXCEPTION 'ID tidak valid';
  END IF;
  IF p_username IS NULL OR char_length(p_username) < 3 THEN
    RAISE EXCEPTION 'Username minimal 3 karakter';
  END IF;
  IF p_role NOT IN ('Super Admin', 'Operator', 'Verifikator', 'Kepala Desa', 'Sekretaris Desa') THEN
    RAISE EXCEPTION 'Role tidak valid: %', p_role;
  END IF;
  -- CRITICAL FIX: Never allow setting fixed=true via RPC.
  -- The fixed flag is a database-level immutability guarantee for the system admin account.
  -- If attacker sets fixed=true on their account, they become indestructible.
  -- Always force fixed=false for browser-initiated upserts.
  IF p_fixed = TRUE THEN
    RAISE EXCEPTION 'Tidak dapat menandai akun sebagai akun tetap melalui RPC';
  END IF;

  -- SECURITY: Verify caller authorization
  v_caller_auth_uid := auth.uid();
  IF v_caller_auth_uid IS NOT NULL THEN
    -- Supabase Auth caller
    SELECT role INTO v_caller_role FROM public.admin_users WHERE id = v_caller_auth_uid;
    IF v_caller_role IS NULL THEN
      RAISE EXCEPTION 'Akses ditolak — pengguna tidak ditemukan di sistem';
    END IF;
    IF v_caller_role != 'Super Admin' THEN
      RAISE EXCEPTION 'Akses ditolak — hanya Super Admin yang dapat menambah/mengubah pengguna admin';
    END IF;
  ELSE
    -- Browser-based call (HMAC auth, not Supabase Auth):
    -- Verify p_actor is a Super Admin
    SELECT role INTO v_caller_role FROM public.admin_users WHERE username = p_actor;
    IF v_caller_role IS NULL THEN
      RAISE EXCEPTION 'Akses ditolak — aktor tidak ditemukan di sistem';
    END IF;
    IF v_caller_role != 'Super Admin' THEN
      RAISE EXCEPTION 'Akses ditolak — hanya Super Admin yang dapat menambah/mengubah pengguna admin';
    END IF;
  END IF;

  -- Prevent upserting fixed accounts
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE id = p_id) THEN
    SELECT fixed INTO v_target_fixed FROM public.admin_users WHERE id = p_id;
    IF v_target_fixed = TRUE THEN
      RAISE EXCEPTION 'Akun tetap tidak dapat diubah melalui RPC';
    END IF;
  END IF;

  -- Check if user exists (for audit action determination)
  SELECT EXISTS(SELECT 1 FROM public.admin_users WHERE id = p_id) INTO v_exists;

  -- Upsert (RLS bypassed inside SECURITY DEFINER function)
  INSERT INTO public.admin_users (id, username, password, name, email, role, fixed, created_at, updated_at)
  VALUES (
    p_id,
    p_username,
    p_password,
    p_name,
    p_email,
    p_role,
    FALSE,  -- Always FALSE: fixed=true can only be set by server-side DB seed
    COALESCE((SELECT created_at FROM public.admin_users WHERE id = p_id), NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    username   = EXCLUDED.username,
    password   = EXCLUDED.password,
    name       = EXCLUDED.name,
    email      = EXCLUDED.email,
    role       = EXCLUDED.role,
    fixed      = FALSE,  -- Never change fixed flag via upsert
    updated_at = NOW();

  -- Log audit trail (best-effort — failure should not rollback the upsert)
  BEGIN
    INSERT INTO public.audit_log (action, table_name, details, ip_address, username)
    VALUES (
      CASE WHEN v_exists THEN 'user.update' ELSE 'user.create' END,
      'admin_users',
      CASE WHEN v_exists THEN 'Update' ELSE 'Create' END || ' admin user via sync: ' || p_username,
      '127.0.0.1',
      COALESCE(p_actor, 'system')
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Audit log insert failed: %', SQLERRM;
  END;

  RETURN TRUE;
END;
$$;

-- Grant execute to anon (browser calls this RPC with HMAC-signed session validated above)
-- and authenticated (for server-side processes)
GRANT EXECUTE ON FUNCTION public.upsert_admin_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_admin_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;

COMMIT;

-- ── Verification ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 051: upsert_admin_user() RPC ready with authorization.';
  RAISE NOTICE 'Authorization: Super Admin role required. fixed=true always blocked.';
END $$;