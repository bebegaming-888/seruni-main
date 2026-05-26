-- Migration 061: Inventaris Desa (Village Asset Inventory)
-- Tables: inventaris_category, inventaris
-- Seeded with default categories per Permendes 4/2020

BEGIN;

-- ── inventaris_category ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventaris_category (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text NOT NULL UNIQUE,
  name                text NOT NULL,
  depreciation_rate   smallint NOT NULL DEFAULT 0,
  description         text,
  position            smallint NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz
);

COMMENT ON TABLE public.inventaris_category IS 'Asset categories (tanah, bangunan, peralatan, dll)';

-- RLS
ALTER TABLE public.inventaris_category ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventaris_category service_role all"
  ON public.inventaris_category FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "inventaris_category public read"
  ON public.inventaris_category FOR SELECT
  TO anon
  USING (is_active = true);

-- Seed categories
INSERT INTO public.inventaris_category (code, name, depreciation_rate, position) VALUES
  ('TNH',  'Tanah',                          0,  1),
  ('BGN',  'Bangunan',                       5,  2),
  ('JAL',  'Jalan, Irigasi & Jaringan',      10, 3),
  ('AKD',  'Aset Tetap Lainnya',             10, 4),
  ('KON',  'Konstruksi Dalam Pengerjaan',    0,  5),
  ('SRT',  'Surat Berharga',                0,  6),
  ('PGT',  'Peralatan & Mesin',              25, 7),
  ('GDT',  'Gedung & Bangunan',             5,  8),
  ('ATB',  'Aset Tidak Berwujud',           25, 9),
  ('AKL',  'Aset Lainnya',                  10, 10)
ON CONFLICT (code) DO NOTHING;

-- ── inventaris ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventaris (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         uuid REFERENCES public.inventaris_category(id),
  code                text UNIQUE,
  name                text NOT NULL,
  description         text,
  condition           text NOT NULL DEFAULT 'baik'
                      CHECK (condition IN ('baik', 'rusak_ringan', 'rusak_berat', 'hilang', 'dijual')),
  acquisition_date    date,
  acquisition_value   numeric(18, 0) DEFAULT 0,
  current_value       numeric(18, 0) DEFAULT 0,
  location            text,
  responsible         text,
  dusun               text,
  year_acquired       smallint,
  photos              text[],
  notes               text,
  is_active           boolean NOT NULL DEFAULT true,
  status              text NOT NULL DEFAULT 'owned'
                      CHECK (status IN ('owned', 'rented', 'leased', 'disposed')),
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz
);

COMMENT ON TABLE public.inventaris IS 'Village asset inventory — tanah, bangunan, peralatan, kendaraan';

-- RLS
ALTER TABLE public.inventaris ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventaris service_role all"
  ON public.inventaris FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "inventaris public read"
  ON public.inventaris FOR SELECT
  TO anon
  USING (is_active = true);

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER inventaris_updated_at
  BEFORE UPDATE ON public.inventaris
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventaris_category_updated_at
  BEFORE UPDATE ON public.inventaris_category
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text NOT NULL,
  record_id   uuid,
  action      text NOT NULL,
  changed_by  uuid,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  diff        jsonb
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log service_role all" ON public.audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;