-- Seed Data for E-Surat System
-- Project: MitraDesa / Seruni Mumbul

-- 1. Seed Warga (Residents)
INSERT INTO public.warga (
  nik, no_kk, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, 
  agama, pendidikan, pekerjaan, status_perkawinan, status_dalam_kk,
  kewarganegaraan, nama_ayah, nama_ibu, golongan_darah, alamat, rt, rw, dusun
) VALUES 
('5203011501900001', '5203011501900003', 'Ahmad Saifullah', 'Laki-Laki', 'Lombok Timur', '1990-01-15', 'Islam', 'SD/Sederajat', 'Petani', 'Kawin', 'Kepala Keluarga', 'Indonesia', 'Muhammad Ali', 'Fatimah', 'O', 'Jl. Raya Seruni Mumbul No. 12', '002', '001', 'Mumbul Timur'),
('5203012203950002', '5203011501900015', 'Siti Nurhaliza', 'Perempuan', 'Selong', '1995-03-22', 'Islam', 'SMA/Sederajat', 'Pelajar/Mahasiswa', 'Belum Kawin', 'Anak', 'Indonesia', 'Lalu Suherman', 'Rohani', 'A', 'Jl. Pendidikan No. 45', '001', '002', 'Mumbul Barat'),
('5203011008850003', '5203011008850010', 'Lalu Wirajaya', 'Laki-Laki', 'Mataram', '1985-08-10', 'Islam', 'SMA/Sederajat', 'Wiraswasta', 'Kawin', 'Kepala Keluarga', 'Indonesia', 'Amaq Sahril', 'Inaq Murni', 'B', 'Jl. Pasar Lama No. 7', '003', '001', 'Mumbul Tengah')
ON CONFLICT (nik) DO NOTHING;

-- 2. Seed Admin Users
INSERT INTO public.admin_users (username, password_hash, name, role)
VALUES ('admindesa', 'admin123', 'Admin Desa', 'Super Admin')
ON CONFLICT (username) DO NOTHING;

-- 3. Seed Surat Templates
-- Kategori: pelayanan_publik
-- SKD (Surat Keterangan Domisili)
INSERT INTO public.surat_template (kode_surat, nama_surat, kategori_surat, field_key, label_field, tipe_field, sumber, wajib)
VALUES 
('SKD', 'Surat Keterangan Domisili', 'pelayanan_publik', 'keperluan', 'Keperluan', 'textarea', 'input', true),
('SKD', 'Surat Keterangan Domisili', 'pelayanan_publik', 'lama_tinggal', 'Lama Tinggal', 'text', 'input', true)
ON CONFLICT (kode_surat, field_key) DO NOTHING;

-- SKU (Surat Keterangan Usaha)
INSERT INTO public.surat_template (kode_surat, nama_surat, kategori_surat, field_key, label_field, tipe_field, sumber, wajib)
VALUES 
('SKU', 'Surat Keterangan Usaha', 'pelayanan_publik', 'nama_usaha', 'Nama Usaha', 'text', 'input', true),
('SKU', 'Surat Keterangan Usaha', 'pelayanan_publik', 'jenis_usaha', 'Jenis Usaha', 'text', 'input', true),
('SKU', 'Surat Keterangan Usaha', 'pelayanan_publik', 'alamat_usaha', 'Alamat Usaha', 'textarea', 'input', true)
ON CONFLICT (kode_surat, field_key) DO NOTHING;

-- SKTM (Surat Keterangan Tidak Mampu)
INSERT INTO public.surat_template (kode_surat, nama_surat, kategori_surat, field_key, label_field, tipe_field, sumber, wajib)
VALUES 
('SKTM', 'Surat Keterangan Tidak Mampu', 'sosial', 'keperluan', 'Keperluan', 'textarea', 'input', true),
('SKTM', 'Surat Keterangan Tidak Mampu', 'sosial', 'nama_anak', 'Nama Anak', 'text', 'input', false),
('SKTM', 'Surat Keterangan Tidak Mampu', 'sosial', 'sekolah', 'Sekolah/Instansi', 'text', 'input', false)
ON CONFLICT (kode_surat, field_key) DO NOTHING;
