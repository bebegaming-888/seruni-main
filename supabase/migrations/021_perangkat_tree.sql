-- ============================================================
-- MIGRATION 021: Perangkat Desa — Tree Hierarchy Structure
-- ============================================================
-- Replacing flat perangkat_desa (migration 018) with two-table hierarchy:
--
-- perangkat_desa_struktur (tree jabatan)
--   └── parent_id = null → root (Kepala Desa)
--   └── unlimited depth hierarchy
--   └── is_single_position = TRUE means only 1 person can fill it
--
-- perangkat_desa (orang/personel)
--   └── FK → perangkat_desa_struktur(id)
--   └── autofill from warga via NIK
--
-- Seed: full tree skeleton + sample perangkat from migration 018 data.
-- ============================================================

-- ── 0. Drop old flat table (replaced by two-table model) ──────────────────
DROP TABLE IF EXISTS public.perangkat_desa CASCADE;

-- ── 1. Tabel: perangkat_desa_struktur ────────────────────────────────────
-- Tree jabatan per perangkat. parent_id = null → root (Kepala Desa).
CREATE TABLE IF NOT EXISTS public.perangkat_desa_struktur (
  id                SERIAL PRIMARY KEY,

  parent_id         INTEGER
                      REFERENCES public.perangkat_desa_struktur(id)
                      ON DELETE CASCADE,

  nama_jabatan     TEXT NOT NULL,

  kategori          TEXT NOT NULL DEFAULT 'Pelaksana Teknis'
                      CHECK (kategori IN (
                        'Pimpinan',
                        'Kesekretariatan',
                        'Pelaksana Teknis',
                        'Pelaksana Kewilayahan',
                        'Staf/Operator'
                      )),

  level_hierarchy  INTEGER NOT NULL DEFAULT 1,
                      -- 1 = root (Kepala Desa)
                      -- 2 = langsung di bawah root (Sekretaris, Kasi, Kadus)
                      -- 3+ = nested deeper

  urutan            INTEGER NOT NULL DEFAULT 99,

  warna_label       TEXT,
                      -- CSS colour for badge, e.g. "bg-primary/10 text-primary"

  is_single_position BOOLEAN NOT NULL DEFAULT FALSE,
                      -- TRUE: only 1 person can hold this position at a time
                      -- FALSE: multiple people can share this position (e.g. multiple Kadus)

  status_aktif      BOOLEAN NOT NULL DEFAULT TRUE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_perangkat_struktur_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS perangkat_struktur_updated_at ON public.perangkat_desa_struktur;
CREATE TRIGGER perangkat_struktur_updated_at
  BEFORE UPDATE ON public.perangkat_desa_struktur
  FOR EACH ROW EXECUTE FUNCTION public.handle_perangkat_struktur_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pd_struktur_parent
  ON public.perangkat_desa_struktur(parent_id);
CREATE INDEX IF NOT EXISTS idx_pd_struktur_lembaga
  ON public.perangkat_desa_struktur(level_hierarchy);
CREATE INDEX IF NOT EXISTS idx_pd_struktur_urutan
  ON public.perangkat_desa_struktur(urutan ASC);
CREATE INDEX IF NOT EXISTS idx_pd_struktur_kategori
  ON public.perangkat_desa_struktur(kategori);

-- RLS
ALTER TABLE public.perangkat_desa_struktur ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read perangkat struktur"
  ON public.perangkat_desa_struktur FOR SELECT
  TO public
  USING (status_aktif = TRUE);

CREATE POLICY "Admins manage perangkat struktur"
  ON public.perangkat_desa_struktur FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 2. Tabel: perangkat_desa ──────────────────────────────────────────────
-- Orang/personel. Each row = one person filling a struktur position.
CREATE TABLE IF NOT EXISTS public.perangkat_desa (
  id                    SERIAL PRIMARY KEY,

  struktur_id           INTEGER NOT NULL
                          REFERENCES public.perangkat_desa_struktur(id)
                          ON DELETE CASCADE,

  nik                  CHAR(16),

  nama                 TEXT NOT NULL,

  jenis_kelamin        TEXT DEFAULT 'Laki-Laki'
                          CHECK (jenis_kelamin IN ('Laki-Laki', 'Perempuan')),

  tempat_lahir         TEXT,

  tanggal_lahir        DATE,

  pendidikan           TEXT,

  alamat               TEXT,

  no_hp                TEXT,

  email                TEXT,

  foto_url             TEXT,

  foto_storage_path    TEXT,

  nomor_sk             TEXT,

  tanggal_terbit_sk    DATE,

  tanggal_berakhir     DATE,

  status_aktif        BOOLEAN NOT NULL DEFAULT TRUE,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_perangkat_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS perangkat_updated_at ON public.perangkat_desa;
CREATE TRIGGER perangkat_updated_at
  BEFORE UPDATE ON public.perangkat_desa
  FOR EACH ROW EXECUTE FUNCTION public.handle_perangkat_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_perangkat_struktur_id
  ON public.perangkat_desa(struktur_id);
CREATE INDEX IF NOT EXISTS idx_perangkat_nik
  ON public.perangkat_desa(nik);
CREATE INDEX IF NOT EXISTS idx_perangkat_status
  ON public.perangkat_desa(status_aktif);
CREATE INDEX IF NOT EXISTS idx_perangkat_active
  ON public.perangkat_desa(struktur_id, status_aktif);

-- RLS
ALTER TABLE public.perangkat_desa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read aktif perangkat"
  ON public.perangkat_desa FOR SELECT
  TO public
  USING (status_aktif = TRUE);

CREATE POLICY "Admins manage perangkat"
  ON public.perangkat_desa FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 3. Seed: Struktur Tree Skeleton ────────────────────────────────────────
-- Urutan defines display order. Level 3 (Kaur, Kadus-dusun) di-insert langsung
-- setelah level 1 & 2 agar parent_id sudah terisi saat query parent.
INSERT INTO public.perangkat_desa_struktur
  (parent_id, nama_jabatan, kategori, level_hierarchy, urutan, is_single_position, warna_label)
VALUES
  -- Level 1: root
  (NULL,          'Kepala Desa',               'Pimpinan',             1,  1,  TRUE,  'bg-primary/10 text-primary'),
  -- Level 2: langsung di bawah Kades
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kepala Desa' AND parent_id IS NULL LIMIT 1),
               'Sekretaris Desa',              'Kesekretariatan',      2,  2,  TRUE,  'bg-info/10 text-info'),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kepala Desa' AND parent_id IS NULL LIMIT 1),
               'Kasi Pemerintahan',            'Pelaksana Teknis',     2,  3,  TRUE,  'bg-success/10 text-success'),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kepala Desa' AND parent_id IS NULL LIMIT 1),
               'Kasi Pelayanan',               'Pelaksana Teknis',     2,  4,  TRUE,  'bg-success/10 text-success'),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kepala Desa' AND parent_id IS NULL LIMIT 1),
               'Kasi Kesejahteraan Rakyat',    'Pelaksana Teknis',     2,  5,  TRUE,  'bg-success/10 text-success'),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kepala Desa' AND parent_id IS NULL LIMIT 1),
               'Kadus',                        'Pelaksana Kewilayahan',2,  6,  FALSE, 'bg-warning/10 text-warning'),
  -- Level 3: Kaur (parent = Sekdes)
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Sekretaris Desa' LIMIT 1),
               'Kaur Keuangan',                'Kesekretariatan',     3, 10,  TRUE,  'bg-info/10 text-info'),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Sekretaris Desa' LIMIT 1),
               'Kaur Tata Usaha & Umum',        'Kesekretariatan',     3, 11,  TRUE,  'bg-info/10 text-info'),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Sekretaris Desa' LIMIT 1),
               'Kaur Perencanaan',             'Kesekretariatan',     3, 12,  TRUE,  'bg-info/10 text-info'),
  -- Level 3: Kadus per dusun (parent = Kadus, multi-fill)
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kadus' AND parent_id IS NOT NULL LIMIT 1),
               'Kadus Mandar',         'Pelaksana Kewilayahan', 3, 20, FALSE, 'bg-warning/10 text-warning'),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kadus' AND parent_id IS NOT NULL LIMIT 1),
               'Kadus Sasak',          'Pelaksana Kewilayahan', 3, 21, FALSE, 'bg-warning/10 text-warning'),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kadus' AND parent_id IS NOT NULL LIMIT 1),
               'Kadus Brantapen Asri',  'Pelaksana Kewilayahan', 3, 22, FALSE, 'bg-warning/10 text-warning'),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kadus' AND parent_id IS NOT NULL LIMIT 1),
               'Kadus Dames',          'Pelaksana Kewilayahan', 3, 23, FALSE, 'bg-warning/10 text-warning');

-- ── 4. Seed: Sample Perangkat (migrated from 018 flat table) ─────────────
INSERT INTO public.perangkat_desa
  (struktur_id, nik, nama, jenis_kelamin, tempat_lahir, tanggal_lahir,
   pendidikan, alamat, nomor_sk, tanggal_terbit_sk, status_aktif)
VALUES
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kepala Desa' LIMIT 1),
   '5203010101750001', 'H. Sumardi, S.Sos.', 'Laki-Laki', 'Seruni Mumbul', '1975-12-25',
   'S1 Teknik Informatika', 'Dusun Mandar', '470/001/KEP/DES/2021', '2021-08-01', TRUE),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Sekretaris Desa' LIMIT 1),
   '5203010101820001', 'Lalu Ahmad Zaini, S.Sos.', 'Laki-Laki', 'Lombok Timur', '1982-01-10',
   'D3 Administrasi Negara', NULL, NULL, '2021-08-01', TRUE),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kaur Keuangan' LIMIT 1),
   '5203010101820002', 'Lalu Nasrudin, A.Md.', 'Laki-Laki', 'Lombok Timur', '1983-05-20',
   'D3 Keuangan', NULL, NULL, '2021-08-01', TRUE),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kaur Tata Usaha & Umum' LIMIT 1),
   '5203010101820004', 'M. Iqbal, S.H.', 'Laki-Laki', 'Lombok Timur', '1987-08-05',
   'S1 Hukum', NULL, NULL, '2021-08-01', TRUE),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kasi Pemerintahan' LIMIT 1),
   '5203010101920001', 'Siti Nurhaliza, S.Pd.', 'Perempuan', 'Seruni Mumbul', '1992-03-15',
   'S1 Pendidikan', NULL, NULL, '2021-08-01', TRUE),
  ((SELECT id FROM public.perangkat_desa_struktur WHERE nama_jabatan = 'Kasi Pelayanan' LIMIT 1),
   '5203010101890001', 'Lalu Wirawan', 'Laki-Laki', 'Pringgabaya', '1989-07-15',
   'D3 Pariwisata', NULL, NULL, '2021-08-01', TRUE);
