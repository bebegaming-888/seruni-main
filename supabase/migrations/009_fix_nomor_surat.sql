-- ============================================================
-- MIGRATION 009: Perbaikan Fungsi generate_surat_number
-- Format baru: 474/001/KDS.SRMB/V/2026 (matching formatNomorSurat di frontend)
-- Also fixes race condition with advisory lock
-- ============================================================

-- Drop old function
drop function if exists public.generate_surat_number(text, text);

-- New function: generate sequential letter number per year
-- Format: {kodeKlasifikasi}/{urutan:04d}/{inisialJabatan}.{inisialDesa}/{bulanRomawi}/{tahun}
create or replace function public.generate_surat_number(
  p_kode       text,      -- e.g. "SKD", "SKU" — used to derive klasifikasi
  p_prefix     text default '470'
)
returns text language plpgsql security definer as $$
declare
  v_year     text := to_char(now(), 'YYYY');
  v_month    int  := extract(month from now());
  v_count    int;
  v_sequence text;
  v_result   text;
  v_kode_ktg text;
begin
  -- Advisory lock prevents race condition when two approvals happen simultaneously
  -- Each year gets its own lock via hash
  perform pg_advisory_xact_lock(hashtext('surat_number_' || v_year));

  -- Derive kode klasifikasi from p_kode (e.g. "SKD" → "474")
  -- Default ke p_prefix jika tidak ditemukan
  select
    case lower(p_kode)
      when 'skd'     then '474'
      when 'sku'     then '140'
      when 'sktm'    then '474.6'
      when 'skbm'    then '451'
      when 'sp-ktp'  then '465'
      when 'sp-kk'   then '465.2'
      when 'sp-nikah' then '477'
      when 'skaw'    then '451.1'
      when 'sium'    then '524'
      else coalesce(p_prefix, '474')
    end
  into v_kode_ktg;

  -- Count existing records this year (now protected by advisory lock)
  select count(*) + 1 into v_count
  from public.surat_requests
  where extract(year from created_at) = extract(year from now());

  v_sequence := lpad(v_count::text, 4, '0');
  -- Format: 474/0001/KDS.SRMB/V/2026
  v_result := v_kode_ktg || '/' || v_sequence || '/KDS.SRMB/' ||
               case v_month
                 when  1 then 'I'
                 when  2 then 'II'
                 when  3 then 'III'
                 when  4 then 'IV'
                 when  5 then 'V'
                 when  6 then 'VI'
                 when  7 then 'VII'
                 when  8 then 'VIII'
                 when  9 then 'IX'
                 when 10 then 'X'
                 when 11 then 'XI'
                 when 12 then 'XII'
                 else 'I'
               end || '/' || v_year;

  return v_result;
end;
$$;

-- Grant execute to authenticated roles
grant execute on function public.generate_surat_number(text, text) to authenticated;
grant execute on function public.generate_surat_number(text, text) to anon;
