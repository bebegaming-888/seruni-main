-- ============================================================
-- MIGRATION 057: Letter Layouts — 100% Configurable Blanko Surat
-- STANDALONE VERSION (includes all dependencies)
-- ============================================================
-- Enables admin-configurable letter layout via dashboard.
-- Replaces hardcoded letter structure in LetterRenderer.tsx
-- and hardcoded signers/rejection reasons.
--
-- Tables: letter_layouts, letter_signers, rejection_reasons,
--         letter_layout_history
-- ============================================================

-- Enable UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- Helper function: handle_updated_at (if not exists)
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Table: letter_signers (replaces hardcoded 2 signer options)
-- ============================================================
create table if not exists public.letter_signers (
  id               uuid primary key default uuid_generate_v4(),
  role             text unique not null,       -- 'kepala_desa', 'sekretaris_desa', dll
  title            text not null,              -- 'Kepala Desa Seruni Mumbul'
  name             text not null,
  nip              text,
  position_order   smallint not null default 0,
  is_active        boolean not null default true,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

-- Auto-update updated_at
drop trigger if exists letter_signers_updated_at on public.letter_signers;
create trigger letter_signers_updated_at
  before update on public.letter_signers
  for each row execute function public.handle_updated_at();

create index if not exists letter_signers_active_idx
  on public.letter_signers(is_active, position_order);

-- RLS
alter table public.letter_signers enable row level security;

create policy "Anyone can view active signers"
  on public.letter_signers for select
  using (is_active = true);

create policy "Admins manage signers"
  on public.letter_signers for all
  using (auth.role() = 'authenticated');

-- Seed default signers
insert into public.letter_signers (role, title, name, nip, position_order) values
  ('kepala_desa', 'Kepala Desa Seruni Mumbul', 'H. SUMARDI, S.Sos.', '196512311985031023', 1),
  ('sekretaris_desa', 'Sekretaris Desa Seruni Mumbul', 'MUHAMMAD YUSUF, S.Sos.', '197001011990031005', 2),
  ('kaur_pemerintahan', 'Kaur Pemerintahan', 'AHMAD FAUZI, S.AP.', '198505152010011008', 3)
on conflict (role) do nothing;

-- ============================================================
-- Table: rejection_reasons (replaces hardcoded 6 reasons)
-- ============================================================
create table if not exists public.rejection_reasons (
  id               uuid primary key default uuid_generate_v4(),
  code             text unique not null,
  reason           text not null,
  category         text,
  is_active        boolean not null default true,
  position_order   smallint not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

drop trigger if exists rejection_reasons_updated_at on public.rejection_reasons;
create trigger rejection_reasons_updated_at
  before update on public.rejection_reasons
  for each row execute function public.handle_updated_at();

create index if not exists rejection_reasons_active_idx
  on public.rejection_reasons(is_active, position_order);

-- RLS
alter table public.rejection_reasons enable row level security;

create policy "Anyone can view active rejection reasons"
  on public.rejection_reasons for select
  using (is_active = true);

create policy "Admins manage rejection reasons"
  on public.rejection_reasons for all
  using (auth.role() = 'authenticated');

-- Seed default rejection reasons (matching original hardcoded list)
insert into public.rejection_reasons (code, reason, category, position_order) values
  ('DOK_TIDAK_LENGKAP', 'Dokumen persyaratan tidak lengkap', 'dokumen', 1),
  ('DATA_TIDAK_VALID', 'Data yang dimasukkan tidak valid', 'data', 2),
  ('FOTO_TIDAK_JELAS', 'Foto/scan dokumen tidak jelas', 'dokumen', 3),
  ('NIK_TIDAK_TERDAFTAR', 'NIK tidak terdaftar di sistem', 'data', 4),
  ('PERSYARATAN_TIDAK_SESUAI', 'Tidak memenuhi persyaratan', 'persyaratan', 5),
  ('LAINNYA', 'Alasan lainnya (lihat catatan)', 'lainnya', 6)
on conflict (code) do nothing;

-- ============================================================
-- Table: letter_layouts (stores complete layout per surat type)
-- ============================================================
-- Note: This assumes surat_types table exists. If not, create it first
-- or remove the foreign key constraint temporarily.

create table if not exists public.letter_layouts (
  id                  uuid primary key default uuid_generate_v4(),
  surat_type_code     text not null,  -- FK to surat_types(code), constraint added later if table exists

  name                text not null,
  description         text,

  -- Layout configuration
  sections            jsonb not null default '[]'::jsonb,
  style               jsonb not null default '{}'::jsonb,

  -- Versioning
  version             smallint not null default 1,
  status              text not null default 'draft'
                        check (status in ('draft', 'active', 'archived')),
  is_default          boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz,
  created_by          uuid
);

-- Add FK constraint only if surat_types exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'surat_types') then
    alter table public.letter_layouts
      drop constraint if exists letter_layouts_surat_type_code_fkey;
    alter table public.letter_layouts
      add constraint letter_layouts_surat_type_code_fkey
      foreign key (surat_type_code) references public.surat_types(code) on delete cascade;
  end if;
end;
$$;

drop trigger if exists letter_layouts_updated_at on public.letter_layouts;
create trigger letter_layouts_updated_at
  before update on public.letter_layouts
  for each row execute function public.handle_updated_at();

-- Only ONE active layout per surat type
create unique index if not exists letter_layouts_active_unique
  on public.letter_layouts(surat_type_code)
  where status = 'active';

create index if not exists letter_layouts_surat_type_idx
  on public.letter_layouts(surat_type_code);
create index if not exists letter_layouts_status_idx
  on public.letter_layouts(status);

-- RLS
alter table public.letter_layouts enable row level security;

-- Public can read active layouts (for rendering)
create policy "Anyone can view layouts"
  on public.letter_layouts for select
  using (true);

create policy "Authenticated manage layouts"
  on public.letter_layouts for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update layouts"
  on public.letter_layouts for update
  using (auth.role() = 'authenticated');

create policy "Authenticated delete layouts"
  on public.letter_layouts for delete
  using (auth.role() = 'authenticated');

-- ============================================================
-- Table: letter_layout_history (versioning audit trail)
-- ============================================================
create table if not exists public.letter_layout_history (
  id           uuid primary key default uuid_generate_v4(),
  layout_id    uuid not null references public.letter_layouts(id) on delete cascade,

  version      smallint not null,
  sections     jsonb not null,
  style        jsonb not null,

  changed_by   uuid,
  change_note  text,
  created_at   timestamptz not null default now(),

  unique(layout_id, version)
);

create index if not exists letter_layout_history_layout_idx
  on public.letter_layout_history(layout_id);

-- RLS
alter table public.letter_layout_history enable row level security;

create policy "Anyone can view layout history"
  on public.letter_layout_history for select
  using (true);

create policy "Authenticated insert history"
  on public.letter_layout_history for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- Helper function: get_active_layout
-- ============================================================
create or replace function public.get_active_layout(p_surat_type_code text)
returns public.letter_layouts
language plpgsql
security definer
as $$
begin
  return (
    select * from public.letter_layouts
    where surat_type_code = p_surat_type_code
      and status = 'active'
    limit 1
  );
end;
$$;

-- ============================================================
-- Helper function: list_active_signers
-- ============================================================
create or replace function public.list_active_signers()
returns setof public.letter_signers
language plpgsql
security definer
as $$
begin
  return query select * from public.letter_signers
    where is_active = true
    order by position_order;
end;
$$;

-- ============================================================
-- Helper function: list_active_rejection_reasons
-- =========================================================
create or replace function public.list_active_rejection_reasons()
returns setof public.rejection_reasons
language plpgsql
security definer
as $$
begin
  return query select * from public.rejection_reasons
    where is_active = true
    order by position_order;
end;
$$;

-- ============================================================
-- Migration marker
-- ============================================================
do $$
begin
  raise notice 'Migration 057 (standalone): letter_layouts system installed. Tables: letter_layouts, letter_signers, rejection_reasons, letter_layout_history';
end;
$$;
