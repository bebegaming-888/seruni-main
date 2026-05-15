-- ============================================================
-- MIGRATION 020: Lembaga Desa — Struktur, Jabatan, Pengurus
-- ============================================================
-- Relasi: lembaga_desa (1) → struktur_lembaga (∞) → pengurus_lembaga (∞)
--
-- Alur data:
--   lembaga_desa     → metadata lembaga (nama, jenis, deskripsi, periode, kontak)
--   struktur_lembaga → tree jabatan per lembaga (parent_id = null → root/ketua)
--   pengurus_lembaga  → orang yang mengisi jabatan (fk: struktur_id)
--
-- Seed: 5 lembaga (BPD, LPM, PKK, Karang Taruna, BUMDes)
--   dengan struktur skeleton (jabatan) tetapi tanpa pengurus (kosong).
--   Pengisian pengurus dilakukan via admin panel.
-- ============================================================

-- ── 1. Tabel: lembaga_desa ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lembaga_desa (
  id              SERIAL PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,           -- URL-friendly, e.g. "bpd"
  nama            TEXT NOT NULL,                  -- e.g. "Badan Permusyawaratan Desa"
  jenis           TEXT NOT NULL DEFAULT 'LAINNYA'
                    CHECK (jenis IN (
                      'BPD',
                      'LPM',
                      'PKK',
                      'KARANG_TARUNA',
                      'BUMDES',
                      'POSYANDU',
                      'LINMAS',
                      'RT',
                      'FORUM_ANAK',
                      'POKDARWIS',
                      'KOPERASI',
                      'LEMBAGA_ADAT',
                      'POSBANKUM',
                      'TSBD',
                      'LEMBAGA_PEREMPUAN',
                      'LAINNYA'
                    )),
  deskripsi       TEXT,
  logo_url        TEXT,
  logo_storage_path TEXT,
  periode_mulai  DATE,
  periode_selesai DATE,
  kontak_info     JSONB DEFAULT '{}',
  enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  urutan         INTEGER NOT NULL DEFAULT 99,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_lembaga_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lembaga_desa_updated_at ON public.lembaga_desa;
CREATE TRIGGER lembaga_desa_updated_at
  BEFORE UPDATE ON public.lembaga_desa
  FOR EACH ROW EXECUTE FUNCTION public.handle_lembaga_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lembaga_slug          ON public.lembaga_desa(slug);
CREATE INDEX IF NOT EXISTS idx_lembaga_jenis         ON public.lembaga_desa(jenis);
CREATE INDEX IF NOT EXISTS idx_lembaga_enabled       ON public.lembaga_desa(enabled);
CREATE INDEX IF NOT EXISTS idx_lembaga_urutan        ON public.lembaga_desa(urutan ASC);

-- RLS
ALTER TABLE public.lembaga_desa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lembaga"
  ON public.lembaga_desa FOR SELECT
  TO public
  USING (enabled = TRUE);

CREATE POLICY "Admins can manage lembaga"
  ON public.lembaga_desa FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 2. Tabel: struktur_lembaga ──────────────────────────────────────────────
-- Tree jabatan per lembaga. parent_id = null → root (Ketua Utama).
-- Urutan kolom menentukan display order di tree view.
CREATE TABLE IF NOT EXISTS public.struktur_lembaga (
  id              SERIAL PRIMARY KEY,
  lembaga_id      INTEGER NOT NULL
                    REFERENCES public.lembaga_desa(id) ON DELETE CASCADE,
  parent_id       INTEGER
                    REFERENCES public.struktur_lembaga(id) ON DELETE CASCADE,
  nama_jabatan   TEXT NOT NULL,
  level           INTEGER NOT NULL DEFAULT 0,
                    -- 0 = root (Ketua), 1 = langsung di bawah root,
                    -- 2 = di bawah level 1, dst.
  urutan         INTEGER NOT NULL DEFAULT 99,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_struktur_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS struktur_lembaga_updated_at ON public.struktur_lembaga;
CREATE TRIGGER struktur_lembaga_updated_at
  BEFORE UPDATE ON public.struktur_lembaga
  FOR EACH ROW EXECUTE FUNCTION public.handle_struktur_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_struktur_lembaga_id    ON public.struktur_lembaga(lembaga_id);
CREATE INDEX IF NOT EXISTS idx_struktur_parent      ON public.struktur_lembaga(parent_id);
CREATE INDEX IF NOT EXISTS idx_struktur_urutan      ON public.struktur_lembaga(lembaga_id, urutan ASC);

-- RLS
ALTER TABLE public.struktur_lembaga ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read struktur"
  ON public.struktur_lembaga FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage struktur"
  ON public.struktur_lembaga FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 3. Tabel: pengurus_lembaga ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pengurus_lembaga (
  id              SERIAL PRIMARY KEY,
  struktur_id     INTEGER NOT NULL
                    REFERENCES public.struktur_lembaga(id) ON DELETE CASCADE,
  nama            TEXT NOT NULL,
  nik             CHAR(16),
  tempat_lahir    TEXT,
  tanggal_lahir    DATE,
  jenis_kelamin   TEXT DEFAULT 'Laki-Laki'
                    CHECK (jenis_kelamin IN ('Laki-Laki', 'Perempuan')),
  pendidikan      TEXT,
  alamat          TEXT,
  no_hp           TEXT,
  foto_url        TEXT,
  foto_storage_path TEXT,
  status          TEXT NOT NULL DEFAULT 'aktif'
                    CHECK (status IN ('aktif', 'periode_sebelumnya')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_pengurus_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pengurus_lembaga_updated_at ON public.pengurus_lembaga;
CREATE TRIGGER pengurus_lembaga_updated_at
  BEFORE UPDATE ON public.pengurus_lembaga
  FOR EACH ROW EXECUTE FUNCTION public.handle_pengurus_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pengurus_struktur_id  ON public.pengurus_lembaga(struktur_id);
CREATE INDEX IF NOT EXISTS idx_pengurus_status       ON public.pengurus_lembaga(status);

-- RLS
ALTER TABLE public.pengurus_lembaga ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pengurus"
  ON public.pengurus_lembaga FOR SELECT
  TO public
  USING (status = 'aktif');

CREATE POLICY "Admins can manage pengurus"
  ON public.pengurus_lembaga FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 4. Seed: 5 Lembaga + Struktur Skeleton ──────────────────────────────
-- Pengurus (orang) TIDAK di-seed — diisi via admin panel.
--
-- helpers
DO $$
BEGIN
  -- BPD
  INSERT INTO public.lembaga_desa (slug, nama, jenis, deskripsi, periode_mulai, periode_selesai, kontak_info, enabled, urutan)
  VALUES ('bpd', 'Badan Permusyawaratan Desa', 'BPD',
    'Wadah partisipasi rakyat dalam pembentukan peraturan desa, pembahasan APBDes, dan pengawasan kinerja pemerintah desa.',
    '2021-08-01', '2027-08-01',
    '{"alamat": "Balai Desa Seruni Mumbul, Lt. 2", "telepon": "", "email": "", "jam_layanan": "Senin-Jumat, 08.00-15.00 WITA"}',
    TRUE, 1)
  ON CONFLICT (slug) DO NOTHING;

  -- LPM
  INSERT INTO public.lembaga_desa (slug, nama, jenis, deskripsi, periode_mulai, periode_selesai, kontak_info, enabled, urutan)
  VALUES ('lpm', 'Lembaga Pemberdayaan Masyarakat', 'LPM',
    'Mitra strategis pemerintah desa dalam merencanakan dan melaksanakan program pembangunan partisipatif.',
    '2022-01-01', '2027-12-31',
    '{"alamat": "Balai Desa Seruni Mumbul, Ruang LPM", "telepon": "", "email": "", "jam_layanan": "Senin-Jumat, 08.00-15.00 WITA"}',
    TRUE, 2)
  ON CONFLICT (slug) DO NOTHING;

  -- PKK
  INSERT INTO public.lembaga_desa (slug, nama, jenis, deskripsi, periode_mulai, periode_selesai, kontak_info, enabled, urutan)
  VALUES ('pkk', 'TP-PKK & KWT', 'PKK',
    'Pemberdayaan kesejahteraan keluarga melalui program pendidikan, kesehatan, dan ekonomi kreatif perempuan.',
    '2021-08-01', '2027-08-01',
    '{"alamat": "Balai Desa Seruni Mumbul, Ruang PKK", "telepon": "", "email": "", "jam_layanan": "Senin-Jumat, 08.00-15.00 WITA"}',
    TRUE, 3)
  ON CONFLICT (slug) DO NOTHING;

  -- Karang Taruna
  INSERT INTO public.lembaga_desa (slug, nama, jenis, deskripsi, periode_mulai, periode_selesai, kontak_info, enabled, urutan)
  VALUES ('karang-taruna', 'Karang Taruna Mumbul Jaya', 'KARANG_TARUNA',
    'Organisasi kepemudaan yang menggerakkan bakti sosial, lingkungan, dan pemberdayaan ekonomi generasi muda desa.',
    '2021-08-01', '2027-08-01',
    '{"alamat": "Balai Desa Seruni Mumbul", "telepon": "", "email": "", "jam_layanan": "Sabtu-Minggu sesuai jadwal"}',
    TRUE, 4)
  ON CONFLICT (slug) DO NOTHING;

  -- BUMDes
  INSERT INTO public.lembaga_desa (slug, nama, jenis, deskripsi, periode_mulai, periode_selesai, kontak_info, enabled, urutan)
  VALUES ('bumdes', 'Badan Usaha Milik Desa', 'BUMDES',
    'Usaha produktif desa di bidang wisata, kerajinan, dan pengelolaan hasil bumi untuk kemandirian ekonomi warga.',
    '2022-01-01', '2027-12-31',
    '{"alamat": "Balai Desa Seruni Mumbul, Ruang BUMDes", "telepon": "", "email": "", "jam_layanan": "Senin-Sabtu, 08.00-16.00 WITA"}',
    TRUE, 5)
  ON CONFLICT (slug) DO NOTHING;
END $$;

-- Struktur skeleton BPD
DO $$
DECLARE
  id_bpd INTEGER;
  sid_ketua INTEGER;
  sid_wakil INTEGER;
  sid_sekretaris INTEGER;
BEGIN
  SELECT id INTO id_bpd FROM public.lembaga_desa WHERE slug = 'bpd';
  IF id_bpd IS NULL THEN RETURN; END IF;

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_bpd, NULL, 'Ketua', 0, 1) RETURNING id INTO sid_ketua;

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_bpd, NULL, 'Wakil Ketua', 0, 2) RETURNING id INTO sid_wakil;

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_bpd, NULL, 'Sekretaris', 0, 3) RETURNING id INTO sid_sekretaris;

  -- 5 anggota
  FOR i IN 1..5 LOOP
    INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
    VALUES (id_bpd, sid_ketua, 'Anggota', 1, 10 + i);
  END LOOP;
END $$;

-- Struktur skeleton LPM
DO $$
DECLARE
  id_lpm INTEGER;
  sid_ketua INTEGER;
  sid_sekretaris INTEGER;
  sid_bendahara INTEGER;
BEGIN
  SELECT id INTO id_lpm FROM public.lembaga_desa WHERE slug = 'lpm';
  IF id_lpm IS NULL THEN RETURN; END IF;

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_lpm, NULL, 'Ketua', 0, 1) RETURNING id INTO sid_ketua;

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_lpm, NULL, 'Sekretaris', 0, 2) RETURNING id INTO sid_sekretaris;

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_lpm, NULL, 'Bendahara', 0, 3) RETURNING id INTO sid_bendahara;

  -- 3 Bidang
  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_lpm, sid_ketua, 'Bid. Ekonomi', 1, 10);
  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_lpm, sid_ketua, 'Bid. Sosial', 1, 11);
  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_lpm, sid_ketua, 'Bid. Pembangunan', 1, 12);
END $$;

-- Struktur skeleton PKK
DO $$
DECLARE
  id_pkk INTEGER;
  sid_ketua INTEGER;
BEGIN
  SELECT id INTO id_pkk FROM public.lembaga_desa WHERE slug = 'pkk';
  IF id_pkk IS NULL THEN RETURN; END IF;

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_pkk, NULL, 'Ketua', 0, 1) RETURNING id INTO sid_ketua;

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_pkk, NULL, 'Wakil Ketua', 0, 2);

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_pkk, NULL, 'Sekretaris', 0, 3);

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_pkk, NULL, 'Bendahara', 0, 4);

  -- 5 Kelompok Kerja
  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_pkk, sid_ketua, 'KSE (Kesejahteraan Keluarga)', 1, 10);
  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_pkk, sid_ketua, 'P2K2 (Pangan, Gizi, Kesejahteraan)', 1, 11);
  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_pkk, sid_ketua, 'PKBN (Perencanaan Bekal Keluarga)', 1, 12);
  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_pkk, sid_ketua, 'UP2K (Usaha Perbaikan Keluarga)', 1, 13);
  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_pkk, sid_ketua, 'Karya Wicara', 1, 14);
END $$;

-- Struktur skeleton Karang Taruna
DO $$
DECLARE
  id_kt INTEGER;
BEGIN
  SELECT id INTO id_kt FROM public.lembaga_desa WHERE slug = 'karang-taruna';
  IF id_kt IS NULL THEN RETURN; END IF;

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_kt, NULL, 'Ketua', 0, 1);

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_kt, NULL, 'Wakil Ketua', 0, 2);

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_kt, NULL, 'Sekretaris', 0, 3);

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_kt, NULL, 'Bendahara', 0, 4);

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_kt, NULL, 'Bidang', 0, 5);
END $$;

-- Struktur skeleton BUMDes
DO $$
DECLARE
  id_bd INTEGER;
BEGIN
  SELECT id INTO id_bd FROM public.lembaga_desa WHERE slug = 'bumdes';
  IF id_bd IS NULL THEN RETURN; END IF;

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_bd, NULL, 'Direktur', 0, 1);

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_bd, NULL, 'Sekretaris', 0, 2);

  INSERT INTO public.struktur_lembaga (lembaga_id, parent_id, nama_jabatan, level, urutan)
  VALUES (id_bd, NULL, 'Bidang Usaha', 0, 3);
END $$;
