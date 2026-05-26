-- ============================================================
-- MIGRATION 015: Master Jenis Surat (74 Surat Types)
-- SAFE VERSION - Skip if already exists
-- Run in: https://supabase.com/dashboard/project/wrfraskmawmciiutwcpx/sql/new
-- ============================================================

-- Create table (if not exists)
create table if not exists public.surat_types (
  id               uuid primary key default uuid_generate_v4(),
  code             text unique not null,
  name             text not null,
  category         text not null,
  wewenang         boolean not null default true,
  description      text,
  eta              text default '1 hari kerja',
  kode_klasifikasi text,
  is_substitute    boolean not null default false,
  note             text,
  form_fields      jsonb default '[]'::jsonb,
  dna_clauses      jsonb default '[]'::jsonb,
  dna_placeholders text[] default '{}',
  field_count      smallint default 0,
  dna_count        smallint default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

-- Trigger (drop first to avoid conflicts)
drop trigger if exists surat_types_updated_at on public.surat_types;
create trigger surat_types_updated_at
  before update on public.surat_types
  for each row execute function public.handle_updated_at();

-- Indexes (if not exists)
create index if not exists surat_types_code_idx on public.surat_types(code);
create index if not exists surat_types_category_idx on public.surat_types(category);
create index if not exists surat_types_wewenang_idx on public.surat_types(wewenang);
create index if not exists idx_surat_types_gin_fields on public.surat_types using gin(form_fields);
create index if not exists idx_surat_types_gin_placeholders on public.surat_types using gin(dna_placeholders);

-- RLS
alter table public.surat_types enable row level security;

-- Policies (drop first to avoid "already exists" error)
drop policy if exists "surat_types_select" on public.surat_types;
drop policy if exists "surat_types_admin_mutate" on public.surat_types;
drop policy if exists "surat_types_admin_update" on public.surat_types;
drop policy if exists "surat_types_admin_delete" on public.surat_types;

create policy "surat_types_select" on public.surat_types for select using (true);
create policy "surat_types_admin_mutate" on public.surat_types for insert with check (auth.role() = 'authenticated');
create policy "surat_types_admin_update" on public.surat_types for update using (auth.role() = 'authenticated');
create policy "surat_types_admin_delete" on public.surat_types for delete using (auth.role() = 'authenticated');

-- Helper functions (create or replace)
create or replace function public.get_surat_type(p_code text)
returns public.surat_types language plpgsql security definer as $$
begin return (select * frc.surat_types where code = p_code limit 1); end;
$$;

create or replace function public.list_surat_types_by_category(p_category text)
returns setof public.surat_types language plpgsql security definer as $$
begin return query select * from public.surat_types where category = p_category order by name; end;
$$;

create or replace function public.list_all_surat_types()
returns setof public.surat_types language plpgsql security definer as $$
begin return query select * from public.surat_types order by category, name; end;
$$;

-- Done
do $$
begin
  raise notice '✅ Migration 015 complete: surat_types table ready';
n