-- Migration 053: Surat Submit Security — Rate Limit + Version Audit Trail
-- Created: 2026-05-21
-- Purpose: Server-side captcha validation (via submit-surat endpoint),
-- rate limiting, and document version audit trail

-- ── Rate Limiting Table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.submission_rate_limit (
  nik        text PRIMARY KEY,
  count      int NOT NULL DEFAULT 1,
  first_at   timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.submission_rate_limit IS
  'Rate limiting: max 3 submissions per NIK per 24 hours';

-- Cleanup: reset count if first_at is older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_submission_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.first_at < NOW() - INTERVAL '24 hours' THEN
    DELETE FROM public.submission_rate_limit WHERE nik = NEW.nik;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_submission_rate_limit_trigger ON public.submission_rate_limit;
CREATE TRIGGER cleanup_submission_rate_limit_trigger
  BEFORE INSERT ON public.submission_rate_limit
  FOR EACH ROW EXECUTE FUNCTION cleanup_submission_rate_limit();

-- Increment count RPC
CREATE OR REPLACE FUNCTION public.increment_submission_count(p_nik text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.submission_rate_limit
  SET count = count + 1
  WHERE nik = p_nik;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_submission_count(text) TO service_role;

-- ── Surat Request Versions (Audit Trail) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.surat_request_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surat_no    text NOT NULL,
  version     int NOT NULL,
  data        jsonb NOT NULL,
  changed_by  text NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT NOW(),
  change_type text NOT NULL CHECK (change_type IN ('created', 'field_update', 'status_change'))
);

COMMENT ON TABLE public.surat_request_versions IS
  'Audit trail for every surat_requests change. Auto-populated via trigger.';

-- Index for fast lookup by surat_no
CREATE INDEX IF NOT EXISTS surat_request_versions_surat_no_idx
  ON public.surat_request_versions (surat_no);

-- Index for user audit lookups
CREATE INDEX IF NOT EXISTS surat_request_versions_changed_by_idx
  ON public.surat_request_versions (changed_by);

CREATE INDEX IF NOT EXISTS surat_request_versions_changed_at_idx
  ON public.surat_request_versions (changed_at DESC);

-- ── Auto-create version on INSERT ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_surat_version_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.surat_request_versions (surat_no, version, data, changed_by, change_type)
  VALUES (
    NEW.no,
    1,
    to_jsonb(NEW),
    COALESCE(NEW.updated_by, 'system'),
    'created'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS surat_version_on_insert ON public.surat_requests;
CREATE TRIGGER surat_version_on_insert
  AFTER INSERT ON public.surat_requests
  FOR EACH ROW EXECUTE FUNCTION create_surat_version_on_insert();

-- ── Auto-create version on UPDATE (status change, field updates) ───────────
CREATE OR REPLACE FUNCTION create_surat_version_on_update()
RETURNS TRIGGER AS $$
DECLARE
  v_version int;
  v_change_type text;
BEGIN
  -- Determine change type
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_change_type := 'status_change';
  ELSE
    v_change_type := 'field_update';
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_version
  FROM public.surat_request_versions
  WHERE surat_no = NEW.no;

  INSERT INTO public.surat_request_versions (surat_no, version, data, changed_by, change_type)
  VALUES (
    NEW.no,
    v_version,
    to_jsonb(NEW),
    COALESCE(NEW.updated_by, 'system'),
    v_change_type
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS surat_version_on_update ON public.surat_requests;
CREATE TRIGGER surat_version_on_update
  AFTER UPDATE ON public.surat_requests
  FOR EACH ROW EXECUTE FUNCTION create_surat_version_on_update();

-- ── RLS Policies ────────────────────────────────────────────────────────────
ALTER TABLE public.submission_rate_limit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_request_versions ENABLE ROW LEVEL SECURITY;

-- submission_rate_limit: service_role only (write), public read not needed
DROP POLICY IF EXISTS "Service role all" ON public.submission_rate_limit;
CREATE POLICY "Service role all" ON public.submission_rate_limit
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- surat_request_versions: service_role full access, public can read (for audit)
DROP POLICY IF EXISTS "Service role all" ON public.surat_request_versions;
CREATE POLICY "Service role all" ON public.surat_request_versions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read" ON public.surat_request_versions;
CREATE POLICY "Public read" ON public.surat_request_versions
  FOR SELECT USING (true);

-- ── Audit Log ──────────────────────────────────────────────────────────────
INSERT INTO public.audit_log (username, action, detail, ip_address)
VALUES (
  'system',
  'MIGRATION',
  'Migration 053: Rate limit + surat_request_versions + version triggers',
  '127.0.0.1'
);