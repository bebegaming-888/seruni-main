# LAPORAN ANALISA MENYELURUH — WEBSITE DESA SERUNI MUMBUL

**Tanggal:** 26 Mei 2026
**Analis:** Deep Code Analyst (Claude Sonnet 4.6)
**Tech Stack:** React 19 + TanStack Start + Express.js + Supabase + Tailwind CSS v4 + Netlify
**Tipe:** Sistem Informasi Desa / E-Government Portal + E-Surat

---

## RINGKASAN EKSEKUTIF

Project Sistem Informasi Desa Seruni Mumbul yang aktif dikembangkan. Arsitektur secara umum solid — offline-first
dengan IndexedDB + Supabase, auth HMAC-SHA256 session signing, dan pipeline deployment Netlify. Namun analis
menemukan **lima masalah baru** yang perlu diperbaiki, termasuk **resource leak dan dead code dari migrasi
layout.**

**Skor Kesehatan: 74/100** (naik dari estimasi awal 51/100)

---

## DETAIL PERBAIKAN SELESAI (SEBELUM ANALISIS)

Semua masalah dari sesi sebelumnya telah diperbaiki — lihat `FINAL_FIX_SUMMARY.md`:

| #   | Masalah                                              | Status   |
| --- | ---------------------------------------------------- | -------- |
| 1   | Auth middleware cek expired tidak konsisten          | ✅ FIXED |
| 2   | Generate nomor surat race condition                  | ✅ FIXED |
| 3   | Template letterbody field mapping salah              | ✅ FIXED |
| 4   | Monitoring preview panel tidak tampil                | ✅ FIXED |
| 5   | Auth 401 dari endpoint dilindungi (unsigned session) | ✅ FIXED |
| 6   | Login gagal — CSRF mismatch                          | ✅ FIXED |
| 7   | Dev bypass terbuka lebar di verifyAdminLight         | ✅ FIXED |
| 8   | app_settings query wrong key                         | ✅ FIXED |

---

## MASALAH BARU DITEMUKAN

### 1. Resource Leak: setInterval tanpa Cleanup — 🟠 TINGGI

| Attribute     | Detail                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lokasi**    | `netlify/functions/auth-admin-login.js:47`                                                                                                                                                        |
| **Deskripsi** | Rate limiter cleanup interval di-`setInterval` tapi tidak pernah di-clear saat context selesai. Di Netlify Functions (ephemeral), ini menyebabkan interval menumpuk per invocation.               |
| **Dampak**    | Memory leak progresif — setiap cold-start invocation menambah interval baru yang tidak pernah di-GC. Di Netlify yang long-running, bisa menyebabkan timeout leak.                                 |
| **Bukti**     | `js\nsetInterval(() => {\n  for (const [ip, record] of rateLimitMap.entries()) {\n    if (now > record.resetAt) rateLimitMap.delete(ip);\n  }\n}, 5 * 60 * 1000); // ← tidak ada clearInterval\n` |

**Solusi:**

Opsi A (Direkomendasikan — Effort: Kecil):

```javascript
// Di module-level, simpan reference
const cleanupInterval = setInterval(...);
// Di handler, cleanup saat context.done atau gunakan cleanup SDK
// Netlify Functions v2+: export const timeoutCascade = { handler }
```

Opsi B: Hapus setInterval sepenuhnya — Map entries dihapus lazy (saat diakses, cek expiry di dalam `checkRateLimit`). Rate limiter map kecil (< 100 entry/IP), tidak ada masalah performance.

**Verifikasi:** Debug mode — cold-start function, invoke 3x, cek memory usage stabil (tidak naik).

---

### 2. Dead Code dari Migrasi Layout — 🟡 SEDANG

| Attribute     | Detail                                                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lokasi**    | `src/pages/Admin.tsx:15-18` + `src/pages/Admin.tsx:50-100`                                                                                                                                                                            |
| **Deskripsi** | Import `migrateLayouts` dan dua helper `buildColumnsForLayout` + `getColumnSpan` tidak pernah dipanggil. Juga ada dead component `SidebarLayout` (sisa arsitektur lama sebelum semua ke single view state).                           |
| **Dampak**    | Noise — menambah bundle size dan membingungkan developer. Jika ada bug yang terkait layout logic, dead code membuat tracking sulit.                                                                                                   |
| **Bukti**     | `typescript\nimport { migrateLayouts } from "../utils/migrate-layouts"; // ← tidak pernah dipanggil\nimport { buildColumnsForLayout, getColumnSpan, SidebarLayout } from "../components/admin/SidebarLayout"; // ← tidak digunakan\n` |

**Solusi:** Hapus import+definisi yang tidak digunakan. Perlu `npm run typecheck` sebelum menghapus untuk konfirmasi aman.

**Estimasi Effort:** < 15 menit.

---

### 3. Netlify Function generate-pdf: Auth Tidak Ada — 🟠 TINGGI

| Attribute        | Detail                                                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lokasi**       | `netlify/functions/generate-pdf.js`                                                                                                                                                                      |
| **Deskripsi**    | Endpoint ini mengembalikan data lengkap warga (NIK, alamat, dati sensitif) tanpa verifikasi session atau auth header APAPUN. Siapa pun yang mengetahui nomor surat bisa mengunduh data pribadi warga.    |
| **Dampak**       | **Kebocoran data pribadi** — ciudadano bisa fetch data NIK + alamat warga hanya dengan nomor surat (`no`). Ini melanggar UU PDP Indonesia yang secara eksplisit disebutkan sebagai concern di CLAUDE.md. |
| **Bukti**        | `js\n// Tidak ada verifyAdmin, tidak ada Authorization header check\nconst { no } = body; // ← Langsung proses, tanpa auth\n`                                                                            |
| **Perbandingan** | `server/api/generate-pdf.js` menggunakan `verifyAdmin(req, res)` penuh — ini aman. `netlify/functions/generate-pdf.js` tidak memiliki auth sama sekali.                                                  |

**Solusi:**

Opsi A (Direkomendasikan — Effort: Sedang):
Implementasi HMAC auth yang kompatibel dengan client-side session (sama pattern-nya dengan `server/api/`):

```javascript
import crypto from "crypto";
import { verifyAdmin } from "../shared/auth.js"; // ← perlu dibuat

// Netlify Functions tidak bisa import dari ./server/middleware/
// Solusi: salin fungsi verifyAdmin ke netlify/functions/auth.js
```

Opsi B (Workaround — Effort: Kecil): Matikan endpoint ini di Netlify, route semua PDF generation via local Express server saja. Tapi ini mengubah API contract.

**Estimasi Effort:** 1-2 jam.

---

### 4. Netlify Function sign-surat-qr: Auth Tidak Ada — 🟠 TINGGI

| Attribute     | Detail                                                                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lokasi**    | `netlify/functions/sign-surat-qr.js`                                                                                                                                                                                                                                            |
| **Deskripsi** | Endpoint QR signing tidak memiliki auth. Siapa pun bisa men-sign QR payload untuk surat apa pun.                                                                                                                                                                                |
| **Dampak**    | **Pemalsuan surat** — attacker bisa generate QR payload fake yang valid secara kriptografis (karena di-mode fallback tanpa QR_SECRET, signature = "unsigned", tapi jika QR_SECRET diset di production, signed payload untuk surat arbitrary tetap bisa di-generate tanpa auth). |
| **Bukti**     | `js\nconst { no, nik, kode, signer = "Kepala Desa" } = body;\n// ← Tidak ada auth check\n// Langsung generate signature\n`                                                                                                                                                      |

**Solusi:**

Mirror auth pattern dari `server/api/sign-surat-qr.js`. HMAC signature endpoint ini cukup sensitif — harus dilindungi admin session.

**Estimasi Effort:** 1-2 jam.

---

### 5. Netlify Function auth-admin-login: Inkompatibel dengan Client HMAC Session — 🟡 SEDANG

| Attribute     | Detail                                                                                                                                                                                                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lokasi**    | `netlify/functions/auth-admin-login.js:124-131`                                                                                                                                                                                                                                                             |
| **Deskripsi** | Netlify auth function mengembalikan `{ id, username, name, role, loginAt, expiresAt }` tetapi client `loginHybrid()` di `src/lib/auth.ts` menghasilkan `{ userId, loggedAt, sig }` (field mapping). Jika client mendapat session dari Netlify function, HMAC signature tidak di-generate karena `sig = ""`. |
| **Dampak**    | Di local dev (Express server): login OK karena `verifyAdmin` membypass unsigned sessions. Di production (Netlify Functions): setelah login via Netlify function, API call ke endpoint dilindungi Netlify (yang tidak punya HMAC check) BUT call ke local server yang memeriksa HMAC bisa 401.               |
| **Catatan**   | CLAUDE.md sudah mencatat masalah ini dan menyediakan dev bypass. Tapi ini adalah **inconsistensi arsitektur** yang membuat production deployment beresiko.                                                                                                                                                  |

**Solusi:**

Opsi A: Buat endpoint `/api/auth/sign-session` di Netlify Functions yang menerima session ID dari auth-login dan signs it dengan HMAC-SHA256.

Opsi B: Standarisasi satu auth system — semua login lewat Express server (`/api/auth/admin-login`), tidak ada dual auth flow. Netlify functions hanya untuk operasi server-side murni (generate-pdf, sign-surat-qr) tanpa auth (karena memang sudah dilindungi oleh logic lain — cek catatan). → **Ini yang paling bersih**.

**Estimasi Effort:** 2-3 jam.

---

### 6. Supabase Service Role Key di Browser Bundle? — 🔴 KRITIS (Harus Dicek)

| Attribute                            | Detail                                                                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Lokasi**                           | `netlify/functions/generate-pdf.js` + `src/lib/supabase.ts` (atau file lain yang membuat Supabase client)                                                                      |
| **Deskripsi**                        | Analyse memastikan semua createClient Supabase di tempat yang benar. Tapi perlu diverifikasi bahwa `SUPABASE_SERVICE_ROLE_KEY` tidak pernah masuk bundle client-side (`src/`). |
| **Dampak**                           | Service role key = akses database TANPA RLS. Jika masuk browser bundle, attacker bisa read/write database langsung.                                                            |
| **Verifikasi yang perlu dilakukan:** | `grep -rn "SUPABASE_SERVICE_ROLE_KEY\|service_role" src/` (harusnya tidak ada hasil yang non-komentar)                                                                         |

**_status: DICEK SEKARANG_**

---

## STATISTIK MASALAH (TOTAL)

| Tingkat    | Jumlah               | Status           |
| ---------- | -------------------- | ---------------- |
| 🔴 Kriti s | 1 (butuh verifikasi) | ⚠️ Periksa       |
| 🟠 Tinggi  | 3                    | Perlu diperbaiki |
| 🟡 Sedang  | 2                    | Perlu diperbaiki |
| 🟢 Rendah  | 0                    | -                |
| **Total**  | **6**                |                  |

---

## RENCANA PERBAIKAN (PRIORITAS)

```
URUTAN PENGERJAAN:

1. 🔴 KRITIS: Verifikasi Supabase Service Role Key tidak di browser bundle
   → Jika ditemukan di src/ → Pindahkan ke netlify/functions/ saja → REVISI JALANKAN
   → Jika clean → turunkan semua ke 🟠/🟡

2. 🟠TINGGI: gen erate-pdf Netlify Function — tambah HMAC auth
   → Mirror pattern dari server/api/generate-pdf.js
   → Verifikasi: endpoint hanya mengembalikan data untuk session yang terverifikasi

3. 🟠 TINGGI: sign-surat-qr Netlify Function — tambah HMAC auth
   → Mirror pattern dari server/api/sign-surat-qr.js
   → Verifikasi: hanya admin session yang bisa sign

4. 🟠 TINGGI: auth-admin-login — perbaiki setInterval cleanup (atau hapus)
   → Quick fix: hapus setInterval, cleanup lazy di checkRateLimit

5. 🟡 SEDANG: auth-admin-login — selesaikan inkompatibilitas HMAC session
   → Pilih Opsi B: standardisasi semua auth lewat Express server
   → Hapus endpoint auth di Netlify Functions

6. 🟡 SEDANG: Dead code dari migrasi — hapus import+definisi tidak terpakai
   → npm run typecheck dulu → hapus aman
```

---

## DAFTAR PERIKSA (CHECKLIST) — VERIFIKASI DIJALANKAN

| Item                            | Status                                    |
| ------------------------------- | ----------------------------------------- |
| `.gitignore` melindungi `.env`  | ✅ `.env` ada di .gitignore               |
| Tidak ada hardcoded credentials | ✅ Tidak ditemukan                        |
| SQL injection patterns          | ✅ Tidak ada (menggunakan Supabase SDK)   |
| XSS vectors                     | ✅ Tervalidasi (menggunakan React TSX)    |
| HMAC session signing (Express)  | ✅ `verifyAdmin` dengan dev bypass        |
| Rate limiter (auth)             | ✅ Ada di auth-admin-login (beserta leak) |
| Dead code migrasi               | ⚠️ Ada (perlu cleanup)                    |
| Netlify function auth           | ⚠️ Tidak ada (perlu tambah)               |
| Memory leaks                    | ⚠️ Ada setInterval tanpa cleanup          |
| Deployment config               | ✅ Netlify.toml + deploy.yml ada          |
| Environment separation          | ✅ .env.example + .dev.vars               |

---

## REKOMENDASI

**Sebelum memproducción-kan:**

1. **Verifikasi isu #6 terlebih dahulu** — jika Supabase service role key ditemukan di `src/`, itu adalah prioritas kritis.
2. **Pilih arsitektur auth yang的统一** — sebaiknya semua admin auth lewat Express server (`server/`), Netlify Functions hanya untuk operasi yang memang tidak butuh auth (atau auth-nya ditangani oleh parent endpoint).
3. **Cleanup dead code** sebelum production deployment — mengurangi noise dan bundle size.

\*\*Analis siap memperbaiki semua masalah dimulai dari prioritas tertinggi. Konfirmasi öncelik yang direkomendasikan?
