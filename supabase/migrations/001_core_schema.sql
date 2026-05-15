-- ============================================================
-- MIGRATION 001: Schema Inti — Users, Roles, Warga, Audit Log
-- ============================================================
-- Run di Supabase SQL Editor: https://supabase.com/dashboard

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- Tabel: admin_users
-- ============================================================
create table if not exists public.admin_users (
  id          uuid primary key default uuid_generate_v4(),
  username    text unique not null,
  password    text not null,
  name        text not null,
  email       text,
  role        text not null check (role in ('Super Admin', 'Operator', 'Verifikator', 'Kepala Desa')),
  fixed       boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

-- Trigger auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_users_updated_at on public.admin_users;
create trigger admin_users_updated_at
  before update on public.admin_users
  for each row execute function public.handle_updated_at();

-- Seed akun admin default (password: admin123 → bcrypt hash)
-- Hash dibuat dengan: Deno/Bun: await crypto.subtle.digest('SHA-256', new TextEncoder().encode('admin123'))
-- Atau: https://bcrypt-generator.com
insert into public.admin_users (username, password, name, email, role, fixed)
values (
  'admindesa',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- bcrypt hash "admin123"
  'Admin Desa',
  'admin@desa.id',
  'Super Admin',
  true
) on conflict (username) do nothing;

-- ============================================================
-- Tabel: warga
-- ============================================================
create table if not exists public.warga (
  id            uuid primary key default uuid_generate_v4(),
  nik           char(16) unique not null,
  nama          text not null,
  tempat_lahir  text,
  tanggal_lahir date,
  jenis_kelamin text check (jenis_kelamin in ('Laki-Laki', 'Perempuan')),
  agama         text,
  status_kawin  text,
  pekerjaan     text,
  kewarganegaraan text default 'WNI',
  no_kk         char(16),
  alamat        text,
  rt            char(3),
  rw            char(3),
  dusun         text,
  desa          text default 'Seruni Mumbul',
  kecamatan     text default 'Pringgabaya',
  kabupaten     text default 'Lombok Timur',
  provinsi      text default 'Nusa Tenggara Barat',
  no_hp         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

drop trigger if exists warga_updated_at on public.warga;
create trigger warga_updated_at
  before update on public.warga
  for each row execute function public.handle_updated_at();

-- Index untuk pencarian NIK (lookup paling sering)
create index if not exists warga_nik_idx on public.warga(nik);

-- ============================================================
-- Tabel: surat_requests
-- ============================================================
do $$ begin
  create type surat_status as enum (
    'Menunggu Verifikasi','Diverifikasi','Menunggu Approval',
    'Disetujui','Ditolak'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.surat_requests (
  id          uuid primary key default uuid_generate_v4(),
  no_surat    text unique not null,
  kode        text not null,
  nama_surat  text not null,
  warga_id    uuid references public.warga(id),
  nik         text not null,
  pemohon     text not null,
  kontak      text,
  data_json   jsonb default '{}',
  status      surat_status not null default 'Menunggu Verifikasi',
  catatan     text,
  verified_by text,
  verified_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  signed_at   timestamptz,
  signed_by   text,
  qr_payload  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

drop trigger if exists surat_requests_updated_at on public.surat_requests;
create trigger surat_requests_updated_at
  before update on public.surat_requests
  for each row execute function public.handle_updated_at();

create index if not exists surat_requests_no_surat_idx on public.surat_requests(no_surat);
create index if not exists surat_requests_status_idx on public.surat_requests(status);
create index if not exists surat_requests_nik_idx on public.surat_requests(nik);

-- ============================================================
-- Tabel: audit_log (mirror dari client-side)
-- ============================================================
create table if not exists public.audit_log (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid references public.admin_users(id),
  username  text not null,
  action    text not null,
  detail    text,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx on public.audit_log(created_at desc);

-- ============================================================
-- Tabel: notifications
-- ============================================================
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  warga_id    uuid references public.warga(id),
  nik         text,
  phone       text,
  type        text not null, -- submit | verify | approve | reject
  status      text not null default 'pending', -- pending | sent | failed
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- FUNGSI HELPER: generate nomor surat
-- ============================================================
create or replace function public.generate_surat_number(
  p_kode       text,
  p_prefix     text default '470'
)
returns text language plpgsql security definer as $$
declare
  v_year     text := to_char(now(), 'YYYY');
  v_count    int;
  v_sequence text;
  v_result   text;
begin
  select count(*) + 1 into v_count
  from public.surat_requests
  where extract(year from created_at) = extract(year from now());

  v_sequence := lpad(v_count::text, 4, '0');
  v_result   := v_sequence || '/S-' || p_kode || '/' || p_prefix || '/' || v_year;

  return v_result;
end;
$$;

-- ============================================================
-- ENABLE RLS (Row Level Security)
-- ============================================================
alter table public.admin_users  enable row level security;
alter table public.warga         enable row level security;
alter table public.surat_requests enable row level security;
alter table public.audit_log    enable row level security;
alter table public.notifications enable row level security;

-- ============================================================
-- RLS POLICIES (idempotent — aman dijalankan berulang)
-- ============================================================

-- admin_users
drop policy if exists "Admin read all" on public.admin_users;
create policy "Admin read all" on public.admin_users
  for select using (true);

-- warga
drop policy if exists "Warga lookup by NIK" on public.warga;
create policy "Warga lookup by NIK" on public.warga for select using (true);
drop policy if exists "Admin write warga" on public.warga;
create policy "Admin write warga" on public.warga for insert with check (true);
drop policy if exists "Admin update warga" on public.warga;
create policy "Admin update warga" on public.warga for update using (true);

-- surat_requests
drop policy if exists "Warga read own requests" on public.surat_requests;
create policy "Warga read own requests" on public.surat_requests for select using (true);
drop policy if exists "Admin write surat_requests" on public.surat_requests;
create policy "Admin write surat_requests" on public.surat_requests for insert with check (true);
drop policy if exists "Admin update surat_requests" on public.surat_requests;
create policy "Admin update surat_requests" on public.surat_requests for update using (true);

-- audit_log
drop policy if exists "Admin read audit_log" on public.audit_log;
create policy "Admin read audit_log" on public.audit_log for select using (true);
drop policy if exists "Append audit_log" on public.audit_log;
create policy "Append audit_log" on public.audit_log for insert with check (true);

-- notifications
drop policy if exists "Admin write notifications" on public.notifications;
create policy "Admin write notifications" on public.notifications for all using (true);

-- ============================================================
-- FUNGSI: logging audit dari trigger/RLS
-- ============================================================
create or replace function public.log_audit(
  p_user_id   uuid,
  p_username  text,
  p_action    text,
  p_detail    text default null
)
returns void language plpgsql security definer as $$
begin
  insert into public.audit_log (user_id, username, action, detail)
  values (p_user_id, p_username, p_action, p_detail);
end;
$$;

-- ============================================================
-- GRANT USAGE
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select on public.warga to anon, authenticated;
grant select, insert, update on public.surat_requests to anon, authenticated;
grant select, insert on public.notifications to anon, authenticated;
grant select on public.admin_users to authenticated;
grant select, insert on public.audit_log to authenticated;