# APPLY_MIGRATION_GUIDE.md

## Cara Apply Migration ke Supabase Production

Karena tidak ada Supabase CLI yang terhubung ke project, apply manual via **Supabase Dashboard → SQL Editor**.

---

## Migrations yang Sudah Disimpan (37 files, 20 dihapus sebagai obsolete)

Semua file valid ada di: `supabase/migrations/`

### Migration Urutan (harus berurutan):

Gunakan panduan ini untuk apply manual atau cek apakah sudah pernah diterapkan.

| #   | File                                       | Fungsi                                                                   |
| --- | ------------------------------------------ | ------------------------------------------------------------------------ |
| 1   | `001_core_schema.sql`                      | Tabel inti: admin_users, warga, surat_requests, audit_log, notifications |
| 2   | `002_warga_auth.sql`                       | OTP requests, warga_sessions, warga_trackings                            |
| 3   | `003_attachments.sql`                      | Kolom attachments + fungsi validate_attachments()                        |
| 4   | `004_push_subscriptions.sql`               | Tabel push_subscriptions untuk Web Push                                  |
| 5   | `005_migrate_warga.sql`                    | Migrasi data warga                                                       |
| 6   | `006_cms_and_settings.sql`                 | app_settings, cms_contents, komoditas                                    |
| 8   | `008_sync_warga_columns.sql`               | Kolom tambahan warga (rw, pendidikan, bpjs, dll)                         |
| 9   | `009_fix_nomor_surat.sql`                  | generate_surat_number()                                                  |
| 10  | `010_storage_attachments.sql`              | Storage bucket surat-attachments                                         |
| 11  | `011_add_archived_column.sql`              | archived column pada surat_requests                                      |
| 13  | `013_warga_full_schema.sql`                | Schema lengkap warga (constraints + indexes)                             |
| 14  | `014_warga_rls_fix.sql`                    | RLS policies untuk warga                                                 |
| 15  | `015_surat_types.sql`                      | 74 jenis surat (seed data)                                               |
| 15  | `015_wilayah.sql`                          | Tabel wilayah + village_subdivisions                                     |
| 17  | `017_apbdes_monografi.sql`                 | APBDes + monografi                                                       |
| 19  | `019_public_media_storage.sql`             | Storage buckets public-media + perangkat-fotos                           |
| 20  | `020_lembaga_desa.sql`                     | Lembaga Desa                                                             |
| 21  | `021_perangkat_tree.sql`                   | Perangkat Desa (tree structure)                                          |
| 22  | `022_pengaduan.sql`                        | Pengaduan                                                                |
| 29  | `029_hero_config.sql`                      | Hero config                                                              |
| 30  | `030_fix_public_media_video.sql`           | MIME types untuk video                                                   |
| 31  | `031_surat_requests_perf_index.sql`        | Index performa untuk dashboard                                           |
| 32  | `032_add_rejection_and_edit_fields.sql`    | Kolom foto_selfie, rejection_reasons, edit_history                       |
| 33  | `033_marketplace_orders.sql`               | Marketplace orders                                                       |
| 34  | `034_security_hardening.sql`               | Security fix: marketplace RLS + admin_users_public view                  |
| 35  | `035_otp_rate_limit.sql`                   | OTP rate limits table + check_otp_rate_limit()                           |
| 38  | `038_warga_session_expiry.sql`             | Partial indexes + cleanup expired sessions                               |
| 39  | `039_enforce_surat_status_transitions.sql` | Trigger enforce_surat_status_transition                                  |
| 40  | `040_fix_track_surat_pdp.sql`              | PDP compliance — column allowlist                                        |
| 41  | `041_nomor_surat_counter.sql`              | Atomic counter untuk nomor surat                                         |
| 42  | `042_seed_surat_templates.sql`             | Surat template seed (4 contoh)                                           |
| 43  | `043_seed_super_admin.sql`                 | Admin accounts (supadmin, admindesa)                                     |
| 47  | `047_fix_trigger_infinite_loop.sql`        | CRITICAL: Fix infinite loop trigger                                      |
| 49  | `049_warga_otp_atomic_verify.sql`          | Atomic OTP verification                                                  |
| 50  | `050_admin_user_delete_rpc.sql`            | Admin delete RPC                                                         |
| 51  | `051_admin_user_upsert_rpc.sql`            | Admin upsert RPC                                                         |
| 52  | `052_security_consolidation.sql`           | **FINAL** security state — revoke anon from admin_users_public           |
| 53  | `053_surat_submit_security.sql`            | submission_rate_limit + version audit trail                              |
| 54  | `054_surat_template_fixes.sql`             | Realtime + SELECT grants                                                 |
| 55  | `055_fix_otp_rate_limit_rls.sql`           | H-03: Revoke check_otp_rate_limit from anon                              |
| 56  | `056_session_revocation.sql`               | **H-02: Session revocation table**                                       |

---

## ⚠️ CRITICAL: Yang Harus Di-Apply Sekarang

Jika migration belum pernah berjalan, berikut **prioritas apply**:

### Priority 1: Security Fixes (WAJIB)

```
055_fix_otp_rate_limit_rls.sql  ← OTP rate limit bypass fix (H-03)
056_session_revocation.sql     ← Session revocation table (H-02)
```

### Priority 2: Critical Bug Fixes

```
047_fix_trigger_infinite_loop.sql  ← Infinite loop on surat_requests
041_nomor_surat_counter.sql       ← Atomic nomor surat generation
052_security_consolidation.sql   ← Final security state
```

### Priority 3: Important Features

```
053_surat_submit_security.sql     ← Rate limit submissions
039_enforce_surat_status_transitions.sql  ← Workflow integrity
050_admin_user_delete_rpc.sql     ← Authorized delete
051_admin_user_upsert_rpc.sql     ← Authorized upsert
```

---

## Cara Apply via SQL Editor

1. Buka **Supabase Dashboard** → Project kamu
2. Go to **SQL Editor** → **New Query**
3. Copy-paste isi file migration
4. Klik **Run** ▶️
5. Verifikasi: `SELECT 1` return `1`

---

## Cara Cek Tabel Sudah Ada

```sql
-- Cek apakah tabel sudah ada
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'revoked_sessions';
```

Jika hasilnya `revoked_sessions` → sudah ada, skip.

---

## Generate Script untuk Apply Semua

```bash
# Gabungkan semua migration (dalam urutan) ke satu file
cd supabase/migrations
cat *.sql > ../all_migrations.sql
```

Ini bisa dijalankan sekaligus di SQL Editor, tapi HATI-HATI:

- Beberapa migration bersifat `CREATE TABLE IF NOT EXISTS` (idempotent)
- Beberapa ada `DROP TABLE` (TIDAK idempotent)
- Pastikan migration 047, 052, dll tidak dijalankan dua kali

---

## Migration yang Sudah obsolete (Dihapus)

File berikut DIHAPUS karena sudah tidak relevan:

```
007_consolidated_rls_and_esurat.sql   ← Duplicate
012_fix_check_constraints.sql         ← Deprecated
016_surat_requests_fk.sql            ← Buggy trigger
018_perangkat_desa.sql               ← Old schema
00_consolidated_full.sql              ← Dangerous inconsistencies
023_settings_v2.sql                 ← Superseded
024_sync_frontend_backend.sql        ← One-time column renames
025_fix_rls_policies.sql             ← Superseded
026_create_surat_template.sql       ← Empty table only
027_fix_schema_mismatches.sql        ← Conflicting PK
028_fix_rls_complete_reset.sql      ← Superseded
031_fix_hero_upset_payload.sql        ← Wrong content (duplicate 031)
032_security_hardening.sql           ← Superseded by 034
036_cleanup_legacy_otp.sql           ← Superseded
037_warga_rls_final.sql              ← Superseded
044_consolidated_pending.sql         ← Obsolete
045_full_template_migration.sql     ← Superseded by 015
046_fix_rls_overpermissive.sql      ← Superseded by 052
048_admin_users_browser_sync.sql   ← Creates security exposure
056_storage_public_upload.sql      ← Wrong content (duplicate 056)
```

---

## Production Deployment Checklist

- [ ] Apply 055 (H-03 OTP rate limit)
- [ ] Apply 056 (H-02 session revocation) — **PRIORITAS TERTINGGI**
- [ ] Apply 047 (infinite loop fix)
- [ ] Apply 052 (final security state)
- [ ] Verifikasi semua tabel ada
- [ ] Verifikasi RLS policies aktif
- [ ] Test login flow dengan signed session
- [ ] Test revocation flow
