-- ============================================================
-- MIGRATION 011: Add archived column to surat_requests
-- Purpose: Track archive state separately from status
--          (status "Disetujui"/"Ditolak" is semantic; archived is structural)
-- ============================================================

-- Add archived column if not exists
alter table public.surat_requests
  add column if not exists archived boolean not null default false;

-- Index for fast archive queries
create index if not exists surat_requests_archived_idx
  on public.surat_requests(archived) where archived = true;