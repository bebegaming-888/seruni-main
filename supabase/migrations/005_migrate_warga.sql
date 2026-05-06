-- ============================================================
-- MIGRATION 005: Migrate mock penduduk → Supabase warga table
-- ============================================================
-- Copy data from PENDUDUK_MOCK di src/data/penduduk.ts ke Supabase.
-- Data berasal dari 5 mock warga demo.

insert into public.warga (
  nik, nama, tempat_lahir, tanggal_lahir, jenis_kelamin,
  agama, status_kawin, pekerjaan, kewarganegaraan, no_kk,
  alamat, rt, rw, dusun, desa, kecamatan, kabupaten, provinsi,
  no_hp
)
values
  (
    '5203011501900001',
    'Ahmad Saifullah',
    'Lombok Timur',
    '1990-01-15',
    'Laki-laki',
    'Islam',
    'Kawin',
    'Petani',
    'WNI',
    '5203011501900003',
    'Jl. Raya Seruni Mumbul No. 12',
    '002', '001', 'Mumbul Timur',
    'Seruni Mumbul', 'Pringgabaya', 'Lombok Timur', 'Nusa Tenggara Barat',
    '081234567890'
  ),
  (
    '5203012203950002',
    'Siti Nurhaliza',
    'Selong',
    '1995-03-22',
    'Perempuan',
    'Islam',
    'Belum Kawin',
    'Mahasiswa',
    'WNI',
    '5203011501900015',
    'Jl. Pendidikan No. 45',
    '001', '002', 'Mumbul Barat',
    'Seruni Mumbul', 'Pringgabaya', 'Lombok Timur', 'Nusa Tenggara Barat',
    '082145678901'
  ),
  (
    '5203011008850003',
    'Lalu Wirajaya',
    'Mataram',
    '1985-08-10',
    'Laki-laki',
    'Islam',
    'Kawin',
    'Wiraswasta',
    'WNI',
    '5203011008850010',
    'Jl. Pasar Lama No. 7',
    '003', '001', 'Mumbul Tengah',
    'Seruni Mumbul', 'Pringgabaya', 'Lombok Timur', 'Nusa Tenggara Barat',
    '087865432109'
  ),
  (
    '5203015602000004',
    'Baiq Anggi Lestari',
    'Lombok Timur',
    '2000-02-16',
    'Perempuan',
    'Islam',
    'Belum Kawin',
    'Karyawan Swasta',
    'WNI',
    '5203015602000010',
    'Jl. Melati Blok C No. 3',
    '004', '002', 'Mumbul Barat',
    'Seruni Mumbul', 'Pringgabaya', 'Lombok Timur', 'Nusa Tenggara Barat',
    '085712345600'
  ),
  (
    '5203012512750005',
    'H. Mahsun Effendi',
    'Pringgabaya',
    '1975-12-25',
    'Laki-laki',
    'Islam',
    'Kawin',
    'PNS',
    'WNI',
    '5203012512750006',
    'Jl. Mawar No. 21',
    '001', '003', 'Mumbul Selatan',
    'Seruni Mumbul', 'Pringgabaya', 'Lombok Timur', 'Nusa Tenggara Barat',
    '081999887766'
  )
on conflict (nik) do update set
  nama           = excluded.nama,
  tempat_lahir   = excluded.tempat_lahir,
  tanggal_lahir   = excluded.tanggal_lahir,
  jenis_kelamin   = excluded.jenis_kelamin,
  agama          = excluded.agama,
  status_kawin   = excluded.status_kawin,
  pekerjaan      = excluded.pekerjaan,
  no_kk          = excluded.no_kk,
  alamat         = excluded.alamat,
  rt             = excluded.rt,
  rw             = excluded.rw,
  dusun          = excluded.dusun,
  no_hp          = excluded.no_hp,
  updated_at     = now();