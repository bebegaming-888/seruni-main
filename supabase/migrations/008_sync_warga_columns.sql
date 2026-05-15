-- ============================================================
-- MIGRATION 008: Extended warga columns + RLS + indexes
-- Extended columns: status_perkawinan, rw, pendidikan, aset, bpjs, dll.
-- Column additions use ADD COLUMN IF NOT EXISTS — idempotent.
-- ============================================================

-- ── 1. Add ALL extended columns to warga table (idempotent — safe to re-run) ──
alter table public.warga
  add column if not exists rw                   text,
  add column if not exists status_perkawinan    text check (status_perkawinan in ('Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati')),
  add column if not exists status_dalam_kk      text,
  add column if not exists pendidikan           text,
  add column if not exists pendapatan_bulan     text,
  add column if not exists suku                 text,
  add column if not exists kepemilikan_rumah    text,
  add column if not exists luas_rumah           text,
  add column if not exists jumlah_lantai        text,
  add column if not exists jenis_lantai         text,
  add column if not exists jenis_dinding        text,
  add column if not exists jenis_atap           text,
  add column if not exists kepemilikan_tanah    text,
  add column if not exists luas_tanah           text,
  add column if not exists penerangan           text,
  add column if not exists sumber_energi_masak  text,
  add column if not exists mck                  text,
  add column if not exists sumber_air           text,
  add column if not exists bantuan_sosial       text,
  add column if not exists bantuan_extra        text,
  add column if not exists bpjs_kesehatan       text,
  add column if not exists bpjs_ketenagakerjaan text,
  add column if not exists kepemilikan_aset     text,
  add column if not exists kondisi_fisik        text,
  add column if not exists nama_ibu             text,
  add column if not exists nama_bapak           text,
  add column if not exists golongan_darah        text check (golongan_darah in ('A', 'B', 'AB', 'O', 'Tidak Diketahui'));

-- ── 2. Sync extended fields from CSV seed (005 already inserted them) ──
-- No action needed — warga-seeds/ seed files wrote all 44 columns directly.
-- This section is kept for projects that ran 008 before 005 CSV seed.

-- ── 3. Drop legacy column (only if still exists) ──
-- Run via DO block so it skips gracefully if column already gone
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'warga' and column_name = 'status_kawin'
  ) then
    alter table public.warga drop column status_kawin;
  end if;
exception when others then null;
end;
$$;

-- ── 4. RLS: ensure warga has both insert + update policies for upsert ──
-- The sync layer uses upsert (insert-or-update), which requires BOTH policies.
drop policy if exists "Admin insert warga" on public.warga;
create policy "Admin insert warga" on public.warga
  for insert to authenticated with check (true);

drop policy if exists "Admin update warga" on public.warga;
create policy "Admin update warga" on public.warga
  for update to authenticated using (true);

drop policy if exists "Warga lookup by NIK" on public.warga;
create policy "Warga lookup by NIK" on public.warga
  for select to authenticated using (true);

-- Allow anon to read warga (public page reads from IndexedDB, but admin panel may need this)
drop policy if exists "Public select warga" on public.warga;
create policy "Public select warga" on public.warga
  for select to anon using (true);

-- ── 5. Indexes for frequently filtered columns ──
create index if not exists warga_dusun_idx            on public.warga(dusun);
create index if not exists warga_status_dalam_kk_idx  on public.warga(status_dalam_kk);
create index if not exists warga_pekerjaan_idx         on public.warga(pekerjaan);
create index if not exists warga_agama_idx            on public.warga(agama);
create index if not exists warga_status_perkawinan_idx on public.warga(status_perkawinan);
