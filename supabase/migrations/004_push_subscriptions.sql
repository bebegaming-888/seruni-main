-- ============================================================
-- MIGRATION 004: Push notification subscriptions
-- ============================================================
-- Menyimpan push subscription per user/browser untuk Web Push API

create table if not exists public.push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.admin_users(id) on delete cascade,
  endpoint    text unique not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.handle_updated_at();

-- RLS: user hanya bisa read/update own subscription
alter table public.push_subscriptions enable row level security;

drop policy if exists "Owner read push subscriptions" on public.push_subscriptions;
create policy "Owner read push subscriptions" on public.push_subscriptions
  for select using (true);

drop policy if exists "Owner insert push subscriptions" on public.push_subscriptions;
create policy "Owner insert push subscriptions" on public.push_subscriptions
  for insert with check (true);

drop policy if exists "Owner update push subscriptions" on public.push_subscriptions;
create policy "Owner update push subscriptions" on public.push_subscriptions
  for update using (true);

drop policy if exists "Owner delete push subscriptions" on public.push_subscriptions;
create policy "Owner delete push subscriptions" on public.push_subscriptions
  for delete using (true);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);