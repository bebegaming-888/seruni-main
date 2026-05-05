-- ============================================================
-- MIGRATION 002: Warga Auth (NIK + OTP WA)
-- ============================================================
-- Run di Supabase SQL Editorsetelah 001_core_schema.sql

-- ============================================================
-- Tabel: otp_requests — OTP login untuk warga
-- ============================================================
create table if not exists public.otp_requests (
  id          uuid primary key default uuid_generate_v4(),
  warga_id    uuid references public.warga(id) on delete cascade,
  nik         char(16) not null,
  otp_hash    text not null,         -- plaintext OTP (demo); production: bcrypt hash
  expires_at  timestamptz not null,  -- OTP berlaku 5 menit
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Index untuk lookup cepat saat verifikasi
create index if not exists otp_requests_nik_idx on public.otp_requests(nik, used, expires_at desc);

-- ============================================================
-- Tabel: warga_sessions — active login sessions untuk warga
-- ============================================================
create table if not exists public.warga_sessions (
  id          uuid primary key default uuid_generate_v4(),
  warga_id    uuid references public.warga(id) on delete cascade,
  token_hash  text not null,         -- hash dari session token
  expires_at  timestamptz not null,  -- session berlaku 7 hari
  created_at  timestamptz not null default now()
);

create index if not exists warga_sessions_token_idx on public.warga_sessions(token_hash);
create index if not exists warga_sessions_warga_idx on public.warga_sessions(warga_id);

-- ============================================================
-- Tabel: warga_trackings — tracking pengajuan surat per warga
-- ============================================================
create table if not exists public.warga_trackings (
  id              uuid primary key default uuid_generate_v4(),
  warga_id        uuid references public.warga(id) on delete cascade,
  surat_request_id uuid references public.surat_requests(id),
  created_at      timestamptz not null default now()
);

create index if not exists warga_trackings_warga_idx on public.warga_trackings(warga_id);

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================
create trigger otp_requests_updated_at
  before update on public.otp_requests
  for each row execute function public.handle_updated_at();

create trigger warga_sessions_updated_at
  before update on public.warga_sessions
  for each row execute function public.handle_updated_at();

create trigger warga_trackings_updated_at
  before update on public.warga_trackings
  for each row execute function public.handle_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================
alter table public.otp_requests enable row level security;
alter table public.warga_sessions enable row level security;
alter table public.warga_trackings enable row level security;

-- otp_requests: publik bisa insert (request OTP), hanya admin yang bisa select/update
create policy "Public insert otp_requests" on public.otp_requests
  for insert with check (true);

create policy "Admin read otp_requests" on public.otp_requests
  for select using (
    exists (select 1 from public.admin_users where id = auth.uid())
  );

-- warga_sessions: publik bisa insert (create session saat login)
--                hanya session owner yang bisa read session mereka
create policy "Public insert warga_sessions" on public.warga_sessions
  for insert with check (true);

create policy "Warga read own sessions" on public.warga_sessions
  for select using (warga_id = auth.uid());

-- warga_trackings: warga bisa read hanya tracking mereka sendiri
create policy "Warga read own trackings" on public.warga_trackings
  for select using (
    warga_id = auth.uid()
    or exists (select 1 from public.admin_users where id = auth.uid())
  );

create policy "Warga insert trackings" on public.warga_trackings
  for insert with check (warga_id = auth.uid());

-- ============================================================
-- GRANTS
-- ============================================================
grant select, insert on public.otp_requests to anon, authenticated;
grant select, insert on public.warga_sessions to anon, authenticated;
grant select, insert on public.warga_trackings to anon, authenticated;