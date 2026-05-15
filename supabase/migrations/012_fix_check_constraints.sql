-- ============================================================
-- MIGRATION 012: Fix Check Constraints for Tabel_Penduduk.csv
--
-- DEPRECATED in favour of migration 013 which includes the same drops
-- PLUS correct recreations + complete warga schema in one file.
-- Kept here for projects that ran 012 before 013 was created.
--
-- What this file does:
--   - DROPs old restrictive check constraints (jenis_kelamin, status_perkawinan, gol_darah)
--   - Correct recreations are handled by migration 013
--     (migration 013 is idempotent and safe to run regardless of 012)
--
-- NOTE: If migration 013 has already been run, this file is a no-op for constraints.
-- ============================================================

-- ── Part A: Fix ALIASES mapping ─────────────────────────────────────────────
-- (This is a code fix comment only — the actual fix is in smart-import.ts)

-- OLD (broken): "status kawin": "status_nikah"
-- NEW:          "status kawin": "status_perkawinan"
-- ────────────────────────────────────────────────────────────────────────────────

-- ── Part B: Drop old check constraints ────────────────────────────────────

-- Drop jenis_kelamin constraint (find by column name pattern)
do $$
declare
    cons_name text;
begin
    select conname into cons_name
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    join pg_class r on r.oid = c.conrelid
    where r.relname = 'warga'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%jenis_kelamin%';
    if cons_name is not null then
        execute 'alter table public.warga drop constraint ' || quote_ident(cons_name);
        raise notice 'Dropped: %', cons_name;
    else
        raise notice 'jenis_kelamin constraint not found';
    end if;
end;
$$;

-- Drop status_perkawinan constraint
do $$
declare
    cons_name text;
begin
    select conname into cons_name
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    join pg_class r on r.oid = c.conrelid
    where r.relname = 'warga'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%status_perkawinan%';
    if cons_name is not null then
        execute 'alter table public.warga drop constraint ' || quote_ident(cons_name);
        raise notice 'Dropped: %', cons_name;
    else
        raise notice 'status_perkawinan constraint not found';
    end if;
end;
$$;

-- Drop gol_darah constraint
do $$
declare
    cons_name text;
begin
    select conname into cons_name
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    join pg_class r on r.oid = c.conrelid
    where r.relname = 'warga'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%gol%darah%';
    if cons_name is not null then
        execute 'alter table public.warga drop constraint ' || quote_ident(cons_name);
        raise notice 'Dropped: %', cons_name;
    else
        raise notice 'golongan_darah constraint not found';
    end if;
end;
$$;

-- ── Part C: Recreate constraints with inclusive values ─────────────────────

-- jenis_kelamin: accept both CSV ("Laki-laki") AND DB format ("Laki-Laki")
alter table public.warga
  add constraint warga_jenis_kelamin_check
  check (jenis_kelamin in ('Laki-Laki', 'Laki-laki', 'Perempuan'));

-- status_perkawinan: accept all 4 valid values
alter table public.warga
  add constraint warga_status_perkawinan_check
  check (status_perkawinan in ('Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'));

-- gol_darah: accept all values found in Tabel_Penduduk.csv
alter table public.warga
  add constraint warga_gol_darah_check
  check (golongan_darah in ('A', 'B', 'AB', 'O', 'Tidak Diketahui'));
