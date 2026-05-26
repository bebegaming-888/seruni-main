# Laporan Analisis Code Quality - Seruni Mumbul

**Project:** Website Desa Seruni Mumbul
**Tanggal:** 2026-05-25

---

## Ringkasan

| Kategori                      | Severity | Jumlah |
| ----------------------------- | -------- | ------ |
| Empty catch blocks            | MEDIUM   | 3      |
| Memory leaks (setInterval)    | LOW      | 0      |
| Memory leaks (event listener) | MEDIUM   | 1      |
| N+1 query patterns            | LOW      | 2      |
| TODO/FIXME/HACK markers       | LOW      | 0      |
| Overly long functions         | HIGH     | 5      |

---

## 1. Empty Catch Blocks (3 instances)

### CRITICAL - src/routes/pelayanan.pengaduan.tsx (2x)

Pattern: catch {} - no logging, no user feedback.
Fix: console.error() + toast.error().

### MEDIUM - src/pages/EditSurat.tsx (1x)

Empty catch block in template/warga data load.
Fix: toast.error() + console.error().

### MEDIUM - server/api/sync-archive.js

Non-blocking catch with no warn log.
Fix: console.warn() for visibility.

---

## 2. Memory Leaks

### MEDIUM - src/lib/idb-sync.ts:56

window.addEventListener(storage) without cleanup.
Fix: return cleanup function.

### GOOD:

- src/lib/auth.ts useSession: cleanup ada
- src/routes/\_\_root.tsx: cleanup ada
- src/routes/masuk.warga.tsx: setInterval + clearInterval

---

## 3. N+1 Query Patterns

### CRITICAL - server/api/submit-surat.js:305

Sequential await in loop for attachment upload.
Fix: Promise.allSettled() for parallel upload.

### MEDIUM - server/api/keuangan/entries.js:69

2 separate queries for income/expense summary.
Fix: single query with GROUP BY.

### GOOD - src/lib/useSupabaseSync.ts

Concurrent upload with Promise.all already good.

---

## 4. Technical Debt - ZERO markers

No TODO/FIXME/HACK/XXX comments found.
Dummy placeholders (MD-XXXX, XXXX.DUMMY.TOKEN) are not debt.

---

## 5. Overly Long Functions - HIGH (5 files)

- src/pages/Admin.tsx: 2319 lines (god component)
- src/pages/ESurat.tsx: 1751 lines (3 components)
- src/pages/EditSurat.tsx: 646 lines
- src/routes/pelayanan.pengaduan.tsx: 509 lines
  Fix: extract each to separate file.

---

## 6. Error Handling Quality

GOOD: All server catch blocks have serverError(res).
GOOD: Client stores use .catch(console.warn).
GOOD: Sonner toasts for user-facing errors.

IMPROVE: Silent catch blocks need warn log.
IMPROVE: eslint-disable in ESurat.tsx needs refactor.

---

## 7. Security

MEDIUM: Weak HMAC secret validation (min 32 char).
MEDIUM: OTP rate limit by IP only (needs NIK+IP).

GOOD: Zod schema validation.
GOOD: HMAC-SHA256 session signing.
GOOD: Security headers globally applied.

---

## Priority Fix List

| Priority | Issue                              | File                               | Effort |
| -------- | ---------------------------------- | ---------------------------------- | ------ |
| CRITICAL | N+1 sequential attachment upload   | server/api/submit-surat.js:305     | 15min  |
| CRITICAL | Empty catch blocks (no feedback)   | src/routes/pelayanan.pengaduan.tsx | 10min  |
| CRITICAL | Admin.tsx 2319 lines god component | src/pages/Admin.tsx                | 8h     |
| HIGH     | Empty catch block EditSurat        | src/pages/EditSurat.tsx            | 10min  |
| HIGH     | N+1 2 queries for summary          | server/api/keuangan/entries.js:69  | 20min  |
| HIGH     | ESurat.tsx 1751 lines split        | src/pages/ESurat.tsx               | 4h     |
| MEDIUM   | storage listener no cleanup        | src/lib/idb-sync.ts:56             | 15min  |
| MEDIUM   | Weak HMAC secret validation        | server/api/generate-nomor-surat.js | 5min   |
| MEDIUM   | OTP rate limit by IP only          | server/api/request-otp.js          | 30min  |

---

## Positives

- All setInterval have clearInterval
- Zero TODO/FIXME/HACK markers
- Zod schema validation (strict)
- HMAC-SHA256 session signing
- IndexedDB-first write-behind architecture
- Concurrent Promise.all for uploads
- Optimistic locking
- Audit logging
- Security headers globally
- Rate limiting on auth endpoints

---

Generated: 2026-05-25 | Claude Sonnet 4.6
