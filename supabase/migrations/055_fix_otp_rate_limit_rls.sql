-- Migration: 055_fix_otp_rate_limit_rls.sql
-- Date: 2026-05-22
-- Security Fix: Create OTP rate limit function (if not exists) and revoke from anon role
-- to prevent bypass attacks via direct Supabase REST calls

-- Step 1: Create the function (if it doesn't exist yet)
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

-- Step 2: Revoke execute permission from anon and authenticated roles
-- Only service_role should be able to call this function
REVOKE EXECUTE ON FUNCTION public.check_otp_rate_limit(char(16)) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_otp_rate_limit(char(16)) FROM authenticated;

-- Grant only to service_role
GRANT EXECUTE ON FUNCTION public.check_otp_rate_limit(char(16)) TO service_role;

-- Add comment explaining the security rationale
COMMENT ON FUNCTION public.check_otp_rate_limit(char(16)) IS
  'Rate limit check for OTP requests. Only callable by service_role to prevent bypass attacks.';
