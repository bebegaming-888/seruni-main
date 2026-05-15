-- ============================================================
-- MIGRATION 017: APBDes data storage + monografi data
-- ============================================================
-- Menyimpan data APBDes (Anggaran Pendapatan & Belanja Desa)
-- dan monografi desa di Supabase agar bisa dikelola admin
-- dan ditampilkan publik secara real-time.
--
-- Tabel apbdes_data:
--   - Tahun anggaran (2019-2030)
--   - Status (APBDES, PAD, dll)
--   - Total pendapatan, belanja, pembiayaan
--   - Detail JSON per kategori
--
-- Tabel monografi:
--   - Data statis profil desa (luas, elevation, batas wilayah)
--   - Statistik penduduk per semester
-- ============================================================

-- ⚠️ Drop old broken table (missing realisas column) then recreate
drop table if exists public.apbdes_data cascade;
drop table if exists public.monografi cascade;

-- ─── apbdes_data ──────────────────────────────────────────────────────────
create table if not exists public.apbdes_data (
  id            uuid primary key default gen_random_uuid(),
  tahun         smallint unique not null,
  status        text not null,          -- 'APBDes' / 'Perubahan APBDes' / dll
  total_pendapatan bigint not null default 0,
  total_belanja     bigint not null default 0,
  total_pembiayaan  bigint not null default 0,
  sisa_cadangan      bigint not null default 0,

  -- Detail dalam JSON agar flexible tanpa ubah schema
  -- Pendapatan: { items: [...], total, percent }
  -- Belanja:    { items: [...], total, percent, categories: {...} }
  -- Pembiayaan: { netto, sisa, sumber }
  detail        jsonb not null default '{}',

  -- Realisasi (%)
  -- { pendapatan: {percent, items: {...}}, belanja: {categories: {...}} }
  realisasi     jsonb not null default '{}',

  -- History tren untuk chart 5 tahun
  history       jsonb not null default '[]',

  -- Timestamps
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Auto-update updated_at
drop trigger if exists apbdes_data_updated_at on public.apbdes_data;
create trigger apbdes_data_updated_at
  before update on public.apbdes_data
  for each row execute function public.handle_updated_at();

-- Index
create index if not exists apbdes_data_tahun_idx on public.apbdes_data(tahun);

-- RLS: publik read-only
alter table public.apbdes_data enable row level security;
create policy "apbdes_data_select" on public.apbdes_data for select using (true);
create policy "apbdes_data_manage" on public.apbdes_data
  for all using (true) with check (true);

-- Seed: APBDes 2026 Seruni Mumbul
-- Data persis sama dengan src/data/apbdes.ts
insert into public.apbdes_data (tahun, status, total_pendapatan, total_belanja, total_pembiayaan, sisa_cadangan, detail,realisasi,history)
values (
  2026,
  'APBD',
  2150000000,   -- total_pendapatan  (2.15 M)
  1985000000,   -- total_belanja    (1.985 M — defisit ditutup pembiayaan)
  459000000,    -- total_pembiayaan (belanja - pendapatan = deficit)
  0,            -- sisa_cadangan    (nol — seluruh pembiayaan terpakai)
  $$
  {
    "pendapatan": {
      "items": [
        {"kode":"4.1.01","kategori":"PADesa","label":"Hasil Aset Desa","nilai":85000000},
        {"kode":"4.1.02","kategori":"PADesa","label":"Retribusi","nilai":25000000},
        {"kode":"4.1.03","kategori":"PADesa","label":"Hasil Usaha Desa (BUMDes)","nilai":60000000},
        {"kode":"4.2.01","kategori":"DanaDesa","label":"Dana Desa (DD)","nilai":1020000000},
        {"kode":"4.2.02","kategori":"Alokasi","label":"Alokasi Dana Desa (ADD)","nilai":680000000},
        {"kode":"4.2.03","kategori":"Lainnya","label":"Bagian Hasil Pajak & Retribusi","nilai":90000000},
        {"kode":"4.2.04","kategori":"Lainnya","label":"Bantuan Keuangan Provinsi","nilai":120000000},
        {"kode":"4.2.05","kategori":"Lainnya","label":"Lain-Lain Pendapatan","nilai":70000000}
      ]
    },
    "belanja": {
      "items": [
        {"kode":"5.1.01","kategori":"Penyelenggaraan","label":"Gaji Kepala Desa","nilai":84000000,"bagian":"12 bulan","volumen":"1 Orang"},
        {"kode":"5.1.02","kategori":"Penyelenggaraan","label":"Gaji Sekretariat Desa","nilai":144000000,"bagian":"12 bulan","volumen":"4 Orang"},
        {"kode":"5.1.03","kategori":"Penyelenggaraan","label":"Gaji Kasi & Kader","nilai":180000000,"bagian":"12 bulan","volumen":"6 Orang"},
        {"kode":"5.1.04","kategori":"Penyelenggaraan","label":"Operasi Kantor & Adm.","nilai":48000000,"bagian":"12 bulan"},
        {"kode":"5.1.05","kategori":"Penyelenggaraan","label":"Penyelenggaraan rapat desa","nilai":24000000,"bagian":"12 kegiatan"},
        {"kode":"5.2.01","kategori":"Pelaksanaan","label":"Jalan Desa (RTB & pemeliharaan)","nilai":380000000,"bagian":"2 kegiatan"},
        {"kode":"5.2.02","kategori":"Pelaksanaan","label":"Pembangunan/Peningkatan Irigasi","nilai":250000000,"bagian":"1 kegiatan"},
        {"kode":"5.2.03","kategori":"Pelaksanaan","label":"Pembangunan MCK Umum","nilai":120000000,"bagian":"5 unit"},
        {"kode":"5.2.04","kategori":"Pelaksanaan","label":"Peningkatan Jalan Usaha Tani","nilai":180000000,"bagian":"2 kegiatan"},
        {"kode":"5.2.05","kategori":"Pelaksanaan","label":"Drainase/DES (30%DD)","nilai":120000000,"bagian":"3 kegiatan"},
        {"kode":"5.2.06","kategori":"Pelaksanaan","label":"Pembersihan Embung","nilai":60000000,"bagian":"1 kegiatan"},
        {"kode":"5.3.01","kategori":"Pembinaan","label":"Honorer & Outsourching","nilai":96000000,"bagian":"8 Orang"},
        {"kode":"5.3.02","kategori":"Pembinaan","label":"Kegiatan BPD","nilai":36000000,"bagian":"12 kegiatan"},
        {"kode":"5.3.03","kategori":"Pembinaan","label":"Subsidi transportasi kegiatan","nilai":24000000,"bagian":"12 bulan"},
        {"kode":"5.3.04","kategori":"Pembinaan","label":"Pelatihan & Bimtek","nilai":40000000,"bagian":"4 kegiatan"},
        {"kode":"5.4.01","kategori":"Pemberdayaan","label":"BLT-DD (40% DD)","nilai":408000000,"bagian":"12 bulan","volumen":"40 KK"},
        {"kode":"5.4.02","kategori":"Pemberdayaan","label":"Program Stunting & Gizi","nilai":60000000,"bagian":"4 kegiatan"},
        {"kode":"5.4.03","kategori":"Pemberdayaan","label":"Bantuan Alsintan","nilai":50000000,"bagian":"1 kegiatan"},
        {"kode":"5.4.04","kategori":"Pemberdayaan","label":"Pendampingan UMKM & BUMDes","nilai":45000000,"bagian":"3 kegiatan"},
        {"kode":"5.4.05","kategori":"Pemberdayaan","label":"PKK & Posyandu","nilai":60000000,"bagian":"12 kegiatan"},
        {"kode":"5.5.01","kategori":"TidakTerduga","label":"Dana Cadangan Desa","nilai":120000000,"bagian":"1 tahun"},
        {"kode":"5.5.02","kategori":"TidakTerduga","label":"Penyertaan Modal BUMDes","nilai":80000000,"bagian":"1 kegiatan"}
      ]
    },
    "pembiayaan": {
      "netto": 459000000,
      "sisa": 0,
      "sumber": "SILPA + Pembiayaan Neto"
    }
  }
  $$::jsonb,
  $$
  {
    "pendapatan": {"percent": 55},
    "belanja": {
      "Penyelenggaraan": {"percent": 58},
      "Pelaksanaan":     {"percent": 42},
      "Pembinaan":       {"percent": 47},
      "Pemberdayaan":    {"percent": 45},
      "TidakTerduga":    {"percent": 0}
    }
  }
  $$::jsonb,
  $$
  [
    {"tahun": 2022, "pendapatan": 1850000000, "belanja": 1720000000},
    {"tahun": 2023, "pendapatan": 1950000000, "belanja": 1810000000},
    {"tahun": 2024, "pendapatan": 2050000000, "belanja": 1900000000},
    {"tahun": 2025, "pendapatan": 2100000000, "belanja": 1950000000},
    {"tahun": 2026, "pendapatan": 2150000000, "belanja": 1985000000}
  ]
  $$::jsonb
)
on conflict (tahun) do update set
  status            = excluded.status,
  total_pendapatan  = excluded.total_pendapatan,
  total_belanja     = excluded.total_belanja,
  total_pembiayaan  = excluded.total_pembiayaan,
  sisa_cadangan     = excluded.sisa_cadangan,
  detail            = excluded.detail,
  realisasi = excluded.realisasi,
  history           = excluded.history,
  updated_at        = now();

-- ─── monografi ──────────────────────────────────────────────────────────────
create table if not exists public.monografi (
  id              uuid primary key default gen_random_uuid(),
  semester        text not null,           -- '2026-1' / '2026-2'
  unique (semester),

  -- Identitas wilayah
  kode_desa       text,
  nama_desa       text,
  kecamatan       text,
  kabupaten       text,
  provinsi        text,
  klasifikasi     text default 'Pedesaan',
  luas_wilayah    numeric(10,2),          -- km²
  altitude        numeric(6,1),           -- meter dpi

  -- Batas wilayah
  batas_utara     text,
  batas_selatan   text,
  batas_barat     text,
  batas_timur     text,

  -- Demografi
  jumlah_rw       smallint default 0,
  jumlah_rt       smallint default 0,
  jumlah_dusun    smallint default 0,

  -- Statistik penduduk
  total_penduduk  bigint default 0,
  laki_laki       bigint default 0,
  perempuan       bigint default 0,
  kepala_keluarga bigint default 0,

  -- Rumah tangga
  rumah_tangga    bigint default 0,
  rumah_tetap     bigint default 0,
  rumah_tidak_tetap bigint default 0,

  -- Fasilitas
  count_pendidikan  smallint default 0,
  count_kesehatan    smallint default 0,
  count_ibadah        smallint default 0,

  -- IDM
  idm_score       numeric(5,4),
  idm_status      text,   -- 'Tertinggal' / 'Maju' / 'Mandiri'

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists monografi_updated_at on public.monografi;
create trigger monografi_updated_at
  before update on public.monografi
  for each row execute function public.handle_updated_at();

create index if not exists monografi_semester_idx on public.monografi(semester);

alter table public.monografi enable row level security;
create policy "monografi_select" on public.monografi for select using (true);
create policy "monografi_manage" on public.monografi
  for all using (true) with check (true);

-- Seed: data monografi terkini (data simulasi — ganti dengan data BPS/Desa aktual)
insert into public.monografi (
  semester, kode_desa, nama_desa, kecamatan, kabupaten, provinsi,
  klasifikasi, luas_wilayah, altitude,
  batas_utara, batas_selatan, batas_barat, batas_timur,
  jumlah_rw, jumlah_rt, jumlah_dusun,
  total_penduduk, laki_laki, perempuan, kepala_keluarga,
  rumah_tangga, rumah_tetap, rumah_tidak_tetap,
  count_pendidikan, count_kesehatan, count_ibadah,
  idm_score, idm_status
) values (
  '2026-1',
  '5302032', 'Seruni Mumbul', 'Sembalun', 'Lombok Timur', 'Nusa Tenggara Barat',
  'Pedesaan', 45.72, 650,
  'Gunung Rinjani',
  'Desa Senaru',
  'Kecamatan Sukadana',
  'Desa Suranadi',
  6, 18, 3,
  4287, 2180, 2107, 1284,
  1284, 1260, 24,
  5, 3, 12,
  0.8942, 'Mandiri'
)
on conflict (semester) do update set
  total_penduduk   = excluded.total_penduduk,
  laki_laki        = excluded.laki_laki,
  perempuan        = excluded.perempuan,
  kepala_keluarga  = excluded.kepala_keluarga,
  rumah_tangga     = excluded.rumah_tangga,
  rumah_tetap      = excluded.rumah_tetap,
  idm_score        = excluded.idm_score,
  idm_status       = excluded.idm_status,
  updated_at       = now();