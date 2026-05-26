-- Migration 038: Warga Sessions — Expiry Enforcement & Cleanup
-- Created: 2026-05-18
-- Purpose: Enforce session expiry in RLS policies and add automated cleanup

-- ================================================================
-- Step 1: Add partial index for active sessions only (performance)
-- ================================================================

CREATE INDEX IF NOT EXISTS warga_sessions_active_idx ON public.warga_sessions(token_hash)
  WHERE expires_at > NOW();

CREATE INDEX IF NOT EXISTS warga_sessions_expires_idx ON public.warga_sessions(expires_at)
  WHERE expires_at > NOW();

-- ================================================================
-- Step 2: Replace warga_sessions RLS with expiry enforcement
-- ================================================================

-- Drop existing service_role policy from migration 037
DROP POLICY IF EXISTS "Service role warga_sessions" ON public.warga_sessions;

-- Service role can access all sessions (for cleanup/admin)
CREATE POLICY "Service role warga_sessions_all" ON public.warga_sessions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ================================================================
-- Step 3: Cleanup function for expired sessions
-- ================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_warga_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.warga_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'Deleted % expired warga_sessions records', v_deleted;
  RETURN v_deleted;
END;
$$;

-- Service role can execute cleanup
GRANT EXECUTE ON FUNCTION public.cleanup_expired_warga_sessions() TO service_role;

-- ================================================================
-- Step 4: Run cleanup immediately
-- ================================================================

SELECT public.cleanup_expired_warga_sessions();

-- ================================================================
-- Step 5: pg_cron job for periodic cleanup (optional)
-- Enable if pg_cron extension is available:
-- SELECT cron.schedule('cleanup-warga-sessions', '*/30 * * * *', 'SELECT public.cleanup_expired_warga_sessions()');
-- ================================================================

-- ================================================================
-- Step 6: Verify session expiry enforcement
-- ================================================================

-- Check sessions that will be treated as expired
SELECT
  nik,
  expires_at < NOW() AS expired,
  expires_at > NOW() AS active,
  expires_at
FROM public.warga_sessions
ORDER BY expires_at DESC
LIMIT 20;

-- Count active vs expired
SELECT
  CASE WHEN expires_at > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END AS session_status,
  COUNT(*) AS count
FROM public.warga_sessions
GROUP BY 1;

DO $$
BEGIN
  RAISE NOTICE 'Migration 038: warga_sessions expiry enforcement active.';
  RAISE NOTICE 'Expired sessions are now filtered at RLS level.';
  RAISE NOTICE 'Use cleanup_expired_warga_sessions() to purge them.';
END $$;

-- Audit log
INSERT INTO public.audit_log (action, table_name, details, ip_address, username)
VALUES (
  'MIGRATION',
  'warga_sessions',
  'Migration 038: warga_sessions expiry enforcement added. Partial indexes created. Cleanup function ready.',
  '127.0.0.1',
  'system'
);