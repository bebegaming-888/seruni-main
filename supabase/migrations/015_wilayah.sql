-- ============================================================
-- Migration 015: Wilayah Tables — Hapus Hardcode
-- ============================================================
-- Tabel utama: referensi wilayah Indonesia (Kode Kemendagri)
-- Tabel lokal: dusun/RW/RT per desa
-- Seed: Seruni Mumbul (1 village + subdivisi)
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────
-- 1. wilayah  (hierarki: province → regency → district → village)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wilayah (
  id          SERIAL PRIMARY KEY,
  kode        VARCHAR(13) UNIQUE NOT NULL,          -- ex: "5203012001"
  level       VARCHAR(20)  NOT NULL,
  nama        TEXT        NOT NULL,
  parent_kode VARCHAR(13),                          -- null untuk province
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_level CHECK (level IN ('province','regency','district','village'))
);

CREATE INDEX idx_wilayah_kode         ON wilayah(kode);
CREATE INDEX idx_wilayah_parent_kode  ON wilayah(parent_kode);
CREATE INDEX idx_wilayah_level        ON wilayah(level);
CREATE INDEX idx_wilayah_nama         ON wilayah(nama);

-- ─────────────────────────────────────────────
-- 2. village_subdivisions  (dusun/RW/RT per desa)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS village_subdivisions (
  id           SERIAL PRIMARY KEY,
  village_kode VARCHAR(13) NOT NULL,
  level        VARCHAR(10) NOT NULL,               -- 'dusun' | 'rw' | 'rt'
  nama         VARCHAR(20) NOT NULL,              -- "001", "Mandar", dst.
  created_at   TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_village FOREIGN KEY (village_kode)
    REFERENCES wilayah(kode) ON DELETE CASCADE,
  CONSTRAINT unique_village_level_nama
    UNIQUE (village_kode, level, nama),
  CONSTRAINT chk_sub_level CHECK (level IN ('dusun','rw','rt'))
);

CREATE INDEX idx_sub_village_kode ON village_subdivisions(village_kode);
CREATE INDEX idx_sub_level        ON village_subdivisions(level);

-- ─────────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────────
ALTER TABLE wilayah             ENABLE ROW LEVEL SECURITY;
ALTER TABLE village_subdivisions ENABLE ROW LEVEL SECURITY;

-- warga/public: read-only
CREATE POLICY "wilayah_read_all"  ON wilayah             FOR SELECT USING (true);
CREATE POLICY "subdiv_read_all"   ON village_subdivisions FOR SELECT USING (true);

-- Service role: full access (edge functions + admin write)
CREATE POLICY "wilayah_service_all"  ON wilayah             FOR ALL USING (true);
CREATE POLICY "subdiv_service_all"   ON village_subdivisions FOR ALL USING (true);

-- ─────────────────────────────────────────────
-- 4. Seed: Seruni Mumbul (hanya 1 village)
--    Admin bisa tambah via WilayahManager.tsx
-- ─────────────────────────────────────────────
INSERT INTO wilayah (kode, level, nama, parent_kode) VALUES
  ('52',         'province', 'Nusa Tenggara Barat', NULL),
  ('5203',       'regency',  'Lombok Timur',         '52'),
  ('5203012',    'district', 'Pringgabaya',          '5203'),
  ('5203012001', 'village',  'Seruni Mumbul',        '5203012')
ON CONFLICT (kode) DO NOTHING;

INSERT INTO village_subdivisions (village_kode, level, nama) VALUES
  ('5203012001', 'dusun', 'Mandar'),
  ('5203012001', 'dusun', 'Sasak'),
  ('5203012001', 'dusun', 'Dames'),
  ('5203012001', 'dusun', 'Brantapen Asri'),
  ('5203012001', 'rw',    '001'),
  ('5203012001', 'rt',    '001')
ON CONFLICT (village_kode, level, nama) DO NOTHING;

COMMIT;