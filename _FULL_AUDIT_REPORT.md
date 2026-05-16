# SERUNI MUMBUL — FULL SYSTEM AUDIT REPORT
## Generated: 2026-05-16 | Scans: src/, functions/, supabase/migrations/

---

# REPORT 1: DEAD CODE & ORPHAN FILE CLEANUP

## 1. Duplicate Migration Seed Files

**File series:** `supabase/migrations/warga-seeds/005.001_warga_seed.sql` through `005.011_warga_seed.sql`

**Status:** DELETE — byte-for-byte identical to `005_warga_seed_001_of_079.sql` through `011`

The `warga-seeds/` directory contains two parallel numbering schemes:
- `001_warga_seed.sql` through `079_warga_seed.sql` (79 files)
- `005.001_warga_seed.sql` through `005.011_warga_seed.sql` (11 files, duplicated from the above)

The 005.001–005.011 series is a duplicate copy with different filename formatting. Estimated waste: **~200KB**. No functional impact from deletion. Keep the `_001_of_079` naming convention.

**Action:** DELETE files `supabase/migrations/warga-seeds/005.001_warga_seed.sql` through `005.011_warga_seed.sql`

---

## 2. Dead Code: `esurat-notif.ts` — "forward" switch case

**File:** `src/lib/esurat-notif.ts`, lines 38–42

```typescript
// "forward" trigger — planned for workflow advance notification to warga.
// Currently no call site passes this trigger, so the case is unused dead code.
```

`buildMessage()` has a `"forward"` branch in its switch (line 41–42), but no call site in the codebase ever passes `"forward"` as the trigger argument to `notifySurat()`. The comment explicitly states this.

**Action:** DELETE the commented-out forward case block, or wire it up if "verified → awaiting approval" WA notifications become a feature.

---

## 3. Orphaned `SP_IMB` DNA Preset

**File:** `src/lib/letter-engine.ts` (line ~851-854 in `DNA_CLAUSES_PRESETS`)

`DNA_CLAUSES_PRESETS` has an entry for `SP_IMB` but `SP_IMB` does not exist in `SURAT_MASTER`. The preset references `lokasi_bangunan`, `luas_bangunan`, and `fungsi_bangunan` fields — but the only building-related letter in the master is `SK_RUMAH_MILIK`.

This is a planned-but-not-implemented letter type. The preset will never be used.

**Action:** Either add `SP_IMB` to `SURAT_MASTER` if it's intended, or remove the orphaned preset from `DNA_CLAUSES_PRESETS`.

---

## 4. Unused Dependencies in `package.json`

**`pdf-lib`** in `dependencies`:
- Listed as dependency but never imported or called anywhere in the codebase
- All PDF generation uses `jspdf`
- Estimated installed size: ~260KB
- **Action:** Remove from `package.json`

**`@types/papaparse`, `@types/qrcode`, `@types/leaflet`** in `dependencies`:
- Type-only packages belong in `devDependencies`
- Shipping them in production `node_modules` is unnecessary
- **Action:** Move all three to `devDependencies`

---

## 5. Dead Imports (Scattered)

**`Trophy` icon in `ESurat.tsx`:**
- Imported from `lucide-react` but never rendered
- Tree-shaker removes it at build time, but it creates lint noise
- **Action:** Remove the import

**`PENDUDUK_MOCK` eager import in `ESurat.tsx`:**
- Imported at module level; only used inside a DEV-mode conditional (line ~821)
- Should be gated behind `import.meta.env.DEV` guard or lazy-required
- **Action:** Prevent from entering production bundle

---

## 6. Dead Code: `generate-pdf.ts` Mock Generators

**File:** `functions/api/generate-pdf.ts`

`generateMockSurat()` and `generateMockWarga()` functions are dead code in the actual execution path. Production path explicitly rejects mock mode with HTTP 403. These functions serve no purpose in production.

**Action:** Wrap in `if (process.env.NODE_ENV !== "production")` guard or delete.

---

## 7. Duplicate HMAC-SHA256 Implementation

**Files:**
- `functions/_lib/utils.ts` — `hmacSha256Hex()`
- `src/lib/qr-signature.ts` — same algorithm re-implemented

Edge functions import `hmacSha256Hex` from the utils file, while `qr-signature.ts` (client-side) re-implements the same function. If the algorithm ever changes, both must be kept in sync — a maintenance hazard.

**Action:** Extract the shared function into `functions/_lib/crypto.ts`, or have edge functions import from the built `qr-signature.js` output.

---

## 8. Project Size Wins Summary

| Action | Estimated Saving | Risk |
|---|---|---|
| DELETE `005.001`–`005.011` seed files | ~200KB | None |
| Remove `pdf-lib` from `package.json` | ~260KB installed | None |
| Move `@types/*` to `devDependencies` | <50KB each | None |
| Remove `Trophy` dead import | 0KB (tree-shaken) | None |
| Remove `PENDUDUK_MOCK` eager import | varies | Low |
| Consolidate duplicate HMAC-SHA256 | <1KB | Low |
| Remove `generate-pdf.ts` mock generators | <5KB | Low |

---

# REPORT 2: SUPABASE MIGRATION AUDIT

## Root Cause: Column Rename Breaking Subsequent Index Creation

### Migration Chain

| # | File | Action | Column Reference |
|---|---|---|---|
| 001 | `001_core_schema.sql` | CREATE TABLE | `no_surat` (line 100), index on `no_surat` (line 126) |
| 007 | `007_consolidated_rls_and_esurat.sql` | CREATE FUNCTION `track_surat()` | `no_surat` in function body (lines 87, 92) |
| 016 | `016_surat_requests_fk.sql` | FUNCTION USAGE | `no_surat` in RPC return type (lines 179, 194) |
| **024** | **`024_sync_frontend_backend.sql`** | **RENAME COLUMN** | **`no_surat` → `no` (line 52), `data_json` → `data` (line 59)** |
| 026 | `026_create_surat_template.sql` | CREATE TABLE | (unrelated) |
| **031** | **`031_surat_requests_perf_index.sql`** | **CREATE INDEX** | **References `no_surat` — BROKEN after 024** |

### Broken Index (Migration 031)

```sql
-- Lines 50-52 — FAILS because column was renamed to `no` in migration 024
CREATE INDEX IF NOT EXISTS surat_requests_no_surat_prefix_idx
  ON public.surat_requests(no_surat text_pattern_ops);  -- column does not exist
```

**Fix:** Change to `ON public.surat_requests(no text_pattern_ops)` and rename the index to `surat_requests_no_prefix_idx`

### Broken Function: `track_surat()` (Migration 007)

```sql
-- Lines 91-95 — FAILS after migration 024
CREATE OR REPLACE FUNCTION public.track_surat(p_no_surat text, p_nik text)
RETURNS SETOF public.surat_requests AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.surat_requests
  WHERE (no_surat = p_no_surat OR tracking_no = p_no_surat)  -- no_surat doesn't exist
    AND nik = p_nik;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Fix:** Change `no_surat` to `no` in the WHERE clause (line 92).

### Broken References in Migration 016

The function return type and any references to `no_surat` in `016_surat_requests_fk.sql` (lines 179, 194) also need updating to `no`.

---

## Summary of Required Fixes

1. **`031_surat_requests_perf_index.sql`** line 50-52: Change `no_surat` to `no`, rename index to `surat_requests_no_prefix_idx`
2. **`007_consolidated_rls_and_esurat.sql`** line 92: Change `no_surat` to `no` in the WHERE clause
3. **`016_surat_requests_fk.sql`** lines 179, 194: Change `no_surat` to `no` in all references

---

# REPORT 3: SECURITY AUDIT — EDGE FUNCTIONS

## Critical Issues

### C-1: No Authorization on Admin Operations

**Files:** `functions/api/generate-nomor-surat.ts`, `functions/api/generate-pdf.ts`, `functions/api/send-wa.ts`, `functions/api/push/send.ts`

**Severity:** CRITICAL

`verifyAdminSession()` exists and works correctly at `functions/_lib/admin-session.ts`, but **none of the admin endpoints import or use it**. Any unauthenticated user can:
- Generate unlimited official letter numbers (forgery risk)
- Download PDFs of any approved letter
- Send WhatsApp messages to any phone number (abuse/spam)
- Send push notifications to all subscribers

**Fix:** Add `verifyAdminSession()` to all four endpoints:
```typescript
const session = await verifyAdminSession(context.request, context.env.ADMIN_SESSION_SECRET);
if (!session) return json({ ok: false, error: "Unauthorized" }, 401);
```

Also add `ADMIN_SESSION_SECRET` to Cloudflare Secrets and document it in CLAUDE.md alongside `JWT_SECRET`.

---

### C-2: OTP Stored with Plain SHA-256 (Not bcrypt)

**File:** `functions/_lib/utils.ts` lines 78-86, `supabase/migrations/002_warga_auth.sql` line 13

**Severity:** CRITICAL

Migration comments say "production: bcrypt hash" but `hashOtp()` uses plain SHA-256 with a fixed string `seruni-otp-salt`. SHA-256 is a fast hash — a modern GPU can brute-force 6-digit OTPs in seconds. The "salt" is shared across all OTPs, providing no meaningful protection.

**Fix:** Use bcrypt via WebAssembly (bcryptjs WASM build compatible with Cloudflare Workers), or at minimum PBKDF2 with many iterations.

---

## High Issues

### H-1: Non-constant-time Password Comparison in `admin-login.ts`

**File:** `functions/api/auth/admin-login.ts` line 114

```typescript
if (!user || user.password !== password) {  // Plain string comparison — timing side-channel
```

**Fix:** Use `crypto.subtle.timingSafeEqual()`:
```typescript
const a = new TextEncoder().encode(user.password);
const b = new TextEncoder().encode(password);
const match = a.length === b.length && crypto.subtle.timingSafeEqual(a, b);
```

---

### H-2: OTP Mark-Used Failure Proceeds Anyway

**File:** `functions/api/auth/verify-otp.ts` lines 154-169

If the Supabase update to mark OTP as used fails, the function **still creates a valid session and returns success**. The OTP remains valid for replay attacks (up to 5 minutes).

**Fix:** Reject the verification if mark-used fails:
```typescript
if (!markUsedOk) {
  console.error("[verify-otp] CRITICAL: OTP mark-used failed — rejecting verification");
  return json({ ok: false, error: "Verifikasi gagal — silakan coba lagi" }, 500);
}
```

---

### H-3: CORS Wildcards on All Endpoints

**Files:** All 12 edge functions via `functions/_lib/utils.ts` line 27 and `functions/_lib/rate-limit.ts` line 55

```typescript
headers["Access-Control-Allow-Origin"] = "*";  // Every endpoint
```

For a government system, permissive CORS increases CSRF risk and data exfiltration risk.

**Fix:** Restrict to specific origin(s) via an env var:
```typescript
const ALLOWED_ORIGIN = env.ALLOWED_ORIGIN ?? "https://serunimumbul.desa.id";
```

---

### H-4: Wrong Secret Passed to `verifyAdminSession`

**File:** `functions/api/push/send.ts` line 111

```typescript
verifyAdminSession(request, context.env.VAPID_PRIVATE_KEY)  // Wrong key!
```

The function is called with `VAPID_PRIVATE_KEY` instead of `ADMIN_SESSION_SECRET`. Push notification requests will always fail the admin auth check, even for legitimate admins.

**Fix:** Replace with `context.env.ADMIN_SESSION_SECRET ?? ""`.

---

## Medium Issues

### M-1: Error Details Exposed in 500 Responses

**File:** `functions/api/generate-pdf.ts` line 254

```typescript
return new Response(JSON.stringify({ error: "Gagal generate PDF", detail: String(err) }), { ...
```

`detail: String(err)` exposes raw error details (stack traces, Supabase errors, column names) in production responses.

**Fix:** Remove `detail` from error responses entirely. Keep full details in server-side logs only.

---

### M-2: OTP Exposed in HTTP Response When Fonnte Not Configured

**File:** `functions/api/auth/request-otp.ts` lines 289-298

When `FONNTE_API_KEY` is not set, the OTP is returned in the HTTP response as `dev_otp`. Anyone monitoring network traffic can intercept it.

**Fix:** Reject the request if Fonnte is unavailable:
```typescript
if (!token) {
  console.error("[request-otp] FONNTE_API_KEY not configured — rejecting request");
  return json({ ok: false, error: "WhatsApp service not configured" }, 500);
}
```

---

### M-3: Session Payload Contains Plain Text Password (Env Fallback)

**File:** `functions/api/auth/admin-login.ts` lines 105-111

When logging in with env var fallback credentials, the plain password from `ADMIN_PASS` is stored in the session payload object in memory.

**Fix:** Remove the env var fallback entirely and rely solely on the database, or use bcrypt for env credentials.

---

### M-4: In-Memory Rate Limiter Bypassable in Multi-Instance Deployments

**File:** `functions/_lib/rate-limit.ts` line 25

The `Map`-based in-memory store is per-instance. Cloudflare Workers auto-scales across multiple instances. An attacker with multiple IPs can bypass all rate limits.

**Fix:** Use Cloudflare KV for distributed rate limiting (documented in file comments but not implemented).

---

### M-5: Malformed Set-Cookie Header Construction

**File:** `functions/api/auth/admin-login.ts` lines 167–176

`join("; ")` on an array where only the first element has the `Set-Cookie=` prefix. The result loses the `Path=` and `Max-Age=` segments' header names. This breaks cookie setting on certain CF Workers runtimes.

**Fix:** Build each segment as a separate `Set-Cookie` header, or prepend `Set-Cookie=` to every segment before joining.

---

### M-6: Input Validation Gaps

**File:** `functions/api/generate-nomor-surat.ts` line 63-66

`klasifikasi` parameter only checks for non-empty, no length limit or character whitelist. `no` parameter in `verify-surat.ts` only checks `trim().length >= 3` with no max length.

**Fix:** Add strict format validation:
```typescript
if (!/^[A-Z]{2,6}$/.test(kode)) return json({ error: "invalid format" }, 400);
if (no.length > 50) return json({ error: "invalid" }, 400);
```

---

## Low Issues

### L-1: No Audit Logging for Failed Admin Login Attempts
**File:** `functions/api/auth/admin-login.ts` lines 60-116
Failed login attempts are not logged to `audit_log`. Harder to detect brute-force attacks.

### L-2: No Rate Limiting on `/api/health`
**File:** `functions/api/health.ts` — health check has no rate limit.

---

# REPORT 4: COMPONENT & WORKFLOW AUDIT — ADMIN FRONTEND

## Audit Scope

- `src/pages/admin.tsx` (workflow handlers: verify, reject, approve, lanjutApproval)
- `src/lib/esurat-notif.ts`
- `src/lib/nomor-surat.ts`
- `src/lib/template-store.ts`
- `src/lib/store-init.ts`
- `functions/_lib/admin-session.ts`
- `functions/_lib/rate-limit.ts`
- `src/components/admin/PendudukManager.tsx`, `CMSManager.tsx`, `TemplateSuratManager.tsx`, `SuratPreviewPanel.tsx`, `WilayahSettings.tsx`, `AlertPanel.tsx`, `LembagaManager.tsx`, `PerangkatDesaManager.tsx`

---

## 4A. E-Surat Core Libraries — Individual Analysis

### `src/lib/esurat-notif.ts`

**Purpose:** WhatsApp notification dispatcher for e-surat status changes. Handles 5 trigger points (submit, verify, approve, reject, reminder). Pulls message templates from `settings-store`.

**Call sites confirmed:**
- `admin.tsx` line 294: `notifySurat(r, "verify")`
- `admin.tsx` line 317: `notifySurat(updated, "reject", alasan)` (updated record with catatan)
- `admin.tsx` line 339: `notifySurat(updated, "forward")` (needs confirmation of wire-up)
- `admin.tsx` line 390: `notifySurat(updated, "approve")`
- `ESurat.tsx`: `notifySurat(record, "submit")` (to be confirmed)

**Bug 1 — `forward` trigger never wired:**
`buildMessage()` has a `"forward"` case but no call site passes it. `admin.tsx` line 339 calls `notifySurat(updated, "forward")` — but `notifySurat` accepts `"forward"` in its type signature, and `buildMessage` has it as a commented-out dead block. **The "forward" notification is not sent.** warga who have been verified never receive a WA that says their letter is now awaiting Kades approval.

**Fix:** Either (a) implement the forward message body and remove the comment markers, or (b) remove the `forward` case entirely and change `admin.tsx` line 339 to use a no-op or remove the call.

**Bug 2 — `approve` uses stale `r.no` instead of new letter number:**
When the approve action sends WA, `updated` has `no: noSurat` (the new official number) — this is correct since `updated` is constructed before `notifySurat` is called. No bug here.

**Integration status:** Properly integrated. Dependencies: `esurat-store` (SuratRecord type), `fonnte.ts` (sendWaNotification), `settings-store` (getSettings). All imports accounted for.

---

### `src/lib/nomor-surat.ts`

**Purpose:** Generate official village letter numbers in format `{kode}/{noUrut}/{inisialJabatan}.{inisialDesa}/{bulanRomawi}/{tahun}`. Counter stored per-year in IndexedDB with in-memory cache.

**Integration:** Used by `admin.tsx` line 355 (`generateNomorSurat(r.kode, tahun)` in the approve handler). Properly called within the try block before any record mutation.

**Bug 1 — `isSupabaseConfigured` re-check after already returning:**
Lines 96-99 have redundant logic:
```typescript
} catch (rpcErr) {
  if (isSupabaseConfigured) throw rpcErr;  // Already know isSupabaseConfigured from line 76
  console.warn("[nomor-surat] Supabase not configured, using local counter:", rpcErr);
}
```
The catch only runs if the fetch succeeded but returned non-ok. If `isSupabaseConfigured` is true at line 76, it will still be true here — but this is the intended "fail fast" behavior. The comment explains it. **Not a bug, just confusing.**

**Bug 2 — Local counter fallback accessible even when Supabase is configured but RPC fails:**
The fail-fast throw at line 95 correctly prevents duplicate numbers. BUT — the `catch` block at line 96 is entered when `res.ok` is false (but fetch succeeded). The `isSupabaseConfigured` check re-throws, which is correct. However, if Supabase is configured but the `/api/generate-nomor-surat` edge function has no admin auth check (see C-1 in security report), anyone can call it and cause the RPC to fail, triggering the local counter fallback — leading to duplicate numbers.

**Fix:** The real fix is adding auth to the edge function (see C-1 in Report 3).

**Integration status:** Properly integrated. Dependencies: `settings-store`, `surat-master`, `supabase`, `idb-store`, `useSupabaseSync` (logAudit). Init called from `store-init.ts` at line 61.

---

### `src/lib/template-store.ts`

**Purpose:** Template store for letter types. IndexedDB + in-memory cache, async init. Seeds from `SURAT_MASTER` if no stored data. Supports DNA clauses and subject fields.

**Bug 1 — DNA preset name mismatch for SP_KTP, SP_KK, VERIF_DTKS, SK_NIKAH:**

`buildSeedTemplates()` (line 105) uses `DNA_CLAUSES_PRESETS[s.code]` where `s.code` comes from `SURAT_MASTER` (underscore format: `SP_KTP`, `VERIF_DTKS`). But `DNA_CLAUSES_PRESETS` uses **hyphen format**: `SP-KTP`, `VERIF-DTKS`. These are distinct keys — the lookup fails silently, falling back to the default DNA clause.

Affected letter types: `SP_KTP`, `SP_KK`, `VERIF_DTKS`, `SK_NIKAH`. All will render with generic DNA instead of their specific presets.

**Fix:** Add underscore-version aliases to `DNA_CLAUSES_PRESETS`:
```typescript
// In letter-engine.ts
"SP_KTP": DNA_CLAUSES_PRESETS["SP-KTP"],
"SP_KK": DNA_CLAUSES_PRESETS["SP-KK"],
"VERIF_DTKS": DNA_CLAUSES_PRESETS["VERIF-DTKS"],
"SK_NIKAH": DNA_CLAUSES_PRESETS["SK-NIKAH"],
```

**Bug 2 — `listTemplates()` returns seed while `_cache` is null on SSR:**

Line 198-203: if `_cache` is null and `typeof window !== "undefined"`, it returns `buildSeedTemplates()` — but `initTemplateStore()` hasn't been called yet at this point (a race condition on very fast renders). This creates a template list from seed data that may not match actual stored templates.

**Severity:** LOW — `initAllStores()` is awaited in `__root.tsx` before first render, so this path only fires in non-browser environments. Nonetheless, the fallback is confusing.

**Integration status:** Properly integrated. `initTemplateStore()` called from `store-init.ts` line 60. `subscribeToTemplates()` from Supabase realtime. `broadcastTemplateChange()` for cross-tab sync. All dependencies resolved.

---

### `src/lib/store-init.ts`

**Purpose:** Central store initialization coordinator. Calls all store inits in correct order. Settings is awaited first (critical dependency for other stores), then hero config, then all others in parallel.

**Bug 1 — No error propagation from CMS content store init:**
Line 65: `import("@/lib/content-store").then(...)` — if the dynamic import or any store init inside fails, it's caught by `Promise.allSettled` (line 54) but the error is silently swallowed. No error is logged. An admin could open the app and see empty CMS data without knowing why.

**Bug 2 — `Promise.allSettled` hides individual store init failures:**
If `initPendudukStore()` fails, `initTemplateStore()` succeeds, etc., all results are hidden inside `Promise.allSettled`. The console logs `Semua store berhasil diinisialisasi` (line 166) even if some stores failed. No way for the app to know which stores failed.

**Bug 3 — First-boot mock lock covers 14 stores but doesn't protect ESurat/penduduk:**
Lines 77-92: `ALL_STORES` includes "esurat", "penduduk" — these are listed but the CMS mock loading code (lines 125-155) only calls `initFromMocks` on berita/pengumuman/agenda/komoditas/galeri/apbdes stores. The ESurat and penduduk stores have no mock path here, so listing them in `ALL_STORES` is misleading. These stores are either initialized with real data or remain empty.

**Integration status:** Properly integrated. Called from `__root.tsx` via `useEffect`, awaited before first render.

---

### `functions/_lib/admin-session.ts`

**Purpose:** HMAC-SHA256 signed cookie verification for admin edge functions. Parses `admin_session` cookie, verifies HMAC signature, checks expiry.

**Quality:** Clean, well-commented, correct. Uses `hmacSha256Hex` from `functions/_lib/utils.ts`. No known bugs.

**Gap:** Used by `push/send.ts` (with wrong secret — see H-4 in Report 3), but NOT used by `generate-nomor-surat.ts`, `generate-pdf.ts`, or `send-wa.ts` (see C-1 in Report 3).

**Integration status:** Library exists and works but is under-used. Needs to be wired into the 3 missing admin endpoints.

---

### `functions/_lib/rate-limit.ts`

**Purpose:** In-memory rolling window rate limiter for edge functions. Three tiers: public (30/min), auth (10/min), admin (60/min). Gets client IP from CF headers or X-Forwarded-For.

**Gap:** In-memory store means per-instance rate limiting only. Bypassable by multi-IP attackers (see M-4 in Report 3). Cloudflare KV would be needed for true distributed limiting.

**Quality:** Clean implementation. `getClientIp()` is robust. `cleanup()` prevents memory leak. `retryAfter` header is correct.

**Integration status:** Properly used by all edge functions. The `json()` helper at line 50 sets CORS wildcard — see H-3 in Report 3.

---

## 4B. Admin Page Workflow Handlers (Lines 280–420)

### `verify` (lines 283-305)

```typescript
const verify = async (r: SuratRecord) => {
  if (pendingActions.has(r.no)) return;
  setPendingActions((s) => new Set(s).add(r.no));
  const result = await syncSetStatus(r.no, "Diverifikasi", undefined, username);
  refresh();
  if (result.ok) {
    await logAudit({ action: "surat.verify", detail: `Verifikasi: ${r.no} oleh ${username}`, username });
    const notify = await notifySurat(r, "verify");
    if (notify.ok) toast.success(...); else toast.warning(...);
  } else {
    toast.error("Gagal menyimpan", { description: result.error });
  }
  setPendingActions((s) => { const n = new Set(s); n.delete(r.no); return n; });
};
```

**Assessment:** CORRECT AND COMPLETE.
- Debounce guard: `pendingActions.has(r.no)` ✓
- Audit log: ✓
- WA notification with fallback: ✓
- Error handling: ✓
- Pending flag cleared in finally-equivalent: ✓

**Note:** `r` (original record) is passed to `notifySurat` — no issue since verify status doesn't change the record's key fields.

---

### `reject` (lines 306-326)

```typescript
const reject = async (r: SuratRecord, alasan: string) => {
  if (!alasan.trim()) return;
  if (pendingActions.has(r.no)) return;
  setPendingActions((s) => new Set(s).add(r.no));
  const result = await syncSetStatus(r.no, "Ditolak", alasan.trim(), username);
  const updated = { ...r, status: "Ditolak" as const, catatan: alasan.trim() };
  await logAudit({ action: "surat.reject", detail: `Tolak: ${r.no} alasan "${alasan}" oleh ${username}`, username });
  await notifySurat(updated, "reject", alasan);
  refresh();
  if (result.ok) toast.error("Ditolak", { description: r.no });  // <-- BUG
  else toast.error("Gagal menyimpan", { description: result.error });
  setPendingActions((s) => { const n = new Set(s); n.delete(r.no); return n; });
};
```

**Bug:** Line 319 uses `toast.error("Ditolak", { description: r.no })` when `result.ok` is true — this shows a red error toast on successful rejection. Should be `toast.warning` or `toast.success` with a green checkmark. Confusing UX: the admin thinks the rejection failed.

---

### `lanjutApproval` (lines 327-349)

```typescript
const lanjutApproval = async (r: SuratRecord) => {
  if (pendingActions.has(r.no)) return;
  setPendingActions((s) => new Set(s).add(r.no));
  const result = await syncSetStatus(r.no, "Menunggu Approval", undefined, username);
  refresh();
  if (result.ok) {
    await logAudit({ action: "surat.forward", detail: `Lanjut approval: ${r.no} oleh ${username}`, username });
    const updated = { ...r, status: "Menunggu Approval" as const };
    await notifySurat(updated, "forward");  // <-- forward trigger, not wired in esurat-notif.ts
    setPreview(updated);
  } else {
    toast.error("Gagal menyimpan", { description: result.error });
  }
  setPendingActions((s) => { const n = new Set(s); n.delete(r.no); return n; });
};
```

**Assessment:** Structurally correct. Audit log fires. Refresh fires. But `notifySurat(updated, "forward")` calls the unwired forward trigger — see esurat-notif.ts analysis above.

**Also:** No toast on success. The admin gets no feedback that the letter was forwarded to Kades. `setPreview(updated)` is called but no success toast.

---

### `approve` (lines 350-403)

```typescript
const approve = async (r: SuratRecord) => {
  if (pendingActions.has(r.no)) return;
  setPendingActions((s) => new Set(s).add(r.no));
  try {
    const tahun = new Date().getFullYear();
    const noSurat = await generateNomorSurat(r.kode, tahun);  // Can throw — see nomor-surat.ts C-1
    const signed_at = new Date().toISOString();
    const signerName = getSettings().signature.signer_name;
    const qrSecret = import.meta.env.VITE_QR_SECRET as string ?? "";
    const signed = await signQrPayload({ no: noSurat, nik: r.nik, kode: r.kode, secret: qrSecret });
    const updated: SuratRecord = {
      ...r, tracking_no: r.no, no: noSurat, status: "Disetujui", signed_at, signed_by: signerName, qr_payload: signed.raw,
    };
    const deleteResult = await syncDeleteRecord(r.no, username);
    if (!deleteResult.ok) throw new Error("Gagal hapus tracking record");
    const saveResult = await syncSaveRecord(updated, username);
    if (!saveResult.ok) throw new Error("Gagal simpan surat resmi");
    const archiveResult = await syncArchive(noSurat, username);
    if (!archiveResult.ok) throw new Error("Gagal arsipkan surat");
    await logAudit({ action: "surat.approve", detail: `Approve: ${noSurat} oleh ${username}`, username });
    const notify = await notifySurat(updated, "approve");
    refresh();
    setPreview(updated);
    if (notify.ok) toast.success("Disetujui & notifikasi WA dikirim");
    else toast.warning("Disetujui, WA gagal", { description: notify.message });
  } catch (e) {
    toast.error("Gagal approve", { description: e instanceof Error ? e.message : String(e) });
  } finally {
    setPendingActions((s) => { const n = new Set(s); n.delete(r.no); return n; });
  }
};
```

**Assessment:** CORRECT AND COMPLETE (all-or-nothing pattern is solid).
- Nomor surat generation: ✓
- QR payload signing: ✓
- All-or-nothing: delete + save + archive with throw on any failure: ✓
- Audit log: ✓
- WA notification with fallback: ✓
- Error caught with meaningful message: ✓
- Pending flag cleared in `finally`: ✓

**Additional issue:** `generateNomorSurat()` can throw if the edge function is called without auth (see C-1 in Report 3) — the throw propagates to the catch block and the admin sees "Gagal approve" with the RPC error message. This is correct fail-fast behavior but the error message is cryptic: "Server gagal generate nomor surat (status 401). Hubungi admin." — the admin themselves is causing the 401 by not having auth on the endpoint.

---

## 4C. Admin Components — Cross-Cutting Findings

### Shared Code Duplication

**Confirm dialog pattern** — nearly identical implementations in:
- `PendudukManager.tsx` lines 918-947
- `CMSManager.tsx` lines 229-260
- `TemplateSuratManager.tsx` lines 695-726
- `LembagaManager.tsx` lines 771-807
- `PerangkatDesaManager.tsx` lines 837-871

All follow the same pattern: backdrop overlay, card with icon, message, two buttons. **Should be a shared `<ConfirmDialog>` component.**

**Loading spinner pattern** — identical implementation in 4+ places rendering `<Loader2 className="h-8 w-8 animate-spin text-primary" />` centered. **Should be `<LoadingSpinner size="lg" />`.**

**Image upload field** — nearly identical implementations in CMSManager, LembagaManager, PerangkatDesaManager. **Should be a shared `<ImageUploadField>` component.**

### Roles Matrix Gaps

The permission matrix in `src/lib/roles.ts` covers only:
- `template.*` (partial coverage in TemplateSuratManager)
- `surat.*` (covered elsewhere)
- `settings.manage` (partial coverage in WilayahSettings)

**Completely absent from the matrix:**
- `penduduk.*` (add/edit/delete/purge)
- `cms.*` (add/edit/delete content per type)
- `lembaga.*` (CRUD for lembaga)
- `perangkat.*` (CRUD for perangkat)
- `wilayah.*` (edit wilayah)
- `alerts.*` (view alerts)

This means **no admin component can properly implement `can()` checks** for their core functionality because the actions don't exist in the matrix.

### Global Error Handling Inconsistency

- `TemplateSuratManager`: no try-catch in `onSave`
- `CMSManager`: generic try-catch with hardcoded message
- `LembagaManager`/`PerangkatDesaManager`: `toast.message(result.message, ...)` for failures (neutral toast, not error)
- `WilayahSettings`: no try-catch at all
- `AlertPanel`: no try-catch at all
- `PendudukManager`: uses `toast.error` but closes modal before showing error

### Memory Leak Pattern (All Components)

Every component that calls `init*Store()` inside a `useEffect` lacks an abort flag. If the component unmounts before the init resolves, `setData`/`setLoading` calls fire on an unmounted component. Pattern repeated in:
- `PendudukManager.tsx` lines 177-182
- `LembagaManager.tsx` lines 292-298
- `PerangkatDesaManager.tsx` lines 249-255, 902-908, 1326-1331
- `CMSManager.tsx`: no store init but similar issue if stores aren't ready

### No Pagination in CMSManager, TemplateSuratManager, LembagaManager, PerangkatDesaManager

All render full filtered lists in the DOM. With 500+ galeri images or 50+ templates, the table becomes slow.

---

## 4D. Code Quality Issues — Key Findings

### Critical

1. **`functions/api/send-wa.ts:146`** — `sb` is **never defined in scope**. `createAdminClient(env)` result is assigned inside `logToDb()` but at line 146 `sb` is undeclared. Every `send-wa` call crashes before Fonnte. Token always falls back to `env.FONNTE_API_KEY`. **Fix:** Add `const sb = createAdminClient(env);` before line 146.

2. **`src/pages/EditSurat.tsx:136`** — `useEffect` missing `wargaId` in deps array. Ownership check runs once. Session change can leave stale `wargaId`. **Fix:** Add `wargaId` to dependency array.

3. **`src/pages/ESurat.tsx:426,429`** — `getWargaSession()` called 3 times in render. Non-null assertion `!` could throw if function returns inconsistent values. **Fix:** Capture once: `const sess = getWargaSession();`

### High

4. **`src/pages/admin.tsx:1576`** — `<td colSpan={6}>` but `<thead>` has 7 columns (empty state message offset). **Fix:** `colSpan={7}`

5. **`src/pages/admin.tsx:1003-1014` vs 1304-1308** — Two `onSend` handlers; the inline card handler never calls `logAudit`. WA sends from card are untracked.

6. **`src/lib/useSupabaseSync.ts:870`** — `const row = payload.new as any;` unsafe cast in realtime subscription. TypeScript provides no safety.

7. **`src/pages/EditSurat.tsx:184`** — `changed_fields: ["kontak", "data", "attachments"].filter(() => true)` — filter predicate always returns true. Edit history is always `["kontak", "data", "attachments"]` regardless of what changed.

8. **`src/pages/ESurat.tsx:353`** — CAPTCHA silently bypassed when offline. No visual feedback. User submits without CAPTCHA verification.

### Medium

9. **`src/lib/sentry.ts:63,138,173`** — `console.log` in production code leaks telemetry info.

10. **`src/pages/ESurat.tsx:331`** — `await new Promise((r) => setTimeout(r, 700))` artificial delay with no comment explaining why.

11. **`src/pages/admin.tsx:116`** — `!!WifiOff` double-negates a React component (always truthy). Should be `isOffline` or removed.

12. **`src/lib/useSupabaseSync.ts:253`** — `fromDbRecord()` casts `row.status` to `SuratStatus` with no runtime validation. Invalid DB strings silently stored.

13. **`src/components/admin/SuratPreviewPanel.tsx:64`** — `isSelfie()` uses filename length as heuristic — fragile.

### Low

14. **`src/pages/ESurat.tsx:1431`** — `typeof window !== "undefined" && isSupabaseConfigured` — redundant check.

15. **`src/pages/admin.tsx:188`** — `String(err)` on Error produces `"[object Error]"` — should be `err instanceof Error ? err.message : String(err)`.

16. **`src/pages/EditSurat.tsx:116`** — Mixing Indonesian and Mandarin in error message (`已经` is accidental typo). Should be pure Indonesian.

---

# CONSOLIDATED ACTION ITEMS (Priority Order)

## Must Fix Before Deploy

| # | Severity | File | Issue |
|---|---|---|---|
| 1 | CRITICAL | `functions/api/send-wa.ts:146` | `sb` undefined — every WA send crashes |
| 2 | CRITICAL | `functions/api/generate-nomor-surat.ts` | No admin auth check |
| 3 | CRITICAL | `functions/api/generate-pdf.ts` | No admin auth check |
| 4 | CRITICAL | `functions/api/send-wa.ts` | No admin auth check |
| 5 | CRITICAL | `functions/api/push/send.ts` | No admin auth check |
| 6 | CRITICAL | `functions/_lib/utils.ts` | SHA-256 OTP hashing — replace with bcrypt |
| 7 | CRITICAL | `supabase/migrations/031_surat_requests_perf_index.sql` | Index on `no_surat` (renamed to `no`) |
| 8 | CRITICAL | `supabase/migrations/007_...sql` | `track_surat()` references `no_surat` |
| 9 | CRITICAL | `supabase/migrations/016_...sql` | References `no_surat` |
| 10 | HIGH | `functions/api/auth/admin-login.ts` | Non-constant-time password comparison |
| 11 | HIGH | `functions/api/auth/verify-otp.ts` | OTP mark-used failure proceeds |
| 12 | HIGH | `src/pages/admin.tsx:319` | `toast.error` on successful reject |
| 13 | HIGH | `src/lib/letter-engine.ts` | DNA preset name mismatch for SP_KTP/SP_KK/VERIF_DTKS/SK_NIKAH |
| 14 | HIGH | `functions/api/push/send.ts:111` | Wrong secret `VAPID_PRIVATE_KEY` instead of `ADMIN_SESSION_SECRET` |
| 15 | HIGH | `src/lib/esurat-notif.ts` | `forward` trigger not wired — warga don't get notified on forward to Kades |

## Fix Before Next Release

| # | Severity | File | Issue |
|---|---|---|---|
| 16 | MEDIUM | `functions/_lib/utils.ts` | CORS wildcards on all endpoints |
| 17 | MEDIUM | `functions/api/generate-pdf.ts:254` | `detail: String(err)` exposes raw errors |
| 18 | MEDIUM | `functions/api/auth/request-otp.ts` | OTP exposed in HTTP response when Fonnte not configured |
| 19 | MEDIUM | `functions/api/auth/admin-login.ts:167-176` | Malformed Set-Cookie header construction |
| 20 | MEDIUM | `functions/_lib/rate-limit.ts` | In-memory store — bypassable in multi-instance deploy |
| 21 | MEDIUM | `src/lib/esurat-store.ts` | `foto_selfie` stored in attachments, not as own field |
| 22 | MEDIUM | `functions/api/auth/admin-login.ts` | Plain password stored in session payload (env fallback) |
| 23 | MEDIUM | `src/pages/admin.tsx:1576` | colSpan=6 but 7 columns |
| 24 | MEDIUM | `src/pages/admin.tsx:1003-1308` | Two onSend handlers; card handler missing logAudit |
| 25 | MEDIUM | `src/lib/useSupabaseSync.ts:870` | `as any` unsafe cast in realtime subscription |
| 26 | MEDIUM | `src/pages/EditSurat.tsx:184` | `changed_fields` always `["kontak","data","attachments"]` |
| 27 | MEDIUM | `src/pages/ESurat.tsx:353` | CAPTCHA silently bypassed when offline |

## Cleanup (No Rush)

| # | File | Issue |
|---|---|---|
| 28 | `supabase/migrations/warga-seeds/005.001-005.011` | DELETE duplicate seed files |
| 29 | `src/lib/esurat-notif.ts` | Remove commented-out `forward` case |
| 30 | `src/lib/letter-engine.ts` | Remove orphaned `SP_IMB` DNA preset |
| 31 | `package.json` | Remove `pdf-lib` dependency |
| 32 | `package.json` | Move `@types/papaparse`, `@types/qrcode`, `@types/leaflet` to devDependencies |
| 33 | `functions/api/generate-pdf.ts` | Remove `generateMockSurat`/`generateMockWarga` |
| 34 | `src/lib/qr-signature.ts` / `functions/_lib/utils.ts` | De-duplicate HMAC-SHA256 implementation |
| 35 | `src/pages/ESurat.tsx` | Remove dead `Trophy` import |
| 36 | `src/pages/ESurat.tsx` | Gate `PENDUDUK_MOCK` behind DEV mode |
| 37 | `functions/api/push/send.ts` | Add `ADMIN_SESSION_SECRET` to Cloudflare Secrets |
| 38 | `CLAUDE.md` | Document `ADMIN_SESSION_SECRET` env var |

## Enhancement (Nice to Have)

| # | File | Issue |
|---|---|---|
| 39 | All 8 admin components | Create shared `<ConfirmDialog>`, `<LoadingSpinner>`, `<ImageUploadField>` |
| 40 | `src/lib/roles.ts` | Add `penduduk.*`, `cms.*`, `lembaga.*`, `perangkat.*`, `wilayah.*` actions |
| 41 | `CMSManager.tsx`, `TemplateSuratManager.tsx` | Add pagination for large datasets |
| 42 | All components | Add AbortController flags to `init*Store()` calls in useEffect |
| 43 | `src/pages/admin.tsx` | Add success toast on `lanjutApproval` |
| 44 | `functions/_lib/rate-limit.ts` | Implement Cloudflare KV for distributed rate limiting |

---

*Report compiled from: 9 parallel deep audits covering security, migrations, code quality, admin components, admin workflow, e-surat system, settings, cleanup candidates, and individual library analysis.*