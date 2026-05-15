-- ============================================================
-- MIGRATION 019: Public Media Storage — Upload Gambar via Perangkat
-- ============================================================
-- Semua gambar/logo/foto diupload ke Supabase Storage, bukan URL.
--
-- Buckets:
--   - public-media  → logo, favicon, berita cover, hero slide, kop surat logo
--   - perangkat-fotos → foto perangkat desa
--
-- Catatan:
--   - RLS pada storage.objects sudah di-enable oleh Supabase.
--   - Jangan jalankan "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY"
--     karena hanya owner tabel yang bisa menjalankan itu.
--   - Idempotent: DROP POLICY IF EXISTS sebelum CREATE POLICY.
-- ============================================================

-- ── 1. Bucket: public-media ────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-media',
  'public-media',
  true,
  5242880,                                  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- RLS: siapa saja bisa baca
drop policy if exists "Anyone can read public-media"
  on storage.objects;
create policy "Anyone can read public-media"
  on storage.objects for select
  to public
  using (bucket_id = 'public-media');

-- RLS: admin / service role bisa upload
drop policy if exists "Admins can upload public-media"
  on storage.objects;
create policy "Admins can upload public-media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'public-media');

-- RLS: admin bisa hapus
drop policy if exists "Admins can delete public-media"
  on storage.objects;
create policy "Admins can delete public-media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'public-media');

-- ── 2. Bucket: perangkat-fotos ────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'perangkat-fotos',
  'perangkat-fotos',
  true,
  5242880,                                  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- RLS: siapa saja bisa baca
drop policy if exists "Anyone can read perangkat-fotos"
  on storage.objects;
create policy "Anyone can read perangkat-fotos"
  on storage.objects for select
  to public
  using (bucket_id = 'perangkat-fotos');

-- RLS: admin / service role bisa upload
drop policy if exists "Admins can upload perangkat-fotos"
  on storage.objects;
create policy "Admins can upload perangkat-fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'perangkat-fotos');

-- RLS: admin bisa hapus
drop policy if exists "Admins can delete perangkat-fotos"
  on storage.objects;
create policy "Admins can delete perangkat-fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'perangkat-fotos');

-- ── 3. Tabel perangkat_desa: tambah kolom storage path untuk foto ─────────
alter table public.perangkat_desa
  add column if not exists foto_storage_path text;

create index if not exists idx_perangkat_foto_storage_path
  on public.perangkat_desa(foto_storage_path)
  where foto_storage_path is not null;

-- ── 4. Tabel app_settings: tambah storage path untuk logo ──────────────────
-- Settings diserialisasi sebagai JSONB di kolom `value` (baris key='main_settings').
-- Kita simpan logo_storage_path di dalam JSON value tersebut.
-- Tidak perlu alter table — storage_path disimpan dalam kolom JSONB `value`.
-- ============================================================