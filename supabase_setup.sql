-- -----------------------------------------------------------------------------
-- SQL SETUP UNTUK MITRADESA SERUNI MUMBUL (SUPABASE)
-- -----------------------------------------------------------------------------
-- Jalankan seluruh script ini pada menu "SQL Editor" di dashboard Supabase Anda.
-- Ini akan membuat seluruh tabel yang diperlukan untuk sinkronisasi data sistem.
-- -----------------------------------------------------------------------------

-- 1. Tabel Warga (Penduduk)
CREATE TABLE IF NOT EXISTS public.warga (
  nik VARCHAR(16) PRIMARY KEY,
  no_kk VARCHAR(16) NOT NULL,
  nama VARCHAR(255) NOT NULL,
  jenis_kelamin VARCHAR(20),
  tempat_lahir VARCHAR(100),
  tanggal_lahir DATE,
  agama VARCHAR(50),
  pendidikan VARCHAR(100),
  pekerjaan VARCHAR(100),
  alamat TEXT,
  no_hp VARCHAR(20),
  pendapatan_bulan NUMERIC,
  -- Opsional tambahan field
  status_kawin VARCHAR(50),
  kewarganegaraan VARCHAR(50),
  rt VARCHAR(5),
  rw VARCHAR(5),
  dusun VARCHAR(100),
  desa VARCHAR(100),
  kecamatan VARCHAR(100),
  kabupaten VARCHAR(100),
  provinsi VARCHAR(100),
  data_json JSONB DEFAULT '{}'::jsonb, -- Untuk menampung field dinamis/suku/aset dll
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Konten CMS (Polymorphic untuk Berita, Pengumuman, Agenda, Galeri)
CREATE TABLE IF NOT EXISTS public.cms_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'berita', 'pengumuman', 'agenda', 'galeri'
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  excerpt TEXT,
  content TEXT,
  category VARCHAR(100),
  cover_image TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Menampung seluruh data raw untuk lossless IDB restore
  author VARCHAR(100),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing type pada CMS untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_cms_contents_type ON public.cms_contents(type);

-- 3. Tabel Komoditas (Harga Pasar)
CREATE TABLE IF NOT EXISTS public.komoditas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  price NUMERIC NOT NULL,
  unit VARCHAR(50) NOT NULL,
  trend VARCHAR(20),
  change NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Pengaturan Aplikasi (Settings & Surat Master)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Audit Log (Perekaman Aktivitas Admin)
-- Catatan: jika tabel audit_log sudah ada (dari e-surat), ini hanya akan memastikan ekstensinya
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  target_id VARCHAR(255),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- PENGATURAN SECURITY / ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
-- Sebagai awalan, jika Anda tidak ingin mengatur RLS yang kompleks untuk
-- akses publik, kita bisa pastikan service_role bisa baca/tulis, dan
-- anon access bisa membaca jika diperlukan. 
-- (Anda dapat mengkonfigurasi kebijakan ini sesuai keamanan situs Anda)

ALTER TABLE public.warga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.komoditas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Memberikan izin BACA untuk API ANON (Publik) pada CMS, Komoditas, & Settings
CREATE POLICY "Public can view cms_contents" ON public.cms_contents FOR SELECT USING (true);
CREATE POLICY "Public can view komoditas" ON public.komoditas FOR SELECT USING (true);
CREATE POLICY "Public can view app_settings" ON public.app_settings FOR SELECT USING (true);

-- Untuk tabel Warga (Penduduk), sebaiknya anon tidak memiliki akses publik langsung,
-- kecuali melalui backend logic yang Anda kontrol, atau kita asumsikan di project ini anon auth bisa bypass
-- jika menggunakan secret key atau bypass RLS (Gunakan dengan hati-hati!)
CREATE POLICY "Public can view warga (Hati-hati!)" ON public.warga FOR SELECT USING (true);

-- Memberikan izin penuh (Insert/Update/Delete) JIKA menggunakan anon key (Hanya untuk mode DEV/Local)
-- [!!] PERINGATAN: Hapus baris di bawah ini jika aplikasi sudah Production dan RLS diatur ketat!
CREATE POLICY "Anon full access cms_contents" ON public.cms_contents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access komoditas" ON public.komoditas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access warga" ON public.warga FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access audit_log" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);
