-- ============================================================
-- MIGRATION 018: Perangkat Desa — Struktur & Relasi Warga
-- ============================================================
-- Relasi: perangkat_desa.nik → warga.nik (bukan UUID FK, karena warga.nik = char(16) unique)
-- Jika warga dihapus, perangkat juga dihapus (ON DELETE CASCADE).
--
-- Alur autofill: input NIK → blur/click Autofill → lookup warga.nik → autofill
--   nama, tempat_lahir, tanggal_lahir, jenis_kelamin, pendidikan
--
-- Kategori: Pimpinan | Kesekretariatan | Pelaksana Teknis | Pelaksana Kewilayahan | Staf/Operator

-- ── Tabel: perangkat_desa ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.perangkat_desa (
  id                  SERIAL PRIMARY KEY,
  nik                 CHAR(16) NOT NULL,
  nama                TEXT NOT NULL,
  jenis_kelamin       TEXT NOT NULL DEFAULT 'Laki-Laki'
                        CHECK (jenis_kelamin IN ('Laki-Laki', 'Perempuan')),
  tempat_lahir        TEXT,
  tanggal_lahir       DATE,
  pendidikan          TEXT,
  kategori            TEXT NOT NULL DEFAULT 'Pelaksana Teknis',
                        -- Kategori jabatan sesuai Permendagri No. 84 Tahun 2015
                        CHECK (kategori IN (
                          'Pimpinan',
                          'Kesekretariatan',
                          'Pelaksana Teknis',
                          'Pelaksana Kewilayahan',
                          'Staf/Operator'
                        )),
  jabatan             TEXT NOT NULL,
  no_sk               TEXT,
  tanggal_pengangkatan DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_berakhir    DATE,
  foto_url            TEXT,
  status_aktif        BOOLEAN NOT NULL DEFAULT TRUE,
  urutan              INTEGER NOT NULL DEFAULT 99,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

-- Hapus constraint unik lama yang tidak kompatibel dengan PostgreSQL versi lama
-- (partial unique constraint WHERE tidak didukung di semua versi)
-- Gantikan dengan trigger-based validation jika diperlukan

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_perangkat_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS perangkat_desa_updated_at ON public.perangkat_desa;
CREATE TRIGGER perangkat_desa_updated_at
  BEFORE UPDATE ON public.perangkat_desa
  FOR EACH ROW EXECUTE FUNCTION public.handle_perangkat_updated_at();

-- ── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_perangkat_nik          ON public.perangkat_desa(nik);
CREATE INDEX IF NOT EXISTS idx_perangkat_status        ON public.perangkat_desa(status_aktif);
CREATE INDEX IF NOT EXISTS idx_perangkat_kategori     ON public.perangkat_desa(kategori);
CREATE INDEX IF NOT EXISTS idx_perangkat_jabatan      ON public.perangkat_desa(jabatan);
CREATE INDEX IF NOT EXISTS idx_perangkat_urutan       ON public.perangkat_desa(urutan ASC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.perangkat_desa ENABLE ROW LEVEL SECURITY;

-- Publik bisa baca perangkat aktif
CREATE POLICY "perangkat_read_aktif"
  ON public.perangkat_desa FOR SELECT
  USING (status_aktif = TRUE);

-- Hanya service role / admin yang bisa insert/update/delete
CREATE POLICY "perangkat_admin_all"
  ON public.perangkat_desa FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Seed Data Perangkat Desa (periode 2021–2027) ────────────────────────────
-- NIK di bawah adalah placeholder. Ganti dengan NIK nyata sebelum deploy.
INSERT INTO public.perangkat_desa
  (nik, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, pendidikan, kategori, jabatan,
   no_sk, tanggal_pengangkatan, status_aktif, urutan)
VALUES
  -- PEMIMPIN
  ('5203010101750001', 'H. Sumardi, S.Sos.',    'Laki-Laki',  'Seruni Mumbul', '1975-12-25', 'S1 Teknik Informatika',      'Pimpinan',        'Kepala Desa',                  '470/001/KEP/DES/2021', '2021-08-01', TRUE, 1),

  -- KESEKRETARIATAN
  ('5203010101820001', 'Lalu Ahmad Zaini, S.Sos.', 'Laki-Laki', 'Lombok Timur',  '1982-01-10', 'D3 Administrasi Negara',    'Kesekretariatan', 'Sekretaris Desa',             '470/002/KEP/DES/2021', '2021-08-01', TRUE, 2),
  ('5203010101820002', 'Lalu Nasrudin, A.Md.',     'Laki-Laki', 'Lombok Timur',  '1983-05-20', 'D3 Keuangan',                 'Kesekretariatan', 'Kepala Urusan Keuangan',      '470/007/KEP/DES/2021', '2021-08-01', TRUE, 3),
  ('5203010101820003', 'Siti Rohmah, S.Pd.',        'Perempuan', 'Seruni Mumbul', '1986-03-12', 'S1 Pendidikan',                'Kesekretariatan', 'Kepala Urusan Kesejahteraan',  '470/008/KEP/DES/2021', '2021-08-01', TRUE, 4),
  ('5203010101820004', 'M. Iqbal, S.H.',            'Laki-Laki', 'Lombok Timur',  '1987-08-05', 'S1 Hukum',                    'Kesekretariatan', 'Kepala Urusan Tata Usaha & Umum', '470/009/KEP/DES/2021', '2021-08-01', TRUE, 5),

  -- PELAKSANA TEKNIS
  ('5203010101920001', 'Siti Nurhaliza, S.Pd.',     'Perempuan', 'Seruni Mumbul', '1992-03-15', 'S1 Pendidikan',               'Pelaksana Teknis', 'Kepala Seksi Pemerintahan',   '470/003/KEP/DES/2021', '2021-08-01', TRUE, 10),
  ('5203010101890001', 'Lalu Wirawan',              'Laki-Laki', 'Pringgabaya',   '1989-07-15', 'D3 Pariwisata',              'Pelaksana Teknis', 'Kepala Seksi Pelayanan',       '470/006/KEP/DES/2021', '2021-08-01', TRUE, 11),
  ('5203010101920002', 'Ahmad Zulkifli',            'Laki-Laki', 'Lombok Timur',   '1990-11-22', 'S1 Teknik Planologi',        'Pelaksana Teknis', 'Kepala Seksi Perencanaan',     '470/010/KEP/DES/2021', '2021-08-01', TRUE, 12),

  -- PELAKSANA KEWILAYAHAN (Kadus)
  ('5203010101710001', 'Siti Aminah',              'Perempuan', 'Seruni Mumbul', '1971-01-05', 'SMA',                        'Pelaksana Kewilayahan', 'Kepala Dusun Mandar',     NULL, '2021-08-01', TRUE, 20),
  ('5203010101720001', 'H. Badaruddin',            'Laki-Laki', 'Seruni Mumbul', '1973-06-30', 'SMA',                        'Pelaksana Kewilayahan', 'Kepala Dusun Sasak',       NULL, '2021-08-01', TRUE, 21),
  ('5203010101730001', 'Baiq Dewi',               'Perempuan', 'Seruni Mumbul', '1975-09-18', 'SMA',                        'Pelaksana Kewilayahan', 'Kepala Dusun Brantapen Asri', NULL, '2021-08-01', TRUE, 22),
  ('5203010101740001', 'Lalu Sopian',              'Laki-Laki', 'Seruni Mumbul', '1977-04-10', 'SMA',                        'Pelaksana Kewilayahan', 'Kepala Dusun Dames',       NULL, '2021-08-01', TRUE, 23),
  ('5203010101700001', 'Hj. Baiq Munawwaroh',     'Perempuan', 'Seruni Mumbul', '1970-08-12', 'SMA',                        'Staf/Operator',    'Kader Pembangunan Masyarakat', NULL,          '2021-08-01', TRUE, 30)
ON CONFLICT DO NOTHING;