-- ============================================================
-- MIGRATION 010: Supabase Storage Bucket — surat-attachments
-- Purpose: Enable real file uploads for surat attachments
--          (replaces base64-in-IndexedDB fallback)
--
-- NOTE: RLS on storage.objects is already enabled by Supabase.
--       DO NOT run "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY"
--       — it will fail with "must be owner of table objects".
--
-- Idempotent: uses DROP POLICY IF EXISTS before CREATE POLICY.
-- Safe to re-run if interrupted or partially applied.
-- ============================================================

-- 1. Create public attachments bucket (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'surat-attachments',
  'surat-attachments',
  true,
  10485760,                         -- 10 MB limit per file
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = 10485760,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 2. Idempotent policy: drop first, then create
drop policy if exists "Authenticated users can upload attachments"
  on storage.objects;
create policy "Authenticated users can upload attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'surat-attachments'
    and (storage.foldername(name))[1] = 'attachments'
  );

-- 3. Idempotent read policy
drop policy if exists "Anyone can read attachments"
  on storage.objects;
create policy "Anyone can read attachments"
  on storage.objects for select
  to public
  using (bucket_id = 'surat-attachments');

-- 4. Idempotent delete policy
drop policy if exists "Authenticated users can delete attachments"
  on storage.objects;
create policy "Authenticated users can delete attachments"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'surat-attachments');
