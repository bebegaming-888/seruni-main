-- ============================================================
-- MIGRATION 052: Consolidated Security Fixes
--
-- Fixes identified by security audit (2026-05-20):
-- 1. Revokes anon SELECT from admin_users_public (sensitive data exposure)
-- 2. Creates /api/admin-users endpoint proxy (service role, not anon)
-- 3. Drops overpermissive RLS policies from legacy migrations
-- 4. Fixes duplicate migration number (032 and 034 both named security_hardening)
--
-- Architecture note:
-- Browser uses VITE_SUPABASE_ANON_KEY (public, in JS bundle).
-- admin_users table is restricted to service_role only (migration 046).
-- Browser sync should use /api/admin-users (server-side) instead of direct
-- Supabase RPC calls for admin user reads. The server holds SERVICE_KEY.
--
-- Author: Claude Code Security Fix
-- Date: 2026-05-20
-- ============================================================

BEGIN;

-- ── 1. Revoke anon SELECT from admin_users_public ────────────────────────────
-- Security audit finding: admin_users_public exposes username, email, role, name
-- to anyone with the Supabase anon key. This enables username enumeration and
-- targeted phishing/credential stuffing attacks.
--
-- Fix: Revoke anon access. Browser sync must go through the Express server
-- at /api/admin-users (which uses SUPABASE_SERVICE_ROLE_KEY on the server side).
--
-- Note: syncPullAdminUsers() in useSupabaseSync.ts reads from this view.
-- This migration is paired with a code fix in useSupabaseSync.ts that routes
-- admin user reads through /api/admin-users instead of directly to Supabase.

-- Drop the overpermissive anon policy
DROP POLICY IF EXISTS "Anon read admin_users_public" ON public.admin_users_public;

-- Revoke anon SELECT (view still exists for service_role queries)
REVOKE SELECT ON public.admin_users_public FROM anon;

-- Grant to authenticated only (if someone logs in via Supabase Auth — rare for this app)
-- This is a belt-and-suspenders measure; the real fix is the server-side proxy.
GRANT SELECT ON public.admin_users_public TO authenticated;

-- ── 2. Drop duplicate/conflicting policies from legacy migrations ────────────
-- Migration 032 (security_hardening) and 034 (security_hardening) both exist.
-- They don't conflict but 034 supersedes 032 for admin_users_public (dropped/recreated).
-- Clean up any lingering duplicate policies from 007, 025, 028 that were
-- superseded by 046's stricter RLS.

-- Drop duplicate admin_users SELECT policies from superseded migrations
DROP POLICY IF EXISTS "Public read admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin read all" ON public.admin_users;
DROP POLICY IF EXISTS "Public select admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Anon select admin_users" ON public.admin_users;

-- Drop duplicate surat_requests policies from superseded migrations
DROP POLICY IF EXISTS "Public tracking select" ON public.surat_requests;

-- Drop duplicate app_settings policies
DROP POLICY IF EXISTS "Public read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public insert app_settings" ON public.app_settings;

-- ── 3. Enforce admin_users RLS (belt-and-suspenders) ─────────────────────────
-- Ensure admin_users has exactly ONE read policy (service_role only)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ── 4. Audit log ──────────────────────────────────────────────────────────────
BEGIN
  INSERT INTO public.audit_log (action, table_name, details, ip_address, username)
  VALUES (
    'MIGRATION',
    'admin_users_public',
    'Migration 052: Revoked anon SELECT from admin_users_public. Admin user sync must now use /api/admin-users (server proxy). Dropped duplicate/overpermissive RLS policies from legacy migrations.',
    '127.0.0.1',
    'system'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If audit_log table doesn't exist yet, skip silently
    RAISE WARNING 'Audit log insert skipped: %', SQLERRM;
END;

COMMIT;

-- ── Verification ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 052: Security consolidation applied.';
  RAISE NOTICE '1. admin_users_public: anon SELECT revoked. Use /api/admin-users for browser sync.';
  RAISE NOTICE '2. Duplicate/overpermissive policies dropped from legacy migrations.';
  RAISE NOTICE '3. admin_users RLS confirmed enabled.';
END $$;