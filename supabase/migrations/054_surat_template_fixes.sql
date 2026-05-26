-- ============================================================
-- MIGRATION 054: Surat Template Fixes (Realtime & Permissions)
-- ============================================================
-- Fix issues where surat_template was not broadcasting realtime changes
-- and explicit SELECT privileges were missing for anon users.

-- 1. Tambahkan surat_template ke publikasi realtime Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.surat_template;

-- 2. Pastikan role anon dan authenticated memiliki privilege SELECT dasar
-- (Kebijakan RLS "Public read approved surat_template" tetap berlaku sebagai filter)
GRANT SELECT ON public.surat_template TO anon, authenticated;
