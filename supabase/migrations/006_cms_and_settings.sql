-- ============================================================
-- MIGRATION 006: CMS Contents & App Settings
-- ============================================================

-- 1. Tabel: app_settings (Generic Key-Value Store)
-- Digunakan untuk: surat_templates, site_branding, fonts, dll.
create table if not exists public.app_settings (
  id          uuid primary key default uuid_generate_v4(),
  key         text unique not null,
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- 2. Tabel: cms_contents (Polymorphic Store for Articles, News, etc.)
create table if not exists public.cms_contents (
  id            uuid primary key default uuid_generate_v4(),
  type          text not null, -- 'berita' | 'pengumuman' | 'agenda' | 'galeri' | 'apbdes'
  slug          text,
  title         text not null,
  excerpt       text,
  content       text, -- HTML Content
  category      text,
  cover_image   text,
  metadata      jsonb default '{}', -- Lossless original object
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

create index if not exists cms_contents_type_idx on public.cms_contents(type);
create index if not exists cms_contents_slug_idx on public.cms_contents(slug);

-- 3. Tabel: komoditas (Simplified Price Tracking)
create table if not exists public.komoditas (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  price       numeric not null default 0,
  unit        text not null default 'kg',
  trend       text check (trend in ('up', 'down', 'stable')) default 'stable',
  change      numeric default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

-- ── Triggers (idempotent) ──
drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.handle_updated_at();

drop trigger if exists cms_contents_updated_at on public.cms_contents;
create trigger cms_contents_updated_at
  before update on public.cms_contents
  for each row execute function public.handle_updated_at();

drop trigger if exists komoditas_updated_at on public.komoditas;
create trigger komoditas_updated_at
  before update on public.komoditas
  for each row execute function public.handle_updated_at();

-- ── RLS Policies (idempotent) ──
alter table public.app_settings enable row level security;
alter table public.cms_contents  enable row level security;
alter table public.komoditas    enable row level security;

drop policy if exists "Public read app_settings" on public.app_settings;
create policy "Public read app_settings" on public.app_settings for select using (true);
drop policy if exists "Public read cms_contents" on public.cms_contents;
create policy "Public read cms_contents" on public.cms_contents  for select using (true);
drop policy if exists "Public read komoditas" on public.komoditas;
create policy "Public read komoditas" on public.komoditas     for select using (true);

drop policy if exists "Admin write app_settings" on public.app_settings;
create policy "Admin write app_settings" on public.app_settings for all using (true);
drop policy if exists "Admin write cms_contents" on public.cms_contents;
create policy "Admin write cms_contents" on public.cms_contents  for all using (true);
drop policy if exists "Admin write komoditas" on public.komoditas;
create policy "Admin write komoditas" on public.komoditas     for all using (true);

-- ── Grant Usage ──
grant select on public.app_settings to anon, authenticated;
grant select on public.cms_contents to anon, authenticated;
grant select on public.komoditas to anon, authenticated;

grant all on public.app_settings to authenticated;
grant all on public.cms_contents to authenticated;
grant all on public.komoditas to authenticated;
