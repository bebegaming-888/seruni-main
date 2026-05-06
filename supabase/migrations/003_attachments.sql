-- ============================================================
-- MIGRATION 003: Lampiran dokumen (attachments) untuk surat_requests
-- ============================================================
-- Menambah kolom attachments ke surat_requests untuk menyimpan
-- file lampiran (KTP scan, KK scan, surat pengantar RT/RW, dll.)
-- Format: array of objects { name, type, size, data_url(base64) }

alter table public.surat_requests
add column if not exists attachments jsonb default '[]'::jsonb;

comment on column public.surat_requests.attachments is
'Array of attachments [{name, type, size, data_url}] uploaded during form submission';

-- Bikin lebih searchable dengan GIN index
create index if not exists surat_requests_attachments_idx
on public.surat_requests using gin (attachments);

-- ===================================================================
-- FUNGSI: validasi ukuran & tipe lampiran (max 5MB per file, maks 10 file)
-- ===================================================================
create or replace function public.validate_attachments(p_attachments jsonb)
returns boolean language plpgsql security definer as $$
declare
  item jsonb;
  total_size bigint := 0;
begin
  -- Maks 10 lampiran
  if jsonb_array_length(p_attachments) > 10 then
    return false;
  end if;

  -- Cek setiap file
  for item in select * from jsonb_array_elements(p_attachments)
  loop
    -- Size dalam bytes, max 5MB = 5 * 1024 * 1024
    if (item->>'size')::bigint > 5242880 then
      return false;
    end if;
    total_size := total_size + (item->>'size')::bigint;
  end loop;

  -- Total semua lampiran maks 20MB
  if total_size > 20971520 then
    return false;
  end if;

  return true;
end;
$$;

comment on function public.validate_attachments is
'Validate attachment size (max 5MB per file, 20MB total) and count (max 10 files)';