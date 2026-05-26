-- ============================================================
-- MIGRATION 034: Security Hardening — Marketplace & Admin
--
-- M-07: Fix marketplace_orders RLS — marketplace not yet active
--       All public SELECT/UPDATE policies use USING(true) — anyone
--       on the internet can read ALL orders. Fix: disable RLS until
--       the feature is properly gated.
--
-- M-08: Create admin_users_public safe view — ensures password
--       hash is NEVER exposed via any API response.
-- ============================================================

BEGIN;

-- ── M-07: Marketplace orders — disable public access ────────────────────────
-- Since marketplace is not yet active (GOALS.md), disable all public
-- access to prevent data leakage. Service role retains full access.

-- Drop all public-facing policies (only service_role can access via service key)
DROP POLICY IF EXISTS "orders_public_select"    ON public.marketplace_orders;
DROP POLICY IF EXISTS "orders_public_insert"    ON public.marketplace_orders;
DROP POLICY IF EXISTS "orders_service_update"   ON public.marketplace_orders;
DROP POLICY IF EXISTS "orders_service_delete"   ON public.marketplace_orders;

DROP POLICY IF EXISTS "order_items_public_insert" ON public.marketplace_order_items;
DROP POLICY IF EXISTS "order_items_public_select" ON public.marketplace_order_items;
DROP POLICY IF EXISTS "order_items_service_delete" ON public.marketplace_order_items;

-- Disable RLS until marketplace is properly implemented with auth gating
ALTER TABLE public.marketplace_orders     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_order_items DISABLE ROW LEVEL SECURITY;

-- ── M-08: Safe admin_users view (no password) ────────────────────────────────
-- The admin_users table contains a password_hash column. Create a safe view
-- that explicitly lists only non-sensitive columns.
-- This prevents accidental password exposure via any SELECT * query.

DROP VIEW IF EXISTS public.admin_users_public;
CREATE VIEW public.admin_users_public AS
  SELECT
    id,
    username,
    name,
    email,
    role,
    fixed,
    created_at,
    updated_at
  FROM public.admin_users;

-- Restrict direct table access: service_role only (no public anon access)
-- Drop any existing public SELECT policies first
DROP POLICY IF EXISTS "Public read admin_users"  ON public.admin_users;
DROP POLICY IF EXISTS "Admin read admin_users"   ON public.admin_users;

-- Only service_role can read admin_users table directly
CREATE POLICY "Service role read admin_users" ON public.admin_users
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Ensure RLS is enabled
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

COMMIT;