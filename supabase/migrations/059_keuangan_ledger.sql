-- ============================================================
-- MIGRATION 059: Keuangan APBDes Ledger System
-- ============================================================
-- Date: 2026-05-23
-- Purpose: Transaction-level ledger untuk APBDes dengan COA
--
-- Menambahkan 4 tabel:
--   1. keuangan_coa      — Chart of Accounts (Permendes 4/2020)
--   2. keuangan          — Transaction ledger (income/expense entries)
--   3. keuangan_plan     — Budget plan per COA per tahun
--   4. keuangan_report   — Generated reports (monthly/semester/annual)
--
-- Catatan: Tabel apbdes_data (migration 017) tetap ada untuk data statis.
--          Tabel ini untuk transaction-level accounting.
-- ============================================================

-- ─── 1. Chart of Accounts (COA) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.keuangan_coa (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  type            TEXT NOT NULL CHECK (type IN ('income', 'expense', 'asset', 'liability')),
  name            TEXT NOT NULL,
  parent_code     TEXT,
  position        SMALLINT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- Index untuk performance
CREATE INDEX IF NOT EXISTS idx_keuangan_coa_type ON public.keuangan_coa(type);
CREATE INDEX IF NOT EXISTS idx_keuangan_coa_parent ON public.keuangan_coa(parent_code);
CREATE INDEX IF NOT EXISTS idx_keuangan_coa_active ON public.keuangan_coa(is_active);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_keuangan_coa_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS keuangan_coa_updated_at ON public.keuangan_coa;
CREATE TRIGGER keuangan_coa_updated_at
  BEFORE UPDATE ON public.keuangan_coa
  FOR EACH ROW EXECUTE FUNCTION public.handle_keuangan_coa_updated_at();

-- RLS
ALTER TABLE public.keuangan_coa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "keuangan_coa_select" ON public.keuangan_coa
  FOR SELECT USING (TRUE);

CREATE POLICY "keuangan_coa_manage" ON public.keuangan_coa
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ─── 2. Transaction Ledger ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.keuangan (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year            SMALLINT NOT NULL,
  month           SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  coa_code        TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount          BIGINT NOT NULL CHECK (amount > 0),
  description     TEXT,
  reference       TEXT,
  is_realisasi    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- Indexes untuk query performance
CREATE INDEX IF NOT EXISTS idx_keuangan_year_month ON public.keuangan(year, month);
CREATE INDEX IF NOT EXISTS idx_keuangan_coa_code ON public.keuangan(coa_code);
CREATE INDEX IF NOT EXISTS idx_keuangan_type ON public.keuangan(type);
CREATE INDEX IF NOT EXISTS idx_keuangan_created_at ON public.keuangan(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_keuangan_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS keuangan_updated_at ON public.keuangan;
CREATE TRIGGER keuangan_updated_at
  BEFORE UPDATE ON public.keuangan
  FOR EACH ROW EXECUTE FUNCTION public.handle_keuangan_updated_at();

-- RLS
ALTER TABLE public.keuangan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "keuangan_select" ON public.keuangan
  FOR SELECT USING (TRUE);

CREATE POLICY "keuangan_manage" ON public.keuangan
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ─── 3. Budget Plan ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.keuangan_plan (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year            SMALLINT NOT NULL,
  coa_code        TEXT NOT NULL,
  planned_amount  BIGINT NOT NULL CHECK (planned_amount >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,
  UNIQUE (year, coa_code)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_keuangan_plan_year ON public.keuangan_plan(year);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_keuangan_plan_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS keuangan_plan_updated_at ON public.keuangan_plan;
CREATE TRIGGER keuangan_plan_updated_at
  BEFORE UPDATE ON public.keuangan_plan
  FOR EACH ROW EXECUTE FUNCTION public.handle_keuangan_plan_updated_at();

-- RLS
ALTER TABLE public.keuangan_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "keuangan_plan_select" ON public.keuangan_plan
  FOR SELECT USING (TRUE);

CREATE POLICY "keuangan_plan_manage" ON public.keuangan_plan
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ─── 4. Generated Reports ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.keuangan_report (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year            SMALLINT NOT NULL,
  month           SMALLINT CHECK (month BETWEEN 1 AND 12),
  type            TEXT NOT NULL CHECK (type IN ('monthly', 'semester', 'annual')),
  title           TEXT NOT NULL,
  content         JSONB NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by    UUID
);

-- Index
CREATE INDEX IF NOT EXISTS idx_keuangan_report_year_month ON public.keuangan_report(year, month);
CREATE INDEX IF NOT EXISTS idx_keuangan_report_type ON public.keuangan_report(type);

-- RLS
ALTER TABLE public.keuangan_report ENABLE ROW LEVEL SECURITY;

CREATE POLICY "keuangan_report_select" ON public.keuangan_report
  FOR SELECT USING (TRUE);

CREATE POLICY "keuangan_report_manage" ON public.keuangan_report
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ─── Seed Data: COA Default (Permendes 4/2020) ────────────────────────────

-- Pendapatan (Income)
INSERT INTO public.keuangan_coa (code, type, name, parent_code, position) VALUES
  ('4', 'income', 'PENDAPATAN', NULL, 1),
  ('4.1', 'income', 'Pendapatan Asli Desa', '4', 2),
  ('4.1.01', 'income', 'Hasil Usaha Desa', '4.1', 1),
  ('4.1.02', 'income', 'Hasil Aset Desa', '4.1', 2),
  ('4.1.03', 'income', 'Swadaya, Partisipasi dan Gotong Royong', '4.1', 3),
  ('4.1.04', 'income', 'Lain-Lain Pendapatan Asli Desa', '4.1', 4),

  ('4.2', 'income', 'Transfer', '4', 2),
  ('4.2.01', 'income', 'Dana Desa', '4.2', 1),
  ('4.2.02', 'income', 'Bagian dari Hasil Pajak Daerah dan Retribusi Daerah Kabupaten/Kota', '4.2', 2),
  ('4.2.03', 'income', 'Alokasi Dana Desa', '4.2', 3),
  ('4.2.04', 'income', 'Bantuan Keuangan dari APBD Provinsi', '4.2', 4),
  ('4.2.05', 'income', 'Bantuan Keuangan APBD Kabupaten/Kota', '4.2', 5),

  ('4.3', 'income', 'Pendapatan Lain-Lain', '4', 3),
  ('4.3.01', 'income', 'Penerimaan dari Hasil Kerjasama Desa', '4.3', 1),
  ('4.3.02', 'income', 'Penerimaan dari Bantuan Perusahaan', '4.3', 2),
  ('4.3.03', 'income', 'Penerimaan dari Hibah dan Sumbangan dari Pihak Ketiga', '4.3', 3),
  ('4.3.04', 'income', 'Koreksi Kesalahan Belanja Tahun-tahun Sebelumnya', '4.3', 4),
  ('4.3.05', 'income', 'Bunga Bank', '4.3', 5),
  ('4.3.06', 'income', 'Lain-lain Pendapatan Desa Yang Sah', '4.3', 6)
ON CONFLICT (code) DO NOTHING;

-- Belanja (Expense)
INSERT INTO public.keuangan_coa (code, type, name, parent_code, position) VALUES
  ('5', 'expense', 'BELANJA', NULL, 1),
  ('5.1', 'expense', 'Bidang Penyelenggaraan Pemerintahan Desa', '5', 1),
  ('5.1.01', 'expense', 'Penghasilan Tetap dan Tunjangan Kepala Desa', '5.1', 1),
  ('5.1.02', 'expense', 'Penghasilan Tetap dan Tunjangan Perangkat Desa', '5.1', 2),
  ('5.1.03', 'expense', 'Jaminan Sosial Kepala Desa dan Perangkat Desa', '5.1', 3),
  ('5.1.04', 'expense', 'Tunjangan BPD', '5.1', 4),
  ('5.1.05', 'expense', 'Operasional Perkantoran', '5.1', 5),
  ('5.1.06', 'expense', 'Operasional BPD', '5.1', 6),
  ('5.1.07', 'expense', 'Pengelolaan Administrasi Kependudukan', '5.1', 7),

  ('5.2', 'expense', 'Bidang Pelaksanaan Pembangunan Desa', '5', 2),
  ('5.2.01', 'expense', 'Pendidikan', '5.2', 1),
  ('5.2.02', 'expense', 'Kesehatan', '5.2', 2),
  ('5.2.03', 'expense', 'Pekerjaan Umum dan Penataan Ruang', '5.2', 3),
  ('5.2.04', 'expense', 'Kawasan Permukiman', '5.2', 4),
  ('5.2.05', 'expense', 'Kehutanan dan Lingkungan Hidup', '5.2', 5),
  ('5.2.06', 'expense', 'Perhubungan, Komunikasi dan Informatika', '5.2', 6),
  ('5.2.07', 'expense', 'Energi dan Sumber Daya Mineral', '5.2', 7),
  ('5.2.08', 'expense', 'Pariwisata', '5.2', 8),

  ('5.3', 'expense', 'Bidang Pembinaan Kemasyarakatan', '5', 3),
  ('5.3.01', 'expense', 'Ketentraman, Ketertiban dan Perlindungan Masyarakat', '5.3', 1),
  ('5.3.02', 'expense', 'Kebudayaan dan Keagamaan', '5.3', 2),
  ('5.3.03', 'expense', 'Kepemudaan dan Olahraga', '5.3', 3),
  ('5.3.04', 'expense', 'Kelembagaan Masyarakat', '5.3', 4),

  ('5.4', 'expense', 'Bidang Pemberdayaan Masyarakat', '5', 4),
  ('5.4.01', 'expense', 'Kelautan dan Perikanan', '5.4', 1),
  ('5.4.02', 'expense', 'Pertanian dan Peternakan', '5.4', 2),
  ('5.4.03', 'expense', 'Peningkatan Kapasitas Aparatur Desa', '5.4', 3),
  ('5.4.04', 'expense', 'Pemberdayaan Perempuan, Perlindungan Anak dan Keluarga', '5.4', 4),
  ('5.4.05', 'expense', 'Koperasi, Usaha Mikro Kecil dan Menengah', '5.4', 5),
  ('5.4.06', 'expense', 'Dukungan Penanaman Modal', '5.4', 6),
  ('5.4.07', 'expense', 'Perdagangan dan Perindustrian', '5.4', 7),

  ('5.5', 'expense', 'Bidang Penanggulangan Bencana, Darurat dan Mendesak Desa', '5', 5),
  ('5.5.01', 'expense', 'Penanggulangan Bencana', '5.5', 1),
  ('5.5.02', 'expense', 'Keadaan Darurat', '5.5', 2),
  ('5.5.03', 'expense', 'Keadaan Mendesak', '5.5', 3)
ON CONFLICT (code) DO NOTHING;

-- ─── Audit Log ─────────────────────────────────────────────────────────────

INSERT INTO public.audit_log (action, table_name, details, ip_address, username)
VALUES (
  'MIGRATION',
  'keuangan_coa, keuangan, keuangan_plan, keuangan_report',
  'Migration 059: Created keuangan ledger system with COA (Permendes 4/2020)',
  '127.0.0.1',
  'system'
);

-- ─── Comments ──────────────────────────────────────────────────────────────

COMMENT ON TABLE public.keuangan_coa IS 'Chart of Accounts untuk APBDes (Permendes 4/2020)';
COMMENT ON TABLE public.keuangan IS 'Transaction ledger untuk pendapatan dan belanja desa';
COMMENT ON TABLE public.keuangan_plan IS 'Budget plan (rencana APBDes) per COA per tahun';
COMMENT ON TABLE public.keuangan_report IS 'Generated reports (monthly/semester/annual)';
