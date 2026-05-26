-- ============================================================
-- MIGRATION 060: Buku Agenda Surat (Keluar & Masuk)
-- ============================================================
-- Date: 2026-05-23
-- Purpose: Registry untuk surat keluar dan surat masuk.
--
-- Format nomor agenda: AGD/{O|I}/{MM}/{YYYY}/{SEQ:04}
--   Contoh: AGD/O/05/2026/0001 (Outgoing, Mei 2026, #1)
--           AGD/I/07/2026/0012 (Incoming, Juli 2026, #12)
--
-- Tabel terkait:
--   - surat_agenda: entries surat keluar/masuk
--   - surat_agenda_counter: atomic counter per direction+year
-- ============================================================

-- ─── 1. Counter Table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.surat_agenda_counter (
  direction   TEXT NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
  year        SMALLINT NOT NULL,
  counter     INT NOT NULL DEFAULT 0,
  PRIMARY KEY (direction, year)
);

COMMENT ON TABLE public.surat_agenda_counter IS
  'Atomic counter untuk generate nomor agenda surat';

-- ─── 2. Agenda Table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.surat_agenda (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction       TEXT NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
  nomor_agenda    TEXT NOT NULL UNIQUE,
  tanggal         DATE NOT NULL,
  kode_surat      TEXT,
  nomor_surat     TEXT,
  Perihal         TEXT,
  kepada          TEXT,
  asal_surat      TEXT,
  related_surat_id UUID,
  lampiran_url    TEXT,
  keterangan      TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_surat_agenda_direction ON public.surat_agenda(direction);
CREATE INDEX IF NOT EXISTS idx_surat_agenda_tanggal ON public.surat_agenda(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_surat_agenda_direction_tanggal ON public.surat_agenda(direction, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_surat_agenda_nomor_surat ON public.surat_agenda(nomor_surat);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_surat_agenda_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS surat_agenda_updated_at ON public.surat_agenda;
CREATE TRIGGER surat_agenda_updated_at
  BEFORE UPDATE ON public.surat_agenda
  FOR EACH ROW EXECUTE FUNCTION public.handle_surat_agenda_updated_at();

-- RLS
ALTER TABLE public.surat_agenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "surat_agenda_select" ON public.surat_agenda
  FOR SELECT USING (TRUE);

CREATE POLICY "surat_agenda_manage" ON public.surat_agenda
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ─── 3. Atomic Counter Function ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_next_agenda_number(p_direction TEXT, p_year SMALLINT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counter INT;
  v_agenda  TEXT;
  v_month   TEXT;
BEGIN
  -- Increment counter
  INSERT INTO public.surat_agenda_counter (direction, year, counter)
    VALUES (p_direction, p_year, 1)
    ON CONFLICT (direction, year) DO UPDATE
      SET counter = surat_agenda_counter.counter + 1
    RETURNING counter INTO v_counter;

  -- Format: AGD/{O|I}/{MM}/{YYYY}/{SEQ:04}
  v_month := LPAD(TO_CHAR(NOW(), 'MM'), 2, '0');
  v_agenda := 'AGD/' ||
    CASE p_direction WHEN 'outgoing' THEN 'O' ELSE 'I' END ||
    '/' || v_month ||
    '/' || p_year ||
    '/' || LPAD(v_counter::TEXT, 4, '0');

  RETURN v_agenda;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_agenda_number(TEXT, SMALLINT) TO service_role;

COMMENT ON FUNCTION public.get_next_agenda_number(TEXT, SMALLINT) IS
  'Generate next agenda number: AGD/{O|I}/{MM}/{YYYY}/{SEQ:04}';

-- ─── 4. Audit Log ──────────────────────────────────────────────────────────

INSERT INTO public.audit_log (action, table_name, details, ip_address, username)
VALUES (
  'MIGRATION',
  'surat_agenda, surat_agenda_counter',
  'Migration 060: Created buku agenda surat system (outgoing/incoming registry)',
  '127.0.0.1',
  'system'
);

COMMENT ON TABLE public.surat_agenda IS 'Buku agenda surat keluar dan masuk';
COMMENT ON COLUMN public.surat_agenda.nomor_agenda IS 'Format: AGD/{O|I}/{MM}/{YYYY}/{SEQ:04}';
COMMENT ON COLUMN public.surat_agenda.direction IS 'outgoing = surat keluar, incoming = surat masuk';