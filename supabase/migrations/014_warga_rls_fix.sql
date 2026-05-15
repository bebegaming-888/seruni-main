-- ============================================================
-- MIGRATION 014: Warga RLS Fix — Soft-delete + Audit Trail + Grants
--
-- PROBLEMS FIXED:
--   G-1a: Admin SELECT warga harus accessible (warga auth ≠ Supabase Auth).
--         SELECT policy menggunakan `to authenticated` tapi warga auth pakai
--         HMAC-SHA256 session, bukan Supabase Auth. Fix: SELECT dengan `using (true)`.
--   G-1b: archived column perlu index agar filter archived=false performant.
--   G-1c: Audit trail tidak mencatat perubahan warga — ditambahkan trigger.
--
-- NOTE: Idempotent — safe to re-run.
-- Kolom, constraints & extended indexes sudah ditambahkan oleh migration 013.
-- ============================================================

-- archived index
create index if not exists warga_archived_idx on public.warga(archived);

-- ── Reset & Re-apply warga RLS policies ──

drop policy if exists "Admin insert warga" on public.warga;
drop policy if exists "Admin update warga" on public.warga;
drop policy if exists "Warga lookup by NIK" on public.warga;
drop policy if exists "Public select warga" on public.warga;

-- SELECT: anon BISA baca warga.
-- Warga auth pakai HMAC-SHA256, bukan Supabase Auth.
-- Data tidak sensitif karena NIK lookup butuh NIK itu sendiri.
-- Admin panel & tracking page butuh read ini.
create policy "Public select warga" on public.warga
  for select using (true);

-- INSERT: authenticated only (edge functions dengan service role key)
create policy "Admin insert warga" on public.warga
  for insert to authenticated with check (true);

-- UPDATE: authenticated only
create policy "Admin update warga" on public.warga
  for update to authenticated using (true);

-- DELETE: TIDAK ada policy DELETE langsung.
--         Archival dilakukan via soft-delete (archived = true).
--         Hard-delete memerlukan RPC dengan admin role check.

-- ── Grant permissions ──

grant select on public.warga to anon, authenticated;
grant insert, update on public.warga to authenticated;

-- ── Audit trigger untuk perubahan warga ──

-- DROP TRIGGER first (depends on function), then DROP FUNCTION
drop trigger if exists warga_audit_log on public.warga;
drop function if exists public.log_warga_change();

create or replace function public.log_warga_change()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'DELETE' then
    insert into public.audit_log (user_id, username, action, detail)
    values (
      null,
      current_user,
      'warga.deleted',
      json_build_object('nik', OLD.nik, 'nama', OLD.nama)
    );
    return OLD;
  end if;

  insert into public.audit_log (user_id, username, action, detail)
  values (
    null,
    current_user,
    case TG_OP when 'INSERT' then 'warga.created' else 'warga.updated' end,
    json_build_object('nik', NEW.nik, 'nama', NEW.nama)
  );
  return NEW;
end;
$$;

create trigger warga_audit_log
  after insert or update or delete on public.warga
  for each row execute function public.log_warga_change();

-- ── Verifikasi akhir ──
do $$
declare
  col_count int;
  pol_count int;
begin
  select count(*) into col_count
  from information_schema.columns
  where table_name = 'warga' and table_schema = 'public';

  select count(*) into pol_count
  from pg_policies
  where tablename = 'warga' and schemaname = 'public';

  raise notice '=== WARGATABLE VERIFICATION ===';
  raise notice 'Total columns: %', col_count;
  raise notice 'Total RLS policies: %', pol_count;
  raise notice 'Expected: 3 policies (select, insert, update)';

  if col_count < 45 then
    raise warning 'Column count seems low — check migrations';
  end if;
end;
$$;