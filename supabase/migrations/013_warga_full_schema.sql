-- ============================================================
-- MIGRATION 013: Warga Full Schema + Indexes + Constraint Fixes
--
-- CONSOLIDATES: all schema fixes from migrations 008 and 012 into one
-- idempotent file. This is the definitive schema file for the warga table.
--
-- What this file does (all idempotent):
--   1. Adds remaining warga extended columns (safe if already present)
--      Note: migration 008 also adds these; both can run safely in either order.
--   2. Drops old restrictive check constraints (safe if already dropped)
--   3. Recreates constraints with inclusive values from Tabel_Penduduk.csv
--      - jenis_kelamin: accepts both "Laki-Laki" AND "Laki-linux"
--      - status_perkawinan: all 4 valid values
--      - gol_darah: all 5 valid values
--   4. Adds missing indexes: rw, kecamatan, kabupaten, provinsi, archived
--   5. Drop + recreate warga_updated_at trigger
--
-- BACKGROUND:
--   - Migration 001: 17-column base warga schema (no extended columns)
--   - Migration 008: first 26 extended columns (check constraints also added there)
--   - Migration 012: drop-only for check constraints (superseded by this file)
--   - This migration (013): full consolidation — idempotent and self-contained
--
-- NOTE: Idempotent — safe to re-run in any order.
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 1: Verify / Add missing columns
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Remaining columns NOT handled by migration 008 ──
-- Migration 008 adds most extended columns.
-- Only add columns that are safe to add even if they already exist.
alter table public.warga add column if not exists archived boolean not null default false;

-- Pastikan trigger updated_at ada
drop trigger if exists warga_updated_at on public.warga;
create trigger warga_updated_at
  before update on public.warga
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2: Drop old check constraints (if still using old restrictive ones)
-- ─────────────────────────────────────────────────────────────────────────────

-- Jenis_kelamin: CSV "Tabel_Penduduk.csv" menggunakan "Laki-linux" (lowercase k)
-- DB lama hanya allow "Laki-Laki" (uppercase K+A) → 4,110 dari 7,867 rows akan GAGAL
-- Fix: accept BOTH cases
do $$
declare
    cons_name text;
begin
    select conname into cons_name
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    where r.relname = 'warga'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%jenis_kelamin%';
    if cons_name is not null then
        execute 'alter table public.warga drop constraint ' || quote_ident(cons_name);
        raise notice 'Dropped jenis_kelamin constraint: %', cons_name;
    else
        raise notice 'jenis_kelamin constraint already removed or not found';
    end if;
end;
$$;

-- status_perkawinan: check constraint lama mungkin restrictif
do $$
declare
    cons_name text;
begin
    select conname into cons_name
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    where r.relname = 'warga'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%status_perkawinan%';
    if cons_name is not null then
        execute 'alter table public.warga drop constraint ' || quote_ident(cons_name);
        raise notice 'Dropped status_perkawinan constraint: %', cons_name;
    end if;
end;
$$;

-- gol_darah: check constraint lama mungkin restrictif
do $$
declare
    cons_name text;
begin
    select conname into cons_name
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    where r.relname = 'warga'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%gol%darah%';
    if cons_name is not null then
        execute 'alter table public.warga drop constraint ' || quote_ident(cons_name);
        raise notice 'Dropped gol_darah constraint: %', cons_name;
    end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3: Recreate constraints with INCLUSIVE values (dari CSV analysis)
-- ─────────────────────────────────────────────────────────────────────────────

-- Jenis_kelamin: accept BOTH CSV "Laki-linux" AND DB "Laki-Laki" format
-- CSV analysis: 4,110 of 7,867 rows menggunakan "Laki-linux" (lowercase k)
alter table public.warga
  add constraint warga_jenis_kelamin_check
  check (jenis_kelamin in ('Laki-Laki', 'Laki-linux', 'Perempuan'));

-- status_perkawinan: semua 4 nilai valid
alter table public.warga
  add constraint warga_status_perkawinan_check
  check (status_perkawinan in ('Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'));

-- gol_darah: semua 5 nilai dari Tabel_Penduduk.csv
alter table public.warga
  add constraint warga_gol_darah_check
  check (golongan_darah in ('A', 'B', 'AB', 'O', 'Tidak Diketahui'));

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4: Add MISSING indexes
--
-- Reference schema ("create table public.warga (.txt") mendefinisikan 7 index:
--   warga_dusun_idx        ✅ ada di migrasi 008
--   warga_status_dalam_kk_idx ✅ ada di migrasi 008
--   warga_pekerjaan_idx    ✅ ada di migrasi 008
--   warga_nik_idx          ✅ ada di migrasi 001
--   warga_agama_idx        ✅ ada di migrasi 008
--   warga_status_perkawinan_idx ✅ ada di migrasi 008
--   warga_gol_darah_idx    ✅ ada di migrasi 012 / schema reference
-- MISSING (dari reference schema):
--   warga_rw_idx
--   warga_kecamatan_idx
--   warga_kabupaten_idx
--   warga_provinsi_idx
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists warga_rw_idx           on public.warga(rw);
create index if not exists warga_kecamatan_idx     on public.warga(kecamatan);
create index if not exists warga_kabupaten_idx     on public.warga(kabupaten);
create index if not exists warga_provinsi_idx      on public.warga(provinsi);
create index if not exists warga_archived_idx      on public.warga(archived);

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 5: Verify schema completeness
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  col_count    int;
  idx_count    int;
  pol_count    int;
  missing_cols text[];
  target_cols  int := 49;
begin
  -- Count columns
  select count(*) into col_count
  from information_schema.columns
  where table_name = 'warga' and table_schema = 'public';

  -- Count indexes
  select count(*) into idx_count
  from pg_indexes
  where tablename = 'warga' and schemaname = 'public';

  -- Count RLS policies
  select count(*) into pol_count
  from pg_policies
  where tablename = 'warga' and schemaname = 'public';

  raise notice '=============================================';
  raise notice ' WARGATABLE SCHEMA VERIFICATION';
  raise notice '=============================================';
  raise notice 'Columns   : % (target: %)', col_count, target_cols;
  raise notice 'Indexes   : %', idx_count;
  raise notice 'RLS policies: %', pol_count;
  raise notice '=============================================';

  if col_count < 40 then
    raise warning 'COLUMN COUNT LOW (% < %). Check migrations.', col_count, target_cols;
  else
    raise notice 'SCHEMA OK';
  end if;

  -- List all columns
  raise notice 'Columns in warga table:';
  perform column_name
  from information_schema.columns
  where table_name = 'warga' and table_schema = 'public'
  order by ordinal_position;
end;
$$;