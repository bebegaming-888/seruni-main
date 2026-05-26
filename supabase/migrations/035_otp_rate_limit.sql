-- Migration 035: OTP Rate Limiting (Server-Side Enforcement)
-- Created: 2026-05-18
-- Purpose: Prevent OTP spam/abuse with atomic rate limit checks

-- OTP rate limiting table
CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
  nik         char(16) PRIMARY KEY,
  attempts    int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT NOW(),
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

-- RLS: only service_role can access (no anon/authenticated access)
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role otp_rate_limits" ON public.otp_rate_limits;
CREATE POLICY "Service role otp_rate_limits" ON public.otp_rate_limits
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- RPC function for atomic rate limit check + increment
-- Returns: { "allowed": boolean, "attempts": int, "wait_seconds": int }
CREATE OR REPLACE FUNCTION public.check_otp_rate_limit(p_nik char(16))
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_allowed boolean;
  v_oldest_window timestamptz;
  v_wait_seconds int;
  v_result jsonb;
BEGIN
  -- Clean old records first (>15 min)
  DELETE FROM public.otp_rate_limits
  WHERE window_start < NOW() - INTERVAL '15 minutes';

  -- Get the oldest window_start for this NIK in the last 15 minutes
  SELECT window_start INTO v_oldest_window
  FROM public.otp_rate_limits
  WHERE nik = p_nik
    AND window_start > NOW() - INTERVAL '15 minutes'
  ORDER BY window_start ASC
  LIMIT 1;

  -- Count recent attempts
  SELECT COALESCE(attempts, 0) INTO v_count
  FROM public.otp_rate_limits
  WHERE nik = p_nik
    AND window_start > NOW() - INTERVAL '15 minutes';

  -- Calculate wait time if rate limited
  IF v_count >= 3 THEN
    v_allowed := false;
    v_wait_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_oldest_window + INTERVAL '15 minutes' - NOW()))::int);
  ELSE
    v_allowed := true;
    v_wait_seconds := 0;

    -- Insert or update rate limit record (atomic upsert)
    INSERT INTO public.otp_rate_limits (nik, attempts, window_start, updated_at)
    VALUES (p_nik, 1, NOW(), NOW())
    ON CONFLICT (nik) DO UPDATE SET
      attempts = public.otp_rate_limits.attempts + 1,
      window_start = CASE
        WHEN public.otp_rate_limits.window_start < NOW() - INTERVAL '15 minutes'
        THEN NOW()
        ELSE public.otp_rate_limits.window_start
      END,
      updated_at = NOW();

    -- Re-fetch the count after increment
    SELECT attempts INTO v_count
    FROM public.otp_rate_limits
    WHERE nik = p_nik;
  END IF;

  v_result := jsonb_build_object(
    'allowed', v_allowed,
    'attempts', v_count,
    'wait_seconds', v_wait_seconds
  );

  RETURN v_result;
END;
$$;

-- Grant execute to anon (this is the ONLY way anon can interact with rate limits)
GRANT EXECUTE ON FUNCTION public.check_otp_rate_limit(char(16)) TO anon;
GRANT EXECUTE ON FUNCTION public.check_otp_rate_limit(char(16)) TO authenticated;

-- Index for cleanup performance
CREATE INDEX IF NOT EXISTS otp_rate_limits_window_idx
  ON public.otp_rate_limits(window_start)
  WHERE window_start > NOW() - INTERVAL '15 minutes';

-- Audit log
INSERT INTO public.audit_log (action, table_name, details, ip_address, username)
VALUES (
  'MIGRATION',
  'otp_rate_limits',
  'Created OTP rate limiting table with atomic check function (max 3 OTP per 15min)',
  '127.0.0.1',
  'system'
);
