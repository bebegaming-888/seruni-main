-- ============================================================
-- MIGRATION 030: Fix public-media bucket for VIDEO support
--
-- Masalah: bucket public-media hanya allow image/* MIME types.
-- Video upload ditolak Supabase: "mime type video/mp4 is not supported"
--
-- Fix:
--   1. Update bucket allowed_mime_types → include video/*
--   2. Increase file_size_limit: 5 MB → 200 MB
--   3. Update insert policy → TO public (browser anon key)
--   4. Add delete policy → TO public
-- ============================================================

-- ── Update bucket: add video types + raise size limit ───────────────────────
update storage.buckets
set
  public             = true,
  file_size_limit    = 209715200,  -- 200 MB
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/ogg',
    'video/x-msvideo'
  ]
where id = 'public-media';

-- Jika bucket belum ada (fresh install), insert baru
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-media',
  'public-media',
  true,
  209715200,
  array[
    'image/jpeg','image/png','image/webp','image/svg+xml','image/gif',
    'video/mp4','video/webm','video/quicktime','video/ogg','video/x-msvideo'
  ]
)
on conflict (id) do nothing;

-- ── Read policy (public) ─────────────────────────────────────────────────────
drop policy if exists "Anyone can read public-media"
  on storage.objects;
create policy "Anyone can read public-media"
  on storage.objects for select
  to public
  using (bucket_id = 'public-media');

-- ── Insert policy → TO public (browser anon key, NOT authenticated) ───────────
-- App menggunakan custom HMAC session, bukan Supabase Auth.
-- Supabase Auth tidak digunakan di browser → policy harus TO public.
drop policy if exists "Public can upload to public-media"
  on storage.objects;
create policy "Public can upload to public-media"
  on storage.objects for insert
  to public
  with check (bucket_id = 'public-media');

-- ── Delete policy → TO public ───────────────────────────────────────────────
drop policy if exists "Public can delete from public-media"
  on storage.objects;
create policy "Public can delete from public-media"
  on storage.objects for delete
  to public
  using (bucket_id = 'public-media');

-- ── Verify ───────────────────────────────────────────────────────────────────
do $$
declare
  mime text[];
  size bigint;
  pub boolean;
begin
  select allowed_mime_types, file_size_limit, public into mime, size, pub
  from storage.buckets where id = 'public-media';

  if pub is null then
    raise warning 'Bucket public-media not found!';
  else
    raise notice '[OK] Bucket public-media: public=%, size_limit=% bytes, mime_types=%',
      pub, size, mime;
  end if;
end $$;