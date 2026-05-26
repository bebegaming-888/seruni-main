-- ============================================================
-- MIGRATION 047: Fix Trigger Infinite Loop in sync_surat_request_metadata
--
-- CRITICAL BUG FIX:
-- Migration 016 created an AFTER trigger that performs UPDATE on the same
-- table, which can cause infinite loops or double-updates.
--
-- The trigger should be BEFORE INSERT/UPDATE and directly modify NEW values
-- instead of performing a separate UPDATE statement.
--
-- Background: The original trigger (lines 105-131 in migration 016) uses:
--   AFTER INSERT OR UPDATE ... UPDATE surat_requests SET ... WHERE id = NEW.id
-- This causes the trigger to fire again after the UPDATE, potentially looping.
--
-- Fix: Convert to BEFORE trigger that modifies NEW directly.
-- ============================================================

BEGIN;

-- Drop the old AFTER trigger
DROP TRIGGER IF EXISTS trg_sync_surat_request_metadata ON public.surat_requests;

-- Recreate as BEFORE trigger with direct NEW modification
CREATE OR REPLACE FUNCTION public.sync_surat_request_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only sync if kode is present
  IF NEW.kode IS NOT NULL THEN
    -- Fetch metadata from surat_types and assign directly to NEW
    SELECT
      st.category,
      st.eta,
      st.is_substitute,
      st.name
    INTO
      NEW.category,
      NEW.eta,
      NEW.is_substitute,
      NEW.nama_surat
    FROM public.surat_types st
    WHERE st.code = NEW.kode;

    -- If no matching surat_types found, leave fields as-is (don't overwrite with NULL)
    -- The SELECT INTO will not modify NEW if no rows are returned
  END IF;

  RETURN NEW;
END;
$$;

-- Create BEFORE trigger (fires before INSERT/UPDATE, modifies NEW in-place)
CREATE TRIGGER trg_sync_surat_request_metadata
  BEFORE INSERT OR UPDATE OF kode ON public.surat_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_surat_request_metadata();

COMMIT;

-- ── Verification ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  trigger_timing TEXT;
BEGIN
  SELECT event_manipulation INTO trigger_timing
    FROM information_schema.triggers
   WHERE trigger_schema = 'public'
     AND trigger_name = 'trg_sync_surat_request_metadata'
     AND event_object_table = 'surat_requests';

  IF trigger_timing = 'INSERT' OR trigger_timing = 'UPDATE' THEN
    RAISE NOTICE 'Trigger timing: BEFORE (correct)';
  ELSE
    RAISE WARNING 'Trigger timing: % (unexpected)', trigger_timing;
  END IF;
END $$;
