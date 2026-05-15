-- ============================================================
-- MIGRATION 026: Create Missing surat_template Table
-- ============================================================
-- This table was referenced in migration 024 but never created.
-- Standardizing on JSONB-based template storage.

CREATE TABLE IF NOT EXISTS public.surat_template (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identifier
    code            text UNIQUE NOT NULL,
    
    -- Metadata
    name            text NOT NULL,
    category        text,
    description     text,
    eta             text DEFAULT '1 hari kerja',
    
    -- Template Content (JSONB)
    syarat          jsonb DEFAULT '[]'::jsonb,
    fields          jsonb DEFAULT '[]'::jsonb,
    
    -- DNA Engine Fields
    body            text, -- Legacy body
    dna_clauses     jsonb DEFAULT '[]'::jsonb,
    subject_fields  jsonb DEFAULT '[]'::jsonb,
    closing         text,
    subject_count   integer DEFAULT 1,
    
    -- Audit & Status
    status          text DEFAULT 'Draft',
    catatan         text,
    verified_by     text,
    verified_at     timestamptz,
    approved_by     text,
    approved_at     timestamptz,
    
    -- Timestamps
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_surat_template_code ON public.surat_template(code);
CREATE INDEX IF NOT EXISTS idx_surat_template_category ON public.surat_template(category);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.surat_template ENABLE ROW LEVEL SECURITY;

-- Semua orang bisa baca template
DROP POLICY IF EXISTS "Public read surat_template" ON public.surat_template;
CREATE POLICY "Public read surat_template" ON public.surat_template 
  FOR SELECT USING (true);

-- Hanya admin (authenticated) yang bisa modifikasi
DROP POLICY IF EXISTS "Admin manage surat_template" ON public.surat_template;
CREATE POLICY "Admin manage surat_template" ON public.surat_template 
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- Triggers
-- ============================================================
DROP TRIGGER IF EXISTS tr_surat_template_updated_at ON public.surat_template;
CREATE TRIGGER tr_surat_template_updated_at
  BEFORE UPDATE ON public.surat_template
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- Initial Data (Optional - to be seeded from UI or script)
-- ============================================================
-- Note: Surat templates will be populated via the sync mechanism
-- from SURAT_MASTER in the frontend.
