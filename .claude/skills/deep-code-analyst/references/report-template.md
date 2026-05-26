# Template Laporan Analisa Project

Copy dan isi template ini saat membuat laporan di Fase 3.

---

# 📊 LAPORAN ANALISA PROJECT: [NAMA PROJECT]

> **Tanggal Analisa:** [Tanggal]
> **Tech Stack:** [Daftar teknologi yang terdeteksi]
> **Tipe Aplikasi:** [e-commerce / SaaS / API / CMS / Portal / dll]
> **Ukuran Project:** ~[X] file, ~[X] baris kode, [X] dependencies

---

## 🎯 RINGKASAN EKSEKUTIF

[2-4 kalimat yang mendeskripsikan kondisi keseluruhan project, area paling kritis,
dan rekomendasi utama. Contoh:]

> Project ini adalah aplikasi e-commerce berbasis Laravel + Vue.js dengan kondisi
> cukup baik di sisi arsitektur, namun ditemukan **3 masalah kritis** pada area security
> yang perlu segera ditangani. Performa database juga memerlukan perhatian karena
> teridentifikasi pola N+1 query pada modul produk. Secara keseluruhan project mendapat
> skor kesehatan **62/100**.

### 🏥 SKOR KESEHATAN PROJECT: [X]/100

| Area          | Skor   | Status        |
| ------------- | ------ | ------------- |
| Security      | [X]/20 | [🔴/🟠/🟡/🟢] |
| Performance   | [X]/20 | [🔴/🟠/🟡/🟢] |
| Code Quality  | [X]/20 | [🔴/🟠/🟡/🟢] |
| Architecture  | [X]/20 | [🔴/🟠/🟡/🟢] |
| DevOps/Deploy | [X]/20 | [🔴/🟠/🟡/🟢] |

---

## 📈 STATISTIK MASALAH

| Tingkat Keparahan | Jumlah  | Contoh                                 |
| ----------------- | ------- | -------------------------------------- |
| 🔴 KRITIS         | [X]     | SQL Injection, credential exposure     |
| 🟠 TINGGI         | [X]     | N+1 query, missing error handling      |
| 🟡 SEDANG         | [X]     | CSS !important berlebihan, console.log |
| 🟢 RENDAH         | [X]     | TODO tidak selesai, magic numbers      |
| **TOTAL**         | **[X]** |                                        |

---

## 🔍 DETAIL MASALAH

### MASALAH KRITIS 🔴 (Tangani Sekarang)

---

#### M-001: [Nama Masalah]

- **Kategori:** [Security / Performance / Frontend / Backend / Database / DevOps]
- **Tingkat:** 🔴 KRITIS
- **Lokasi:** `[path/ke/file.js:baris]` atau `[Area/Module]`
- **Deskripsi:** [Penjelasan jelas apa yang salah]
- **Dampak:** [Apa yang bisa terjadi — data breach, downtime, money loss, dll]
- **Bukti:**
  ```
  [Snippet kode bermasalah atau output scan yang relevan]
  ```

---

#### M-002: [Nama Masalah]

[ulangi format di atas]

---

### MASALAH TINGGI 🟠 (Tangani Minggu Ini)

---

#### M-003: [Nama Masalah]

[format sama]

---

### MASALAH SEDANG 🟡 (Tangani Bulan Ini)

#### M-00X: [Nama Masalah]

[format sama, bisa lebih ringkas]

---

### MASALAH RENDAH 🟢 (Backlog / Improvement)

[Bisa dalam bentuk list saja tanpa detail lengkap]

- [ ] [Masalah 1]
- [ ] [Masalah 2]
- [ ] [Masalah 3]

---

## 💡 REKOMENDASI SOLUSI

### Solusi untuk Masalah Kritis

#### Solusi M-001: [Nama Masalah]

**Opsi yang Direkomendasikan: [Nama Opsi]**

| Opsi                        | Deskripsi   | Effort | Tradeoff   |
| --------------------------- | ----------- | ------ | ---------- |
| ✅ **Opsi A** (Rekomendasi) | [deskripsi] | Kecil  | [tradeoff] |
| Opsi B                      | [deskripsi] | Sedang | [tradeoff] |
| Opsi C                      | [deskripsi] | Besar  | [tradeoff] |

**Implementasi (Opsi A):**

```[language]
// Kode solusi
```

---

## 🗓️ RENCANA PERBAIKAN

### Sprint 1 — KRITIS (Hari ini - 2 hari)

- [ ] M-001: [nama] — Est. [X] jam
- [ ] M-002: [nama] — Est. [X] jam

### Sprint 2 — TINGGI (Minggu ini)

- [ ] M-003: [nama] — Est. [X] jam
- [ ] M-004: [nama] — Est. [X] jam

### Sprint 3 — SEDANG (Bulan ini)

- [ ] M-005: [nama]
- [ ] M-006: [nama]

### Backlog — RENDAH

- [ ] M-007: [nama]
- [ ] [dll]

---

## ✅ LOG PERBAIKAN (diisi saat eksekusi)

| ID    | Masalah | Status                                    | Waktu   | Catatan   |
| ----- | ------- | ----------------------------------------- | ------- | --------- |
| M-001 | [nama]  | ⏳ Dalam Proses / ✅ Selesai / ❌ Blocked | [waktu] | [catatan] |

---

## 📋 LANGKAH SELANJUTNYA SETELAH PERBAIKAN

1. **Testing** — Jalankan test suite / manual testing pada area yang diperbaiki
2. **Code Review** — Minta review dari developer lain untuk perubahan kritis
3. **Staging Deployment** — Deploy ke staging, verifikasi semua fungsi normal
4. **Monitoring** — Pantau log dan error setelah deployment
5. **Documentation** — Update README atau docs jika ada perubahan arsitektur

---

_Laporan dibuat oleh: Claude Deep Code Analyst_
_Berdasarkan scan pada: [tanggal]_
