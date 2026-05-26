# Code Review Report — Seruni Mumbul

**Branch:** `main` (uncommitted working tree changes)
**Date:** 2026-05-25
**Reviewer:** Claude Sonnet 4.6 (manual audit, no skill)
**Files reviewed:** 146 changed files (+12,450 insertions / -14,909 deletions)
**Scope:** Auth, ESurat, Letter Engine, Server API, Routing, Store Init, Frontend Pages

---

## Executive Summary

| Category            | Score        | Trend                       |
| ------------------- | ------------ | --------------------------- |
| **Correctness**     | 8.0 / 10     | ↑                           |
| **Security**        | 8.5 / 10     | ↑↑                          |
| **Performance**     | 7.5 / 10     | ↑                           |
| **Maintainability** | 7.5 / 10     | ↑                           |
| **Test Coverage**   | 3.0 / 10     | ↓                           |
| **OVERALL**         | **7.3 / 10** | **APPROVE with conditions** |

### Recommendation: **APPROVE WITH CONDITIONS**

> This is a large, transformative changeset. The security architecture has been significantly hardened (HMAC signing moved server-side, PBKDF2 passwords, OTP rate limiting, Turnstile captcha). The offline-first architecture is well-reasoned. However, there are 3 critical blockers, 4 security findings, and 5 non-critical issues that must be addressed before production merge.

---

## Finding Severity Index

| Severity   | Count | Short description         |
| ---------- | ----- | ------------------------- |
| 🔴 BLOCKER | 3     | Must fix before merge     |
| 🟠 HIGH    | 4     | Strongly recommend fixing |
| 🟡 MEDIUM  | 5     | Should address            |
| 🟢 INFO    | 3     | Consider improving        |

---

## 🔴 BLOCKER Findings

### BLOCKER-01: `generate-nomor-surat.js` role allowlist missing "Sekretaris Desa"

**File:** `server/api/generate-nomor-surat.js:75`
**Severity:** Critical (Security)
**Category:** Access Control

```javascript
const ALLOWED_ROLES = ["Super Admin", "Operator", "Verifikator", "Kepala Desa"];
if (!checkRole(res, req.adminSession, ALLOWED_ROLES)) return;
```

`src/lib/roles.ts` grants "Sekretaris Desa" the `approve_surat` action, but `generate-nomor-surat.js` does not include this role in `ALLOWED_ROLES`. Any user with the "Sekretaris Desa" role will receive a **403 Forbidden** when attempting to generate an official letter number — a core workflow function.

**Impact:** Sekretaris Desa cannot perform letter approvals, breaking the dual-signer workflow.

**Fix:**

```javascript
const ALLOWED_ROLES = ["Super Admin", "Operator", "Verifikator", "Kepala Desa", "Sekretaris Desa"];
```

---

### BLOCKER-02: `submit-surat.js` reimplements auth — inline duplicate with wrong condition

**File:** `server/api/submit-surat.js:68-85`
**Severity:** Critical (Security)
**Category:** Auth Architecture / Maintenance

The inline `verifyAdminSession()` in `submit-surat.js` duplicates the auth logic from `middleware/auth.js`. The critical issue at line 69:

```javascript
if (ADMIN_SESSION_SECRET && ADMIN_SESSION_SECRET.length >= 32) {
  // HMAC verification only runs if secret is set and >= 32 chars
  if (sig.length > 0) {
    /* verify */
  }
} else if (IS_PROD) {
  return { valid: false, reason: "Session signature required" };
}
```

If `ADMIN_SESSION_SECRET` is set but **less than 32 characters**, the outer `if` fails and the HMAC check is **completely skipped** — even in production mode. The `else if IS_PROD` branch never fires because the outer condition failed (not the inner one).

**Impact:** Production deployments with a misconfigured secret (e.g., 20-char value) will accept unsigned sessions without any signature verification.

**Fix:** Import and use `verifyAdmin` from `../middleware/auth.js`:

```javascript
import { verifyAdmin } from "../middleware/auth.js";
// ...
const err = await verifyAdmin(req, res);
if (err) return unauthorized(res, err.error);
```

Or fix the condition to: `if (ADMIN_SESSION_SECRET.length >= 32)`.

---

### BLOCKER-03: `verify-otp.js` returns vague error when RPC function is not deployed

**File:** `server/api/verify-otp.js:63-85`
**Severity:** Critical (Correctness / UX)
**Category:** Error handling

```javascript
if (!rpcRes.ok) {
  let errMsg = "Verifikasi OTP gagal.";
  let statusCode = 500;
  // parses json, sets statusCode + errMsg
  return res.status(statusCode).json({ ok: false, error: errMsg });
}
```

If the Supabase RPC `warga_verify_otp_and_create_session` is not deployed (missing migration), the function returns a generic "Verifikasi OTP gagal" (500). A user has no indication whether this is an invalid OTP or a server configuration error. This is a deployment hazard.

**Impact:** Silent failure during deployment — operators cannot distinguish between "invalid OTP" and "missing RPC function".

**Fix:** Add explicit check:

```javascript
if (!rpcRes.ok) {
  // Distinguish HTTP error (function not found) from business error
  if (rpcRes.status >= 500) {
    console.error("[verify-otp] RPC server error:", rpcRes.status);
    return serverError(res, "Layanan OTP tidak tersedia. Hubungi administrator.");
  }
  // 4xx errors are user-input related
  const errBody = await rpcRes.json().catch(() => ({}));
  return res
    .status(rpcRes.status)
    .json({ ok: false, error: errBody?.message ?? "Verifikasi gagal.", code: rpcRes.status });
}
```

---

## 🟠 HIGH Findings

### HIGH-01: `loginHybrid()` silently ignores business-level failure from `/api/auth/sign-session`

**File:** `src/lib/auth.ts:351-375`
**Severity:** High (Security)
**Category:** Auth robustness

The `/api/auth/sign-session` endpoint can return HTTP 200 with `{ ok: false, ... }` when the session secret is misconfigured on the server. The current code:

```javascript
if (sigRes.ok) {
  // ← HTTP 200
  const sigData = await sigRes.json();
  if (sigData.ok && sigData.session.sig) {
    normalized.sig = sigData.session.sig;
  }
  // ← NO else clause: if sigData.ok === false, silently continues
} else if (import.meta.env.PROD) {
  /* error */
}
```

When `sigRes.ok` is `true` but `sigData.ok === false`, the session proceeds with a blank `sig` field — no error is shown to the user.

**Fix:**

```javascript
if (sigRes.ok && sigData.ok && sigData.session.sig) {
  normalized.sig = sigData.session.sig;
} else if (import.meta.env.PROD) {
  return { ok: false, error: "Gagal membuat sesi aman. Hubungi administrator." };
}
```

---

### HIGH-02: `submit-surat.js` uses `z.array(z.any())` for attachments — too permissive

**File:** `server/api/submit-surat.js:138`
**Severity:** High (Security)
**Category:** Input validation

```javascript
attachments: z.array(z.any()).optional(),
```

This allows any array items, including deeply nested objects with `__proto__` pollution or arbitrarily large Base64 payloads causing DoS. While `uploadFileToStorage()` sanitizes filenames, the schema should validate attachment shape strictly.

**Fix:**

```javascript
attachments: z.array(z.object({
  name: z.string().max(255),
  data_url: z.string().startsWith("data:"),
}).passthrough()).max(5).optional(),
```

Also add a max size guard in `uploadFileToStorage()`.

---

### HIGH-03: `changePassword` stores PBKDF2 hash only in IndexedDB, not Supabase

**File:** `src/lib/auth.ts:517-525`
**Severity:** High (Security)
**Category:** Data persistence

```javascript
const hashedNewPwd = await hashPbkdf2(newPwd);
cache[idx] = { ...cache[idx], password: hashedNewPwd };
_usersCache = cache;
await idbPut("users", cache[idx]);
```

After a password change, the new PBKDF2 hash is stored in IndexedDB but **not synced to Supabase**. If the browser clears IndexedDB data (user clears site data), the new password is lost and the account may become inaccessible.

**Fix:** Either (a) document that IndexedDB is the authoritative store for additional admin users (non-fixed), or (b) add a Supabase upsert for seeded DB users:

```javascript
if (isSupabaseConfigured) {
  await supabase.from("admin_users").update({ password_hash: hashedNewPwd }).eq("id", uid);
}
```

---

### HIGH-04: `formatNomorSurat()` drops `bulanRomawi` and `inisial` components — breaking change

**File:** `src/lib/nomor-surat.ts:67-72`
**Severity:** High (Correctness)
**Category:** Data transformation

```javascript
export function formatNomorSurat(params: FormatNomorSurat & { bulan?: number }): string {
  const { kodeKlasifikasi, noUrut, tahun } = params;
  const kodeDesa = settings.village?.code || ...;
  return `${kodeKlasifikasi}/${String(noUrut).padStart(3, "0")}/${kodeDesa}/${tahun}`;
}
```

The new format changes letter numbers from:
`474/001/KDS.SRMB/V/2026` → `474/001/3202032002/2026`

The `bulanRomawi` (month) component and `inisialJabatan.inisialDesa` are **removed entirely**. Also, `params.bulan` is destructured but unused.

**Impact:** All existing letter number formats in templates, documents, and integrations will break. This is a **breaking change** that must be documented and migration-tested.

**Fix:** Add `bulanRomawi` back or document the format change with a migration strategy.

---

## 🟡 MEDIUM Findings

### MEDIUM-01: `store-init.ts` — Phase 1 throws on both failures, making app completely unavailable

**File:** `src/lib/store-init.ts:75-84`
**Severity:** Medium (Correctness)
**Category:** UX / availability

```javascript
if (settingsResult?.status === "rejected" && heroResult?.status === "rejected") {
  throw new Error("Critical store init failed...");
}
```

If both Phase 1 stores fail (Supabase down, network error), the entire app throws and shows an error state — even static content becomes inaccessible. Users cannot view the homepage.

**Consider:** Allow fallback to mock/stale data in Phase 1 for resilience, with an "offline mode" banner.

---

### MEDIUM-02: `Admin.tsx` — No pagination on records/archive lists

**File:** `src/pages/Admin.tsx` (~lines 350-400)
**Severity:** Medium (Performance)
**Category:** UI scalability

The `filtered` useMemo processes ALL `records` and `archive` arrays synchronously. With hundreds of letters, every keystroke triggers a re-filter of the full list, causing UI lag.

**Fix:** Implement pagination or virtual scrolling (e.g., `@tanstack/react-virtual`) for the record table.

---

### MEDIUM-03: `warga-auth.ts` — OTP rate limit uses `sessionStorage` (cleared on tab close)

**File:** `src/lib/warga-auth.ts:17-56`
**Severity:** Medium (Security)
**Category:** Rate limiting

```javascript
const raw = sessionStorage.getItem(`otp_attempts_${nik}`);
```

`sessionStorage` is cleared when the browser tab closes. A user can bypass the 3-OTP-per-15-minute limit by closing and reopening the tab. The server already enforces this via the `check_otp_rate_limit` RPC — the client-side check is useful UX but ineffective as a security measure.

**Fix:** Use `localStorage` with a timestamp for the rate limit window.

---

### MEDIUM-04: `useReveal` hook import in `Index.tsx` — source file is untracked

**File:** `src/pages/Index.tsx:11`
**Severity:** Medium (Correctness)
**Category:** Build risk

```javascript
import { useReveal } from "@/hooks/use-reveal";
```

This references `src/hooks/use-reveal.ts`, which is listed in untracked files. The build will fail if the file has issues (typos in exports, wrong API shape).

**Action:** Verify `src/hooks/use-reveal.ts` exists and its exports match the `useReveal<T>()` type used in `ScrollRevealSection`.

---

### MEDIUM-05: `settings-lock.ts` — `perangkat_desa` renamed to `perangkat` + `perangkat_struktur`

**File:** `src/lib/settings-lock.ts:184`
**Severity:** Medium (Correctness)
**Category:** Data migration

```javascript
"perangkat_desa",  // old
"perangkat",         // new
"perangkat_struktur", // new
```

If any existing IndexedDB lock records reference `"perangkat_desa"`, the lock for that store will be lost on first boot after this change. Mock data for `perangkat` will reload.

**Fix:** Add a migration step to rename the lock key in existing IndexedDB records.

---

## 🟢 INFO Findings

### INFO-01: `status_history` field in `SuratRecord` — defined but never populated

**File:** `src/lib/esurat-store.ts:76-82`
**Severity:** Info (Correctness)
**Category:** Dead code risk

The `status_history` field is defined in the `SuratRecord` type but `setStatus()` does not push to it. Either implement the history tracking or remove the field.

---

### INFO-02: `VITE_TURNSTILE_SITE_KEY` gated on `import.meta.env.DEV`

**File:** `src/routes/login.tsx:10-13`
**Severity:** Info (Correctness)
**Category:** Dev/test mode

```javascript
const TURNSTILE_SITE_KEY = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "");
```

In development, the Turnstile widget is never rendered. This means the captcha flow cannot be tested locally. Consider adding a dev-mode test token like the server-side `TEST_TOKENS` set.

---

### INFO-03: `surat-attachments` storage bucket reference added

**File:** `src/lib/media-upload.ts:32,45`
**Severity:** Info (Operation)
**Category:** Infrastructure

The bucket `"surat-attachments"` is now referenced in `storagePathToUrl` and `getMediaUrl`. Verify the Supabase Storage bucket is created with public-read policy before deployment.

---

## What Was Done Well

### Security Hardening (Major)

- ✅ **HMAC signing moved server-side**: `VITE_ADMIN_SESSION_SECRET` removed from browser bundle
- ✅ **PBKDF2 password hashing**: 100,000 iterations, SHA-512, Web Crypto API
- ✅ **Constant-time HMAC comparison** in client (`auth.ts`) and server (`middleware/auth.js`)
- ✅ **Session revocation table**: `isSessionRevoked()` checks `revoked_sessions` Supabase table
- ✅ **OTP rate limiting** on both client (`warga-auth.ts`) and server (`request-otp.js`)
- ✅ **Turnstile CAPTCHA** server-side verification in `submit-surat.js`
- ✅ **Zod schema validation** for all user-submitted data in `submit-surat.js`
- ✅ **Input sanitization** for inisial values in `generate-nomor-surat.js`
- ✅ **Role matrix expanded**: `verify_surat`, `approve_surat` actions added
- ✅ **Dev OTP bypass removed**: Hardcoded `otp === "123456"` eliminated from `warga-auth.ts`

### Offline-First Architecture

- ✅ **Memoized stats** in `esurat-store.ts` with `_statsDirty`/`_statsComputing` guards
- ✅ **`navigator.locks.request()` mutex** in `generateNextNoUrut()` — prevents duplicate letter numbers across tabs
- ✅ **`invalidateStatsCache()`** called on all record mutations
- ✅ **Phase-based store init** — critical stores block first render; non-critical lazy-load

### Letter Engine

- ✅ **Flexible template variable syntax**: `{{key||fallback}}` handles single quotes, bare identifiers
- ✅ **Dual signer support**: `signer_title` field in `RenderedLetter.signature`
- ✅ **DNA clauses normalization**: dash-to-underscore with fallback
- ✅ **`BULAN_ID` extracted** to `utils.ts` for reuse

### DevX & UX

- ✅ **Accessibility**: Skip-to-content link, focus ring styles on all interactive elements
- ✅ **Theme support**: Light/dark/system with `matchMedia` listener
- ✅ **Smooth scroll**: CSS-only with `--scroll-y` CSS var for parallax
- ✅ **Searchable warga NIK**: Debounced fuzzy search with dropdown in `masuk.warga.tsx`
- ✅ **20s absolute timeout** on store initialization

---

## Scorecard Summary

| Dimension       | Score   | Max    | Notes                                             |
| --------------- | ------- | ------ | ------------------------------------------------- |
| Correctness     | 8.0     | 10     | 3 blockers; breaking letter format change         |
| Security        | 8.5     | 10     | Major hardening; BLOCKER-02/03, HIGH-01/02 remain |
| Performance     | 7.5     | 10     | Memoization good; no pagination on Admin lists    |
| Maintainability | 7.5     | 10     | Good docs; inline auth duplication issue          |
| Test Coverage   | 3.0     | 10     | No test files added/modified                      |
| **OVERALL**     | **7.3** | **10** | **APPROVE with conditions**                       |

---

## Required Actions Before Merge

| #   | Priority | Action                                                                   | File                                    |
| --- | -------- | ------------------------------------------------------------------------ | --------------------------------------- |
| 1   | 🔴       | Add "Sekretaris Desa" to `ALLOWED_ROLES`                                 | `server/api/generate-nomor-surat.js:75` |
| 2   | 🔴       | Use `middleware/auth.js verifyAdmin` instead of inline duplicate         | `server/api/submit-surat.js:68-85`      |
| 3   | 🔴       | Add "RPC not found" error handling for missing Supabase function         | `server/api/verify-otp.js:63-85`        |
| 4   | 🟠       | Handle `sigData.ok === false` in sign-session response                   | `src/lib/auth.ts:351-375`               |
| 5   | 🟠       | Replace `z.array(z.any())` with strict attachment schema                 | `server/api/submit-surat.js:138`        |
| 6   | 🟠       | Document IndexedDB-only password persistence for non-fixed users         | `src/lib/auth.ts:517-525`               |
| 7   | 🟡       | Add `bulanRomawi` back to `formatNomorSurat()`, document breaking change | `src/lib/nomor-surat.ts:67-72`          |
| 8   | 🟡       | Show "offline mode" banner instead of throwing on Phase 1 failure        | `src/lib/store-init.ts:75-84`           |
| 9   | 🟡       | Add pagination/virtual scrolling to Admin record table                   | `src/pages/Admin.tsx`                   |
| 10  | 🟡       | Verify `useReveal` hook file exists and exports are correct              | `src/hooks/use-reveal.ts`               |
| 11  | 🟡       | Add migration for `"perangkat_desa"` → `"perangkat"` lock key rename     | `src/lib/settings-lock.ts`              |
| 12  | 🟢       | Implement `status_history` in `setStatus()` or remove dead field         | `src/lib/esurat-store.ts`               |
| 13  | 🟢       | Verify `surat-attachments` Supabase Storage bucket exists                | Ops                                     |

---

## Test Coverage Note

This changeset has **zero test files**. The following should be added before merge:

- `src/lib/__tests__/auth.test.ts` — login, logout, PBKDF2, session expiry
- `src/lib/__tests__/esurat-store.test.ts` — statsByStatus memoization, oldestPending
- `src/lib/__tests__/nomor-surat.test.ts` — formatNomorSurat, generateNextNoUrut
- `server/api/__tests__/` — API endpoint tests

---

_Review generated by Claude Sonnet 4.6 · 2026-05-25_
_Project: d:\seruni-mumbul · 146 files changed · +12,450 / -14,909 lines_
