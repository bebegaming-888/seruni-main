-- Migration 022: Tabel Pengaduan
-- Sistem pelaporan dan aspirasi warga ke Pemerintah Desa
-- Auto-eskalasi ke WA Verifikator saat pengaduan baru masuk

DROP TABLE IF EXISTS pengaduan CASCADE;

CREATE TABLE pengaduan (
  id          SERIAL PRIMARY KEY,
  ticket      TEXT UNIQUE NOT NULL,   -- format: MD-XXXX (display only)
  nama        TEXT NOT NULL,
  nik         TEXT,
  kontak      TEXT NOT NULL,
  kategori    TEXT NOT NULL CHECK (kategori IN (
    'Infrastruktur & Jalan',
    'Pelayanan Publik',
    'Keamanan & Ketertiban',
    'Kesehatan & Kebersihan',
    'Bantuan Sosial',
    'Lingkungan Hidup',
    'Pertanahan',
    'Lainnya'
  )),
  judul       TEXT NOT NULL,
  isi         TEXT NOT NULL,
  lampiran_url TEXT,                  -- path ke Supabase Storage (opsional)
  status      TEXT NOT NULL DEFAULT 'Baru'
              CHECK (status IN ('Baru', 'Diproses', 'Selesai', 'Ditolak')),
  prioritas   TEXT DEFAULT 'Normal'
              CHECK (prioritas IN ('Rendah', 'Normal', 'Tinggi', 'Urgent')),
  admin_catatan TEXT,
  admin_tindak TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_pengaduan_ticket   ON pengaduan(ticket);
CREATE INDEX idx_pengaduan_status   ON pengaduan(status);
CREATE INDEX idx_pengaduan_created  ON pengaduan(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_pengaduan_updated
  BEFORE UPDATE ON pengaduan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE pengaduan ENABLE ROW LEVEL SECURITY;

-- Publik: SELECT semua (data NIK/kontak di-mask di UI), INSERT sendiri
CREATE POLICY "anyone_read_pengaduan"
  ON pengaduan FOR SELECT TO anon
  USING (true);

CREATE POLICY "anyone_insert_pengaduan"
  ON pengaduan FOR INSERT TO anon
  WITH CHECK (true);

-- Authenticated: update status + catatan
CREATE POLICY "admin_manage_pengaduan"
  ON pengaduan FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed category labels
COMMENT ON TABLE pengaduan IS 'Tabel pengaduan/aspirasi masyarakat ke Pemerintah Desa. Eskalasi WA via scheduled function.';
COMMENT ON COLUMN pengaduan.ticket     IS 'Nomor tiket display: MD-XXXX (tidak sekuensial, 4 random digit)';
COMMENT ON COLUMN pengaduan.prioritas IS 'Normal=otomatis baru, Tinggi/Urgent=eskalasi segera ke WA';
