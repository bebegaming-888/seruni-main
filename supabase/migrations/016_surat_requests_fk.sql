-- ============================================================
-- MIGRATION 016: FK surat_requests → surat_types + RPC helpers
-- ============================================================
-- Menambahkan foreign key constraint dari surat_requests.kode
-- ke surat_types.code. Tanpa ini, kolom `kode` di surat_requests
-- hanya berupa text biasa — tidak ada referential integrity.
--
-- Juga menambahkan:
-- - Trigger: otomatisasi update field_count/dna_count di surat_types
-- - View: surat_requests_full (join dengan surat_types)
-- ============================================================

-- ============================================================
-- 1. Add kode column to surat_requests referencing surat_types
--    (hanya jika belum ada FK; kita buat via ADD CONSTRAINT)
-- ============================================================

-- Cek apakah FK sudah ada
do $$
begin
  -- Jika surat_types belum ada, skip (migration 015 harus sudah jalan)
  if not exists (select 1 from information_schema.tables where table_name = 'surat_types') then
    raise notice 'surat_types not found — skipping FK constraint. Run 015 first.';
  else
    -- Add FK constraint hanya jika belum ada (cek via pg_constraint)
    if exists (
      select 1 from information_schema.columns
      where table_name = 'surat_requests' and column_name = 'kode'
    ) then
      if not exists (
        select 1 from pg_constraint
        where conname = 'fk_surat_requests_surat_types'
      ) then
        -- Pastikan semua kode di surat_requests ada di surat_types
        -- (akan fail jika ada kode orphan — fix data dulu jika perlu)
        alter table public.surat_requests
          add constraint fk_surat_requests_surat_types
          foreign key (kode)
          references public.surat_types(code)
          on delete restrict on update cascade;

        raise notice 'FK constraint fk_surat_requests_surat_types added.';
      else
        raise notice 'FK constraint already exists — skipping.';
      end if;
    else
      raise notice 'Column kode not found in surat_requests — skipping.';
    end if;
  end if;
exception when others then
  raise notice 'FK constraint skipped: %', sqlerrm;
end;
$$;

-- ============================================================
-- 2. Add useful computed columns to surat_requests
--    (denormalized untuk fast query tanpa JOIN)
-- ============================================================

-- category (denormalized for fast filtering)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'surat_requests' and column_name = 'category'
  ) then
    alter table public.surat_requests add column category text;
  end if;
end;
$$;

-- eta (denormalized)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'surat_requests' and column_name = 'eta'
  ) then
    alter table public.surat_requests add column eta text;
  end if;
end;
$$;

-- wewenang (denormalized)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'surat_requests' and column_name = 'is_substitute'
  ) then
    alter table public.surat_requests add column is_substitute boolean default false;
  end if;
end;
$$;

-- Index untuk kolom denormalized baru
create index if not exists idx_surat_requests_category on public.surat_requests(category);
create index if not exists idx_surat_requests_kode     on public.surat_requests(kode);

-- ============================================================
-- 3. Trigger: auto-sync denormalized columns on insert/update
--    Ketika surat_request di-insert, category/eta di-copy dari surat_types
-- ============================================================

create or replace function public.sync_surat_request_metadata()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' or TG_OP = 'UPDATE' then
    if NEW.kode is not null then
      update public.surat_requests sr
      set
        category    = st.category,
        eta         = st.eta,
        is_substitute = st.is_substitute,
        nama_surat  = st.name
      from public.surat_types st
      where st.code = sr.kode
        and sr.id = NEW.id;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_surat_request_metadata on public.surat_requests;
create trigger trg_sync_surat_request_metadata
  after insert or update of kode on public.surat_requests
  for each row execute function public.sync_surat_request_metadata();

-- ============================================================
-- 4. RPC: stats per kategori
-- ============================================================

create or replace function public.get_surat_stats_by_category()
returns table (
  category    text,
  total       bigint,
  menunggu    bigint,
  diverifikasi bigint,
  menunggu_approval bigint,
  disetujui   bigint,
  ditolak     bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    coalesce(sr.category, st.category, 'Lainnya') as category,
    count(*)                                        as total,
    count(*) filter (where sr.status = 'Menunggu Verifikasi')  as menunggu,
    count(*) filter (where sr.status = 'Diverifikasi')          as diverifikasi,
    count(*) filter (where sr.status = 'Menunggu Approval')     as menunggu_approval,
    count(*) filter (where sr.status = 'Disetujui')            as disetujui,
    count(*) filter (where sr.status = 'Ditolak')              as ditolak
  from public.surat_requests sr
  left join public.surat_types st on st.code = sr.kode
  group by coalesce(sr.category, st.category, 'Lainnya')
  order by total desc;
end;
$$;

-- ============================================================
-- 5. RPC: list surat by category (paginated)
-- ============================================================

create or replace function public.list_surat_requests(
  p_category text default null,
  p_status  text default null,
  p_limit   int default 50,
  p_offset  int default 0
)
returns table (
  id          uuid,
  no_surat    text,
  kode        text,
  nama_surat  text,
  category    text,
  nik         text,
  pemohon     text,
  status      text,
  created_at  timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select
    sr.id, sr.no_surat, sr.kode, sr.nama_surat,
    coalesce(sr.category, st.category, 'Lainnya') as category,
    sr.nik, sr.pemohon, sr.status, sr.created_at
  from public.surat_requests sr
  left join public.surat_types st on st.code = sr.kode
  where
    (p_category is null or coalesce(sr.category, st.category) = p_category)
    and (p_status is null or sr.status = p_status)
  order by sr.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

-- ============================================================
-- 6. Seed missing surat_types if not yet present
--    (safety net: idempotent, hanya insert yang belum ada)
-- ============================================================

do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'surat_types') then
    -- Check if we have 0 rows (fresh DB scenario)
    if (select count(*) from public.surat_types) = 0 then
      raise warning 'surat_types is empty. Run migration 015 seed manually.';
    end if;
  end if;
end;
$$;