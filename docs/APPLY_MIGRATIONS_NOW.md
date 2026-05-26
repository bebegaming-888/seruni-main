# APPLY MIGRATIONS NOW — Production Deployment

**Status:** ⏳ PENDING MANUAL APPLICATION  
**Date:** 23 Mei 2026  
**Priority:** 🔴 CRITICAL

---

## ⚠️ CRITICAL: 3 Security Fixes MUST Be Applied

Berikut adalah 3 migration yang **WAJIB** di-apply ke production database untuk menutup celah keamanan:

### H-02: Session Revocation Table

**File:** `supabase/migrations/056_session_revocation.sql`  
**Severity:** HIGH  
**Impact:** Tanpa ini, logout tidak benar-benar mencabut session — attacker bisa reuse stolen token.

### H-03: OTP Rate Limit RLS Fix

**File:** `supabase/migrations/055_fix_otp_rate_limit_rls.sql`  
**Severity:** HIGH  
**Impact:** Anon role bisa bypass rate limit check — attacker bisa brute force OTP.

### Infinite Loop Trigger Fix

**File:** `supabase/migrations/047_fix_trigger_infinite_loop.sql`  
**Severity:** MEDIUM  
**Impact:** Trigger `sync_surat_metadata_to_versions` menggunakan AFTER UPDATE → infinite recursion → database hang.

---

## 📋 Cara Apply (Manual via SQL Editor)

### Option A: Apply Satu-Satu (Recommended untuk First Time)

1. **Buka Supabase Dashboard**  
   → https://supabase.com/dashboard/project/jnarzbkddjdrethfkxtn

2. **Go to SQL Editor → New Query**

3. **Apply H-02 (Session Revocation)**
   - Copy-paste isi file `supabase/migrations/056_session_revocation.sql`
   - Klik **Run** ▶️
   - Verifikasi: Query harus return `Success`

4. **Apply H-03 (OTP Rate Limit Fix)**
   - Copy-paste isi file `supabase/migrations/055_fix_otp_rate_limit_rls.sql`
   - Klik **Run** ▶️
   - Verifikasi: Query harus return `Success`

5. **Apply Infinite Loop Fix**
   - Copy-paste isi file `supabase/migrations/047_fix_trigger_infinite_loop.sql`
   - Klik **Run** ▶️
   - Verifikasi: Query harus return `Success`

6. **Apply Remaining Fixes (Optional but Recommended)**
   - `050_admin_user_delete_rpc.sql` — Authorized admin delete
   - `051_admin_user_upsert_rpc.sql` — Authorized admin upsert
   - `049_warga_otp_atomic_verify.sql` — Atomic OTP verification
   - `053_surat_submit_security.sql` — Submission rate limit

---

### Option B: Batch Apply (All Critical Fixes at Once)

**File:** `docs/REMAINING_MIGRATIONS.sql`

1. **Buka Supabase Dashboard → SQL Editor → New Query**
2. **Copy-paste SELURUH isi** file `docs/REMAINING_MIGRATIONS.sql`
3. **Klik Run** ▶️
4. **Tunggu sampai selesai** (bisa 30-60 detik)
5. **Verifikasi output** di bagian bawah

**Expected Output:**

```
table_name              | row_count
------------------------+-----------
revoked_sessions        | 0
submission_rate_limit   | 0
otp_rate_limits         | (existing count)
admin_users             | (existing count)
surat_requests          | (existing count)
```

---

## ✅ Post-Migration Verification

Setelah apply semua migration, jalankan query ini untuk verifikasi:

```sql
-- 1. Check all critical tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'revoked_sessions',
    'submission_rate_limit',
    'otp_rate_limits',
    'admin_users',
    'surat_requests',
    'warga_sessions'
  )
ORDER BY table_name;
-- Expected: 6 rows

-- 2. Check all critical functions exist
SELECT proname
FROM pg_proc
WHERE proname IN (
  'check_otp_rate_limit',
  'sync_surat_request_metad  'increment_submission_count',
  'delete_admin_user',
  'upsert_admin_user',
  'verify_warga_otp'
)
ORDER BY proname;
-- Expected: 6 rows

-- 3. Check RLS is enabled on critical tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('revoked_sessions', 'submission_rate_limit', 'admin_users')
ORDER BY tablename;
-- Expected: all should have rowsecurity = true

-- 4. Check check_otp_rate_limit permissions (CRITICAL)
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'check_otp_rate_limit';
-- Expected: service_role, postgres (NO anon)

-- 5. Check trigger is BEFORE (not AFTER)
SELECT tgname, tgtype, tgrelid::regclass
FROM pg_trigger
WHERE tgname = 'sync_surat_metadata_to_versions';
-- Expected: sync_surat_metadata_to_versions | BEFORE UPDATE
```

---

## 🔄 Restart API Server

Setelah migration selesai, restart local API server:

```bash
# Kill old server
taskkill //F //PID $(netstat -ano | findstr ":3001" | findstr "LISTENING" | awk "{print $5}")

# Start new server
cd d:\seruni-mumbul
node --env-file=.dev.vars server/index.js
```

---

## 🧪 Test Security Fixes

### Test H-02: Session Revocation

```bash
# 1. Loginl -X POST http://localhost:3001/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admindesa","password":"ax3HauLEqirxgNpgPe5nDn2wolVuFk4H"}'

# 2. Sign session (get sig field)
curl -X POST http://localhost:3001/api/auth/sign-session \
  -H "Content-Type: application/json" \
  -d '{"userId":"<user-id>","username":"admindesa","role":"Super Admin","expiresAt":"2026-06-01T00:00:00.000Z"}'

# 3. Logout (revoke session)
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Content-Type: application/json" \ "Authorization: Bearer <signed-session>"
# Expected: {"ok":true,"message":"Logout berhasil"}

# 4. Try to use revoked session
curl -X POST http://localhost:3001/api/generate-pdf \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <revoked-session>" \
  -d '{"no":"..."}'
# Expected: 401 "Sesi telah dicabut"
```

### Test H-03: OTP Rate Limit

```bash
# Try to request OTP 4 times in a row (should block on 4th)
for i in {1..4}; do
  curl -X POST http://localhost:3001/api/auth/request-otp \
    -H "Content-Type: application/json" \
    -d '{"nik":"3273011234567890"}'
  echo ""
Expected: First 3 succeed, 4th returns 429 "Terlalu banyak percobaan"
```

---

## 🚨 Troubleshooting

### Error: "relation already exists"

Artinya table sudah ada. Skip migration tersebut atau gunakan `CREATE TABLE IF NOT EXISTS`.

### Error: "function already exists"

Gunakan `CREATE OR REPLACE FUNCTION` (sudah ada di migration files).

### Error: "permission denied"

Pastikan kamu login sebagai **Owner** atau **Admin** di Supabase Dashboard.

### Error: "syntax error"

Copy-paste ulang dari file migration. Pastikan tidak ada karakter yang hilang.

---

## 📊 Migration Status

| Migration               | File                              | Status     | Priority    |
| ----------------------- | --------------------------------- | ---------- | ----------- |
| H-02 Session Revocation | 056_session_revocation.sql        | ⏳ PENDING | 🔴 CRITICAL |
| H-03 OTP Rate Limit Fix | 055_fix_otp_rate_limit_rls.sql    | ⏳ PENDING | 🔴 CRITICAL |
| Infinite Loop Fix       | 047_fix_trigger_infinite_loop.sql | ⏳ PENDING | 🔴 CRITICAL |
| Submission Rate Limit   | 053_surat_submit_security.sql     | ⏳ PENDING | 🟡 MEDIUM   |
| Admin Delete RPC        | 050_admin_user_delete_rpc.sql     | ⏳ PENDING | 🟡 MEDIUM   |
| Admin Upsert RPC        | 051_admin_user_upsert_rpc.sql     | ⏳ PENDING | 🟡 MEDIUM   |
| Atomic OTP Verify       | 049_warga_otverify.sql            | ⏳ PENDING | 🟡 MEDIUM   |

---

## 📝 Next Steps

Setelah migration selesai:

1. ✅ Verify all tables exist
2. ✅ Verify all functions exist
3. ✅ Restart API server
4. ✅ Test H-02 (session revocation)
5. ✅ Test H-03 (OTP rate limit)
6. ✅ Update `docs/GOALS.md` status
7. ✅ Deploy to production

---

**Last Updated:** 23 Mei 2026  
**Status:** ⏳ AWAITING MANUAL APPLICATION VIA SQL EDITOR
