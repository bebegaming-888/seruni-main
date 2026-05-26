-- Migration 062: Pembangunan (RPJMDes/RKP) + Bantuan Sosial + Kelompok Masyarakat
-- Tables: pembangunan, pembangunan_activity, bantuan, bantuan_recipient, kelompok, kelompok_member

BEGIN;

-- ── pembangunan ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pembangunan (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text NOT NULL CHECK (type IN ('rpjmdes', 'rkp')),
  year            smallint NOT NULL,
  title           text NOT NULL,
  description     text,
  budget          numeric(18, 0) DEFAULT 0,
  location        text,
  dusun           text,
  start_year      smallint,
  end_year        smallint,
  status          text NOT NULL DEFAULT 'rencana'
                  CHECK (status IN ('rencana', 'aktif', 'selesai', 'batal')),
  priority        text DEFAULT 'medium'
                  CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz
);

ALTER TABLE public.pembangunan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pembangunan service_role all" ON public.pembangunan FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "pembangunan public read" ON public.pembangunan FOR SELECT TO anon USING (true);

-- ── pembangunan_activity ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pembangunan_activity (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pembangunan_id  uuid REFERENCES public.pembangunan(id) ON DELETE CASCADE,
  year            smallint NOT NULL,
  month           smallint,
  activity        text NOT NULL,
  target          text,
  realization     numeric(18, 0) DEFAULT 0,
  output          text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pembangunan_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pembangunan_activity service_role all" ON public.pembangunan_activity FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "pembangunan_activity public read" ON public.pembangunan_activity FOR SELECT TO anon USING (true);

-- ── bantuan ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bantuan (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  source          text,
  year            smallint NOT NULL,
  start_date      date,
  end_date        date,
  total_budget    numeric(18, 0) DEFAULT 0,
  recipient_count integer DEFAULT 0,
  description     text,
  status          text NOT NULL DEFAULT 'planning'
                  CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz
);

ALTER TABLE public.bantuan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bantuan service_role all" ON public.bantuan FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "bantuan public read" ON public.bantuan FOR SELECT TO anon USING (true);

-- ── bantuan_recipient ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bantuan_recipient (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bantuan_id          uuid REFERENCES public.bantuan(id) ON DELETE CASCADE,
  warga_nik           text NOT NULL,
  warga_name          text,
  warga_address       text,
  amount              numeric(18, 0) DEFAULT 0,
  distribution_date   date,
  notes               text,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bantuan_recipient ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bantuan_recipient service_role all" ON public.bantuan_recipient FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "bantuan_recipient public read" ON public.bantuan_recipient FOR SELECT TO anon USING (true);

-- ── kelompok ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kelompok (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category            text NOT NULL,
  name                text NOT NULL,
  leader_name         text,
  leader_phone        text,
  member_count        integer DEFAULT 0,
  established_date    date,
  description         text,
  notes               text,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz
);

ALTER TABLE public.kelompok ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kelompok service_role all" ON public.kelompok FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "kelompok public read" ON public.kelompok FOR SELECT TO anon USING (is_active = true);

-- ── kelompok_member ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kelompok_member (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kelompok_id     uuid REFERENCES public.kelompok(id) ON DELETE CASCADE,
  warga_nik       text,
  name            text NOT NULL,
  position        text,
  phone           text,
  is_active       boolean NOT NULL DEFAULT true,
  joined_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kelompok_member ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kelompok_member service_role all" ON public.kelompok_member FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "kelompok_member public read" ON public.kelompok_member FOR SELECT TO anon USING (is_active = true);

-- ── updated_at triggers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER pembangunan_updated_at BEFORE UPDATE ON public.pembangunan FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bantuan_updated_at BEFORE UPDATE ON public.bantuan FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER kelompok_updated_at BEFORE UPDATE ON public.kelompok FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;