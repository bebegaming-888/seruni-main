-- ============================================================
-- MIGRATION 058: WILAYAH TABLE
-- Hierarchical administrative area data (Desa, Kecamatan, Kabupaten)
-- Used by letter layouts for kop surat, signature, and village info
-- ============================================================

create table if not exists public.wilayah (
  id          uuid primary key default uuid_generate_v4(),
  level       text not null check (level in ('provinsi', 'kabupaten', 'kecamatan', 'desa')),
  kode        text unique not null,
  nama        text not null,
  parent_kode text,
  data        jsonb default '{}'::jsonb,
  is_active   boolean not null default true,
  position    smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

drop trigger if exists wilayah_updated_at on public.wilayah;
create trigger wilayah_updated_at
  before update on public.wilayah
  for each row execute function public.handle_updated_at();

create index if not exists wilayah_level_idx on public.wilayah(level);
create index if not exists wilayah_parent_idx on public.wilayah(parent_kode);
create index if not exists wilayah_kode_idx on public.wilayah(kode);

alter table public.wilayah enable row level security;
create policy "Anyone can view wilayah"
  on public.wilayah for select using (true);
create policy "Authenticated manage wilayah"
  on public.wilayah for all using (auth.role() = 'authenticated');

-- Helper function: get_wilayah_by_level
create or replace function public.get_wilayah_by_level(p_level text)
returns setof public.wilayah language plpgsql security definer as $$
begin
  return query select * from public.wilayah where level = p_level and is_active = true order by position, nama;
end;
$$;

-- Helper function: get_child_wilayah
create or replace function public.get_child_wilayah(p_parent_kode text)
returns setof public.wilayah language plpgsql security definer as $$
begin
  return query select * from public.wilayah where parent_kode = p_parent_kode and is_active = true order by position, nama;
end;
$$;

-- Helper function: get_desa (main village)
create or replace function public.get_desa()
returns public.wilayah language plpgsql security definer as $$
begin
  return (select * from public.wilayah where level = 'desa' and is_active = true order by position limit 1);
end;
$$;