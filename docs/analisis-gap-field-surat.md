# Analisis Gap Field Surat: OpenSID vs Seruni Mumbul

> **Tanggal**: 2026-05-08
> **Sumber Data**:
>
> - OpenSID: `template-surat-tinymce.json` (ref: `umum/storage/app/template/impor/`)
> - Seruni Mumbul: `src/data/surat-master.ts` + `src/lib/letter-engine.ts` (DNA_CLAUSES_PRESETS)

---

## 1. Metodologi & Catatan Penting

### Konvensi Placeholder

| Platform          | Form Fields                                | Static/Warga Fields                                    | Syntax                           |
| ----------------- | ------------------------------------------ | ------------------------------------------------------ | -------------------------------- |
| **OpenSID**       | `[Form_xxx]`                               | `[NAma]`, `[Nik]`, dll. (mixed case, scrambled vowels) | RTF template                     |
| **Seruni Mumbul** | `fields: [{key: "xxx"}]` di `SURAT_MASTER` | Autofill dari `buildLetterVars()` → `LetterVars`       | `{{placeholder}}` di DNA clauses |

### Catatan Penting

- OpenSID static placeholders menggunakan pola **obfuscated mixed-case** (mis. `NaMa`, `Nik`, `PeKerjaan`, `TgL_surat`, `TtL`). Ini adalah hasil scramble dari nama field aslinya (Nama, NIK, Pekerjaan, Tanggal Lahir, Tempat/Tgl Lahir).
- Seruni Mumbul autofill warga fields sudah tersedia di `buildLetterVars()` — field yang bukan request-specific diambil langsung dari data penduduk.
- OpenSID `[Form_xxx]` juga menggunakan pola obfuscated: `keperluaN`, `alasan_pindaH`, `jumlah_pengikuT`, dll. — ini adalah form input user-generated content.
- 5 field OpenSID static tambahan yang **TIDAK** ada di Seruni Mumbul autofill: `No_kk`, `Kepala_kk`, `Pendidikan_kk`, `Id_bdT` (ID DTKS), `Pengikut_pindaH` (nama-nama keluarga yang pindah).
- Seruni Mumbul memiliki **46 surat tambahan** yang tidak ada di OpenSID (surat non-wewenang yang dikonversi menjadi pengantar).

---

## 2. Perbandingan Field-by-Field (15 Pasangan)

---

### 2.1 Keterangan Domisili → SKD

| Kategori                    | Field                                                                | Keterangan                                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GAPS (OpenSID → Seruni)** | `lama_tinggal`                                                       | **KRITIS**. OpenSID menyediakan field ini secara implisit via template (umur/warga). Seruni **sudah punya** `lama_tinggal` di SKD fields — ✅ SAMA. |
| **Aligned**                 | Semua field warga (nama, nik, ttl, agama, pekerjaan, alamat lengkap) | Seruni autofill dari `buildLetterVars()`.                                                                                                           |
| **Aligned**                 | `keperluan`                                                          | Form field di kedua platform.                                                                                                                       |
| **Seruni Extra**            | `lama_tinggal`                                                       | OpenSID tidak punya Form field eksplisit — tapi OpenSID punya `UsIa` (umur) static. Seruni punya `lama_tinggal` lebih spesifik untuk SKD.           |

**DNA Clause Analysis (SKD):**

```typescript
"Dengan ini menyatakan bahwa :",
"Nama        : {{nama}}\nNIK         : {{nik}}\nTempat/Tgl Lahir: {{tempat_tanggal_lahir}}\nAlamat     : {{alamat}}",
"adalah benar warga kami yang berdomisili di {{alamat}}.",
"Surat keterangan ini dibuat untuk keperluan {{keperluan}}.",
```

- `{{lama_tinggal}}` **TIDAK** digunakan dalam DNA clauses → nilai "-" akan tampil di surat. Field `lama_tinggal` dikumpulkan tapi tidak dirender. Ini adalah **gap kecil** — surat akan tetap valid tapi field tidak muncul di body.
- **DNA Quality: MEDIUM** — data terkumpul tapi tidak dipakai di klausa.

**Match Quality: HIGH** — kedua hampir identik untuk use case domisili.

---

### 2.2 Keterangan Kurang Mampu → SKTM

| Kategori                    | Field                                                    | Keterangan                                                                                                                                                                                                                                                                               |
| --------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GAPS (OpenSID → Seruni)** | `Id_bdT`                                                 | **KRITIS**. OpenSID punya placeholder `Id_bdT` (ID DTKS). Jika warga tidak ada di DTKS, SKTM dari OpenSID bisa dicetak dengan ID tersebut. Seruni Mumbul **TIDAK** punya field ini. Implikasinya: SKTM untuk Program PKH/BPNT dari OpenSID bisa terverifikasi ke DTKS secara sistematis. |
| **Aligned**                 | `keperluan`, `nama`, `nik`, `ttl`, `pekerjaan`, `alamat` | Seruni autofill + form field.                                                                                                                                                                                                                                                            |
| **Aligned**                 | `penghasilan`                                            | Seruni punya `penghasilan` (Rp/bulan). OpenSID: tidak ada Form field khusus — penghasilan ditulis manual di RTF body. Seruni lebih structured.                                                                                                                                           |
| **Aligned**                 | `tanggungan`                                             | Seruni punya `tanggungan` (jumlah tanggungan). OpenSID: tidak ada Form field — di-hardcode di RTF.                                                                                                                                                                                       |

**DNA Clause Analysis (SKTM):**

```typescript
("Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
  "Yang bersangkutan termasuk keluarga kurang mampu/prasejahtera dengan penghasilan Rp {{penghasilan}} per bulan dan menanggung {{tanggungan}} jiwa.",
  "Surat keterangan ini dibuat untuk keperluan {{keperluan}}.");
```

- `{{penghasilan}}` dan `{{tanggungan}}` ✅ filled dari request form fields.
- `Id_bdT` **TIDAK** ada di DNA clauses — ini gap kritis karena SKTM untuk DTKS-linked programs memerlukan ID DTKS agar bisa diverifikasi oleh instansi tujuan.
- Seruni belum punya placeholder `id_dtks` atau `id_bdt`.

**Match Quality: MEDIUM** — field utama ada. Gap kritis: `id_bdt` / DTKS ID untuk verifikasi by instansi.

---

### 2.3 Keterangan Usaha → SKU

| Kategori                    | Field                                              | Keterangan                                                                                                                                                                                  |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GAPS (OpenSID → Seruni)** | `alamat_usaha`                                     | OpenSID TIDAK punya form field untuk alamat usaha — `AlamaT` static mengambil alamat domicile warga, bukan lokasi usaha. Seruni punya `alamat_usaha` eksplisit. **Seruni LEBIH LENGKAP** ✅ |
| **GAPS (OpenSID → Seruni)** | `jenis_usaha`                                      | OpenSID tidak punya — Seruni punya `jenis_usaha` (select). **Seruni LEBIH LENGKAP** ✅                                                                                                      |
| **GAPS (OpenSID → Seruni)** | `tahun_berdiri`                                    | OpenSID tidak punya — Seruni punya `tahun_berdiri`. **Seruni LEBIH LENGKAP** ✅                                                                                                             |
| **GAPS (OpenSID → Seruni)** | `jumlah_karyawan`                                  | OpenSID tidak ada — Seruni punya `jumlah_karyawan`. **Seruni LEBIH LENGKAP** ✅                                                                                                             |
| **Aligned**                 | `nama_usaha`, `nama`, `nik`, `alamat`, `keperluan` | Sama di kedua platform.                                                                                                                                                                     |

**DNA Clause Analysis (SKU):**

```typescript
("Nama       : {{nama}}\nNIK        : {{nik}}\nAlamat     : {{alamat}}",
  "Yang bersangkutan memiliki dan mengelola usaha dengan data:\nNama Usaha    : {{nama_usaha}}\nJenis Usaha    : {{jenis_usaha}}\nAlamat Usaha  : {{alamat_usaha}}",
  "Surat keterangan ini dibuat untuk keperluan {{keperluan}}...");
```

- `{{jenis_usaha}}` ✅ filled
- `{{alamat_usaha}}` ✅ filled
- `{{tahun_berdiri}}`, `{{jumlah_karyawan}}` **TIDAK** ada di DNA clauses → gap karena field dikumpulkan tapi tidak muncul di surat.

**Match Quality: MEDIUM** — Seruni jelas lebih lengkap secara field. Gap: DNA clauses tidak mencakup semua field.

---

### 2.4 Keterangan Pindah Penduduk → PINDAH_DOMISILI

| Kategori                    | Field                             | Keterangan                                                                                                                                                                                                                                                                 |
| --------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GAPS (OpenSID → Seruni)** | `Pengikut_pindaH`                 | **KRITIS**. OpenSID static placeholder — nama-nama anggota keluarga yang ikut pindah. Seruni Mumbul **TIDAK** punya field ini. Gap besar: dalam surat pindah, biasanya diperlukan daftar nama anggota keluarga yang ikut. Letter akan menampilkan "-" untuk tiap pengikut. |
| **GAPS (OpenSID → Seruni)** | `Nip_pamonG`                      | NIP perangkat desa (kades/camat). OpenSID static dari data pamong. Seruni autofill pejabat dari settings tapi **TIDAK punya NIP/NIPEG**. Gap minor untuk surat yang perlu diveerifikasi oleh kecamatan.                                                                    |
| **GAPS (OpenSID → Seruni)** | `UsiA`                            | Usia static warga. Seruni autofill tidak include `umur` (usia dalam tahun). `buildLetterVars()` punya `tanggal_lahir` tapi tidak menghitung umur secara otomatis.                                                                                                          |
| **Seruni Extra**            | `alamat_tujuan`                   | ✅ ada                                                                                                                                                                                                                                                                     |
| **Seruni Extra**            | `jenis_kepindahan`                | Select dengan 5 opsi (dalam satu desa → antar provinsi). **LEBIH BAIK** dari OpenSID yang punya `dusun_tujuaN`, `rt_tujuaN`, `rw_tujuaN`, `kabupaten_tujuan`, `kecamatan_tujuan` terpisah.                                                                                 |
| **Seruni Extra**            | `jumlah_pengikut`                 | ✅ ada                                                                                                                                                                                                                                                                     |
| **Aligned**                 | `alasan_pindah` / `alasan_pindah` | ✅ OpenSID punya `alasan_pindah`, Seruni punya `alasan_pindah` (select).                                                                                                                                                                                                   |

**Detail Breakdown OpenSID `Form_` fields:**
`alasan_pindah`, `desa_atau_kelurahan_tujuan`, `dusun_tujuaN`, `jumlah_pengikuT`, `kabupaten_tujuaN`, `kecamatan_tujuaN`, `keterangaN`, `rt_tujuaN`, `rw_tujuaN`, `tanggal_pindaH`

Seruni fields: `alamat_tujuan`, `alasan_pindah`, `jumlah_pengikut`, `jenis_kepindahan`

→ Seruni **lebih ringkas** dengan `alamat_tujuan` (textarea covering all destination address), tapi OpenSID punya granularity `dusun/rt/rw/kabupaten/kecamatan` yang berguna untuk sistem. **Seruni LOST granular address split.**

**DNA Clause Analysis (PINDAH_DOMISILI):**

```typescript
("Dengan ini menyatakan bahwa :",
  "Nama   : {{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}}",
  "",
  "Bahwa yang bersangkutan akan melakukan pindah domisili dengan tujuan:\nAlamat Tujuan  : {{alamat_tujuan}}\nJenis Kepindahan: {{jenis_kepindahan}}\nJumlah Pengikut: {{jumlah_pengikut}} orang",
  "Surat keterangan ini dibuat sebagai persyaratan administrasi kepindahan.");
```

- `{{alamat_tujuan}}` ✅
- `{{jumlah_pengikut}}` ✅ (jumlah angka)
- `{{Pengikut_pindaH}}` (nama-nama pengikut) **TIDAK** ada dalam DNA — jika ada 3 orang yang ikut, tidak ada placeholder untuk nama mereka → "-" muncul.
- `{{UsiA}}`, `{{Nip_pamonG}}` **TIDAK** ada.

**Match Quality: MEDIUM** — Seruni lebih ringkas dan现代化. Gap kritis: daftar nama pengikut hilang dari surat.

---

### 2.5 Keterangan Nikah → SK_NIKAH

| Kategori                    | Field                                                         | Keterangan                                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GAPS (OpenSID → Seruni)** | `NaMa_dusun`, `NaMa_rw`, `NaMa_kepala_camat`, `SeButan_camat` | **KRITIS**. OpenSID menangkap data dusun RW pemohon dan camat. Seruni **TIDAK punya** field ini. Untuk pengantar nikah, KUA biasanya minta info RW dan kecamatan.                                 |
| **GAPS (OpenSID → Seruni)** | `binti_dcpW`                                                  | **KRITIS**. Field ini menunjukkan nama gadis ibu kandung (untuk akta nikah agama). openSID Form: `binti_dcpW` (binti = "daughter of"). Sangat penting untuk nikah di KUA. Seruni **TIDAK punya**. |
| **GAPS (OpenSID → Seruni)** | `status_kawiN`                                                | Status pernikahan static (belum/kawin). OpenSID punya. Seruni autofill dari `status_perkawinan` tapi ini adalah warga yang melamar, bukan pasangannya.                                            |
| **GAPS (OpenSID → Seruni)** | `JeNis_kelamin_dcpw`                                          | Jenis kelamin pasangan (cpW = calon pasangan wanita). Seruni **TIDAK punya**.                                                                                                                     |
| **Seruni Extra**            | `model_formulir` (N-1 s/d N-6)                                | Sangat bagus — satu surat mencakup 6 formulir. OpenSID terpisah di 6 jenis surat.                                                                                                                 |
| **Seruni Extra**            | `nik_calon`, `nama_calon`                                     | ✅ ada                                                                                                                                                                                            |
| **Seruni Extra**            | `tanggal_nikah`, `tempat_nikah`                               | ✅ ada                                                                                                                                                                                            |
| **OpenSID Extra**           | Static warga `Pendidikan_kk`                                  | Pendidikan static. Seruni tidak autofill pendidikan.                                                                                                                                              |

**DNA Clause Analysis (SK_NIKAH):**

```typescript
"Bahwa yang bersangkutan memenuhi persyaratan untuk melangsungkan pernikahan.\nModel Formulir  : {{model_formulir}}\nNama Pasangan  : {{nama_calon}}\nNIK Pasangan   : {{nik_calon}}",
```

- `{{binti_dcpW}}` **TIDAK ada** → jika pemohon wanita, nama ibu kandung tidak bisa dicantumkan.
- `{{NaMa_dusun}}`, `{{NaMa_rw}}` **TIDAK ada** → alamat hanya pakai `{{alamat}}` generic, tidak ada info RT/RW/Dusun.
- `{{status_kawiN}}` **TIDAK ada** → status kawin pemohon tidak muncul di surat.

**Match Quality: LOW** — OpenSID lebih lengkap untuk akta nikah. Seruni punya model_formulir yang lebih baik tapi kehilangan data kritis: binti (nama gadis ibu), dusun, RW, dan camat.

---

### 2.6 Keterangan Kelahiran → SP_AKTA_KELAHIRAN

| Kategori                    | Field                                                                                             | Keterangan                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **GAPS (OpenSID → Seruni)** | `Nik_ayaH`, `Nik_ibU`, `Nik_pelapoR`, `Nik_saksi_I`, `Nik_saksi_iI`                               | **KRITIS**. Semua NIK (ayah, ibu, pelapor, saksi 1, saksi 2) tidak ada di Seruni. Sangat penting untuk validasi di Dukcapil. |
| **GAPS (OpenSID → Seruni)** | `Pekerjaan_ayaH`, `Pekerjaan_ibU`, `Pekerjaan_pelapoR`, `Pekerjaan_saksi_I`, `Pekerjaan_saksi_iI` | **KRITIS**. Pekerjaan semua pihak. Sering diminta di akta kelahiran.                                                         |
| **GAPS (OpenSID → Seruni)** | `Alamat_ayaH`, `Alamat_ibU`, `Alamat_pelapoR`, `Alamat_saksi_I`, `Alamat_saksi_iI`                | **KRITIS**. Alamat semua pihak (selain pelapor yang autofill).                                                               |
| **GAPS (OpenSID → Seruni)** | `Tempat_tgl_lahir_ayaH`, `Tempat_tgl_lahir_ibU`                                                   | TTL ayah dan ibu — sangat penting untuk akta kelahiran.                                                                      |
| **GAPS (OpenSID → Serusi)** | `Usia_ayaH`, `Usia_ibU`, `Usia_pelapoR`, `Usia_saksi_I`, `Usia_saksi_iI`                          | Usia semua pihak.                                                                                                            |
| **GAPS (OpenSID → Seruni)** | `Jam_kelahiraN`                                                                                   | Jam kelahiran.                                                                                                               |
| **GAPS (OpenSID → Seruni)** | `Hari_kelahiraN`                                                                                  | Hari kelahiran.                                                                                                              |
| **GAPS (OpenSID → Seruni)** | `Warga_negara_ayaH`                                                                               | Kewarganegaraan ayah.                                                                                                        |
| **Seruni Extra**            | `tanggal_lahir` (date), `tempat_lahir`                                                            | ✅ sudah ada                                                                                                                 |
| **Seruni Extra**            | `nama_ibu`, `nama_ayah`                                                                           | ✅ ada                                                                                                                       |

**Catatan Kritis:** OpenSID memiliki **51 placeholder** untuk surat kelahiran (paling lengkap dari semua jenis). Seruni hanya punya 5 field form (`nama_bayi`, `tanggal_lahir`, `tempat_lahir`, `nama_ibu`, `nama_ayah`). **Ini adalah gap paling besar dari semua pasangan.**

**DNA Clause Analysis (SP_AKTA_KELAHIRAN):**

```typescript
"Nama Bayi     : {{nama_bayi}}\nTgl Lahir    : {{tanggal_lahir}}\nTempat Lahir : {{tempat_lahir}}\nNama Ibu      : {{nama_ibu}}\nNama Ayah     : {{nama_ayah}}";
```

- Hanya `nama_bayi`, `tanggal_lahir`, `tempat_lahir`, `nama_ibu`, `nama_ayah` yang dirender.
- Semua field lain (`nik_ayah`, `nik_ibu`, `alamat_ayah`, `alamat_ibu`, `pekerjaan`, `ttl_ayah`, `ttl_ibu`, `jam`, `hari`, `nik_pelapor`, `nama_saksi_1`, `nama_saksi_2`, `nik_saksi`, `alamat_saksi`, `pekerjaan_saksi`) — **HILANG dari surat**.

**Implikasi**: Jika surat ini diajukan ke Dukcapil, banyak data penting yang tidak tercantum. Petugas Dukcapil harus melengkapi manual — **meningkatkan risiko penolakan**.

**Match Quality: LOW** — Seruni sangat kurang untuk akta kelahiran.

---

### 2.7 Keterangan Kematian → SP_AKTA_KEMATIAN

| Kategori                    | Field                                                               | Keterangan                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GAPS (OpenSID → Seruni)** | `Nik_pelapoR`                                                       | NIK pelapor — **KRITIS**. Wajib ada di Akta Kematian.                                                                                                   |
| **GAPS (OpenSID → Seruni)** | `Alamat_pelapoR`                                                    | Alamat pelapor.                                                                                                                                         |
| **GAPS (OpenSID → Seruni)** | `Pekerjaan_pelapoR`                                                 | Pekerjaan pelapor.                                                                                                                                      |
| **GAPS (OpenSID → Seruni)** | `Tanggallahir_pelapoR`                                              | Tanggal lahir pelapor.                                                                                                                                  |
| **GAPS (OpenSID → Seruni)** | `Penyebab_kematiaN`                                                 | **KRITIS**. Penyebab kematian. OpenSID punya ini secara static. Seruni punya field `penyebab` tapi **TIDAK ADA di DNA clauses** dan belum tentu terisi. |
| **GAPS (OpenSID → Seruni)** | `Jam_kematiaN`                                                      | Jam kematian.                                                                                                                                           |
| **GAPS (OpenSID → Seruni)** | `Hari_kematiaN`                                                     | Hari kematian.                                                                                                                                          |
| **Seruni Extra**            | `nama_jenazah`, `tanggal_meninggal`, `tempat_meninggal`, `penyebab` | ✅ semua ada di fields.                                                                                                                                 |

**DNA Clause Analysis (SP_AKTA_KEMATIAN):**

```typescript
"Nama Jenazah    : {{nama_jenazah}}\nTgl Meninggal : {{tanggal_meninggal}}\nTempat         : {{tempat_meninggal}}";
```

- `{{penyebab}}` **TIDAK dirender** di DNA clauses → meskipun field `penyebab` ada di SURAT_MASTER, ia tidak muncul di surat. Ini bug/gap implementasi.
- `{{nik_pelapor}}`, `{{alamat_pelapor}}`, `{{pekerjaan_pelapor}}`, `{{jam_kematian}}`, `{{hari_kematian}}` **HILANG**.

**Match Quality: MEDIUM** — field dasar ada. Gap kritis: `penyebab` tidak dirender, dan data pelapor hilang.

---

### 2.8 Keterangan Beda Identitas → BEDA_NAMA

| Kategori                    | Field                                                                  | Keterangan                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **GAPS (OpenSID → Seruni)** | Semua 11 form field OpenSID adalah user-entered                        | Seruni punya 6 fields (`dokumen1`, `jenis_dokumen1`, `dokumen2`, `jenis_dokumen2`, `keperluan` x2).                                  |
| **Gap Khas**                | `agamA`, `jenis_kelamiN`, `pekerjaaN`, `tanggal_lahiR`, `tempat_lahiR` | OpenSID punya field terpisah per atribut berbeda. Seruni hanya punya 2 nama (`dokumen1`, `dokumen2`) tanpa atribut tambahan.         |
| **Gap**                     | `nama_kartu_identitaS`, `nomor_identitaS`, `perbedaaN`                 | Seruni TIDAK punya field ini. Field ini sangat penting untuk menjelaskan PERBEDAAN apa (e.g., nama sama tapi NIK beda di 2 dokumen). |
| **Seruni Extra**            | `jenis_dokumen1`, `jenis_dokumen2` (select)                            | OpenSID punya tetapi lebih ambigu. Seruni lebih structured.                                                                          |

**Implikasi**: Jika perbedaan nama sangat subtle (e.g., "Ahmad" vs "Achmad", "Siti" vs "Sitti"), tanpa field `perbedaaN` yang jelas, surat tidak bisa menjelaskan perbedaan secara spesifik.

**Match Quality: MEDIUM** — Seruni punya struktur yang baik untuk 2 dokumen tapi kehilangan field penjelasan detail perbedaan.

---

### 2.9 Keterangan Domisili Usaha → SKU (with alamat_usaha)

| Kategori          | Field                                                             | Keterangan                                   |
| ----------------- | ----------------------------------------------------------------- | -------------------------------------------- |
| **Aligned**       | `nama_usaha`                                                      | Sama.                                        |
| **Seruni Extra**  | `jenis_usaha`, `alamat_usaha`, `tahun_berdiri`, `jumlah_karyawan` | Semua dari analisis SKU di atas.             |
| **OpenSID Extra** | Static `Pendidikan_kk`, `Status_kawin`, `AlamaT`                  | Pendidikan kepala keluarga dan status kawin. |

Catatan: "Keterangan Domisili Usaha" di OpenSID adalah surat terpisah dari "Keterangan Usaha" (SKU). Seruni menggabungkan keduanya menjadi satu SKU dengan field `alamat_usaha`. Pendekatan Seruni **lebih praktis**.

**Match Quality: HIGH** — Seruni lebih lengkap dan menggabungkan 2 fungsi.

---

### 2.10 Keterangan Jual Beli → SK_JUAL_BELI_TANAH

| Kategori                    | Field                                                                                                                        | Keterangan                                                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **GAPS (OpenSID → Seruni)** | `AlAmat_pembeli`, `Nik_pembelI`, `Jenis_kelamin_pembeli`, `Pekerjaan_pembeli`, `Tanggallahir_pembelI`, `TeMpatlahir_pembeli` | **KRITIS**. Semua data pembeli (identitas lengkap). Seruni punya `pembeli` (nama) dan `penjual` (nama) tapi **TIDAK punya NIK, alamat, pekerjaan, TTL pembeli**. Sangat penting untuk AJB. |
| **GAPS (OpenSID → Seruni)** | `nama_ketua_adaT`                                                                                                            | Nama kepala adat/ketua RT untuk transaksi. Seruni **TIDAK punya**.                                                                                                                         |
| **GAPS (OpenSID → Seruni)** | `jenis_barang`, `rincian_barang`                                                                                             | OpenSID punya detail barang (termasuk kendaraan). Seruni hanya punya `lokasi_tanah`, `luas_tanah`, `harga`, `pembeli`, `penjual`.                                                          |
| **Seruni Extra**            | `harga`                                                                                                                      | Harga transaksi dalam Rp. OpenSID TIDAK punya — harga tidak tertulis di surat OpenSID.                                                                                                     |
| **Seruni Extra**            | `lokasi_tanah`, `luas_tanah`                                                                                                 | ✅ ada                                                                                                                                                                                     |
| **Aligned**                 | `penjual`                                                                                                                    | Nama penjual.                                                                                                                                                                              |

**Implikasi**: AJB (Akta Jual Beli) di PPAT memerlukan identitas lengkap pembeli dan penjual — NIK, alamat, pekerjaan, TTL semua diperlukan. Seruni hanya punya nama, tidak bisa diverifikasi secara penuh.

**Match Quality: LOW** — gap data pembeli sangat signifikan.

---

### 2.11 Keterangan Kepemilikan Tanah → SK_TANAH_MILIK

| Kategori                    | Field                                                                                | Keterangan                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GAPS (OpenSID → Seruni)** | `atas_nama_tanaH`                                                                    | Nama yang tertera di sertifikat tanah. Seruni TIDAK punya field terpisah — hanya `nama` (dari warga). Jika tanah atas nama orang lain (warisan, girikan), tidak bisa dicantumkan. |
| **GAPS (OpenSID → Seruni)** | `batas_barat_tanaH`, `batas_selatan_tanaH`, `batas_timur_tanaH`, `batas_utara_tanaH` | **KRITIS**. Batas terpisah per arah. Seruni punya `batas` (textarea) — lebih ringkas tapi tidak terstruktur.                                                                      |
| **GAPS (OpenSID → Seruni)** | `FoRm_jenis_tanah`                                                                   | Jenis tanah (sawah, tegalan, bangunan, dll). Seruni TIDAK punya.                                                                                                                  |
| **GAPS (OpenSID → Seruni)** | `nomor_bukti_kepemilikan_tanaH`                                                      | Nomor sertifikat. Sangat penting untuk legalitas.                                                                                                                                 |
| **GAPS (OpenSID → Seruni)** | `bukti_pendukung_kepemilikan_tanah`                                                  | Deskripsi bukti pendukung.                                                                                                                                                        |
| **Seruni Extra**            | `keperluan` (textarea)                                                               | OpenSID tidak punya `keperluan` di surat ini.                                                                                                                                     |
| **Aligned**                 | `lokasi_tanah`, `luas_tanah`                                                         | ✅ sama.                                                                                                                                                                          |

**Implikasi**: Tanpa `atas_nama_tanah` dan `nomor_sertifikat`, surat hanya menyatakan "warga memiliki tanah" tanpa bisa diverifikasi oleh BPN. Batas tanah dalam 1 textarea juga lebih rentan salah interpretasi.

**Match Quality: MEDIUM** — Seruni cukup untuk kebutuhan dasar. Gap untuk keperluan BPN/sertifikasi.

---

### 2.12 Pengantar Izin Keramaian → IZIN_KERAMAIAN

| Kategori                    | Field                                                                           | Keterangan                                                             |
| --------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **GAPS (OpenSID → Seruni)** | `Mulai_berlaku`, `Berlaku_sampai`                                               | Tanggal berlaku surat (mis. 1 hari sebelum acara). Seruni TIDAK punya. |
| **Seruni Extra**            | `nama_acara`, `tgl_mulai`, `tgl_selesai`, `lokasi`, `jumlah_tamu`, `keterangan` | ✅ semua ada.                                                          |
| **Aligned**                 | `jenis_acarA` / `keperluan`                                                     | Keduanya address the same purpose.                                     |

**DNA Clause Analysis (IZIN_KERAMAIAN):**

```typescript
"Nama Acara   : {{nama_acara}}\nPelaksana   : {{nama}}\nLokasi      : {{lokasi}}",
"Tanggal      : {{tgl_mulai}} s.d. {{tgl_selesai}}\nPerkiraan Tamu: {{jumlah_tamu}} orang",
```

- Semua field utama ter-render ✅
- `{{jenis_acarA}}` **TIDAK ada** — hanya `{{nama_acara}}` yang digunakan. Jika acara bernama "Pesta Pernikahan" tapi jenis adalah "Resepsi", tidak ada tempat untuk jenis acara.

**Match Quality: HIGH** — Seruni lebih lengkap secara keseluruhan.

---

### 2.13 Pengantar Laporan Kehilangan → SK_KEHILANGAN

| Kategori                    | Field                           | Keterangan                                                                                             |
| --------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **GAPS (OpenSID → Seruni)** | `rincian`                       | Detail barang yang hilang. Seruni TIDAK punya field `rincian`.                                         |
| **Aligned**                 | `nama_barang` / `barang_hilang` | Sama.                                                                                                  |
| **Aligned**                 | `keterangaN` / `keterangan`     | Sama.                                                                                                  |
| **Seruni Extra**            | `tempat_hilang`, `waktu_hilang` | ✅ ada — OpenSID tidak punya field terpisah, hanya di static `Tempat_kematiaN` untuk template berbeda. |

**DNA Clause Analysis (SK_KEHILANGAN):**

```typescript
"Nama             : {{nama}}\nNIK              : {{nik}}\nBarang/Dokumen : {{barang_hilang}}\nTempat          : {{tempat_hilang}}\nWaktu           : {{waktu_hilang}}";
```

- `{{barang_hilang}}`, `{{tempat_hilang}}`, `{{waktu_hilang}}` ✅
- `{{rincian}}` **TIDAK dirender** — field ada di form tapi tidak di surat. Jika pengguna mengisi detail barang, tidak akan muncul di surat.

**Match Quality: MEDIUM** — gap `rincian` minor.

---

### 2.14 Pengantar SKCK → SP_SKCK

| Kategori                    | Field             | Keterangan                                                                                |
| --------------------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| **GAPS (OpenSID → Seruni)** | `Kepala_kk`       | Nama kepala KK. Seruni autofill tidak include ini.                                        |
| **Aligned**                 | Semua field warga | `nama`, `nik`, `alamat`, `ttl`, `pekerjaan`, `agama` — autofill dari `buildLetterVars()`. |
| **Aligned**                 | `keperluan`       | ✅ sama.                                                                                  |

**DNA Clause Analysis (SP_SKCK):**

```typescript
("Bahwa yang bersangkutan adalah benar warga kami dan selama berdomisili di Desa {{nama_desa}}, tidak pernah tercatat melakukan tindak pidana/kejahatan.",
  "Surat pengantar ini dibuat untuk pengajuan SKCK dan keperluan {{keperluan}}.");
```

- Semua field warga autofill ✅
- `{{nama_desa}}` ✅
- `{{keperluan}}` ✅
- **DNA Quality: HIGH** — data lengkap.

**Match Quality: HIGH** — kedua hampir identik.

---

### 2.15 Keterangan Wali Hakim → WALI_NIKAH

| Kategori                    | Field                            | Keterangan                                                                                                                 |
| --------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **GAPS (OpenSID → Seruni)** | `NaMa_dusun`, `NaMa_rw`          | **KRITIS**. Alamat lengkap RW pemohon — sama dengan gap SK_NIKAH.                                                          |
| **GAPS (OpenSID → Seruni)** | `NaMa_kepala_camat`              | Nama camat untuk pengajuan wali hakim ke PA.                                                                               |
| **OpenSID Form**            | (tidak ada Form\_ field)         | OpenSID tidak punya form field sama sekali — hanya static warga placeholders.                                              |
| **Seruni Extra**            | `alasan_tidak_ada_wali` (select) | Alasan spesifik (wali meninggal, tidak diketahui, berhalangan, tidak bersedia). **Sangat penting** untuk Pengadilan Agama. |
| **Seruni Extra**            | `keterangan` (textarea)          | ✅ ada                                                                                                                     |

**DNA Clause Analysis (WALI_NIKAH):**

```typescript
("Bahwa yang bersangkutan tidak memiliki wali nikah yang dapat hadir karena: {{alasan_tidak_ada_wali}}.",
  "Surat keterangan ini menjadi dasar pengajuan penunjukan wali nikah hakim ke Pengadilan Agama.");
```

- `{{alasan_tidak_ada_wali}}` ✅ — field sangat penting
- `{{NaMa_dusun}}`, `{{NaMa_rw}}` **TIDAK ada** → RT/RW/Dusun tidak tertulis
- `{{NaMa_kepala_camat}}` **TIDAK ada** → nama camat untuk PA tidak ada

**Match Quality: MEDIUM** — Seruni punya alasan yang lebih baik. Gap utama: info camat.

---

### 2.16 Keterangan Penghasilan Orang Tua → SK_PENGHASILAN

| Kategori                    | Field                                                                                                                                     | Keterangan                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **GAPS (OpenSID → Seruni)** | `Nama_ayaH`, `NiK_ayaH`, `Alamat_ayaH`, `Agama_ayaH`, `Usia_ayaH`, `Jenis_kelamin_ayaH`, `Pekerjaan_ayaH`, `Ttl_ayaH`, `penghasilan_ayaH` | **KRITIS**. Semua data AYAH. OpenSID 9 field ayah. Seruni **TIDAK punya**. |
| **GAPS (OpenSID → Seruni)** | `Nama_ibU`, `NiK_ibU`, `Alamat_ibU`, `Agama_ibU`, `Usia_ibU`, `Jenis_kelamin_ibU`, `Pekerjaan_ibU`, `Ttl_ibU`, `penghasilan_ibU`          | **KRITIS**. Semua data IBU. OpenSID 9 field ibu. Seruni **TIDAK punya**.   |
| **GAPS (OpenSID → Seruni)** | `Terbilang`                                                                                                                               | Terbilang otomatis (1.500.000 = satu juta lima ratus ribu).                |
| **GAPS (OpenSID → Seruni)** | `sekolahperguruan_tinggI`, `jurusanfakultasprodI`, `kelassemesteR`, `nomor_induk_siswamahasiswA`                                          | Info pendidikan anak (beasiswa). Seruni TIDAK punya.                       |
| **Seruni Extra**            | `sumber_penghasilan`, `keperluan`                                                                                                         | ✅ ada                                                                     |
| **Aligned**                 | `penghasilan` (pemohon)                                                                                                                   | ✅                                                                         |

**Implikasi**: SK Penghasilan Orang Tua digunakan untuk bantuan pendidikan/beasiswa. openSID menangkap data lengkap ORANG TUA (ayah + ibu). Seruni hanya menangkap penghasilan pemohon. Jika pemohon adalah anak di bawah umur atau mahasiswa dependent, data orang tua adalah KEWAJIBAN untuk verifikasi DTKS/PKPR.

**Match Quality: VERY LOW** — Seruni kehilangan hampir semua data yang membuat surat ini berguna.

---

## 3. Ringkasan JSON

```json
{
  "comparison": [
    {
      "pair": "Keterangan Domisili → SKD",
      "match_quality": "HIGH",
      "gaps": ["lama_tinggal: not rendered in DNA clauses — field collected but not displayed"],
      "seruni_extras": ["lama_tinggal: OpenSID has no explicit form field for this"],
      "dna_quality": "MEDIUM",
      "dna_gaps": [
        "{{lama_tinggal}} collected but unused in DNA; {{lama_tinggal}} not rendered in letter body"
      ]
    },
    {
      "pair": "Keterangan Kurang Mampu → SKTM",
      "match_quality": "MEDIUM",
      "gaps": [
        "Id_bdT: DTKS/BDT ID for government program verification — OpenSID has it as static; Seruni has no DTKS ID field"
      ],
      "seruni_extras": [
        "penghasilan and tanggungan: more structured than OpenSID; OpenSID hardcodes in RTF"
      ],
      "dna_quality": "MEDIUM",
      "dna_gaps": [
        "{{Id_bdT}} completely absent from DNA clauses and field list — critical for PKH/BPNT verification"
      ]
    },
    {
      "pair": "Keterangan Usaha → SKU",
      "match_quality": "MEDIUM",
      "gaps": [],
      "seruni_extras": [
        "alamat_usaha: OpenSID uses residential address as business address (no separate field)",
        "jenis_usaha: not in OpenSID",
        "tahun_berdiri: not in OpenSID",
        "jumlah_karyawan: not in OpenSID"
      ],
      "dna_quality": "MEDIUM",
      "dna_gaps": [
        "{{tahun_berdiri}} collected but not rendered; {{jumlah_karyawan}} collected but not rendered"
      ]
    },
    {
      "pair": "Keterangan Pindah Penduduk → PINDAH_DOMISILI",
      "match_quality": "MEDIUM",
      "gaps": [
        "Pengikut_pindaH: list of family member names relocating — absent from Seruni; only numeric count shown",
        "Nip_pamonG: NIP of village officer — Seruni has signer name but not NIP",
        "Usia: age of pemohon — not auto-calculated in Seruni autofill"
      ],
      "seruni_extras": [
        "jenis_kepindahan: 5-option select vs OpenSID's separate dusun/rt/rw/kab/kec fields",
        "alamat_tujuan: consolidated textarea vs OpenSID's 6 separate address fields"
      ],
      "dna_quality": "MEDIUM",
      "dna_gaps": [
        "{{Pengikut_pindaH}} (nama-nama pengikut) absent from DNA — names of relocating family members not printed",
        "{{Usia}}, {{Nip_pamonG}} absent"
      ]
    },
    {
      "pair": "Keterangan Nikah → SK_NIKAH",
      "match_quality": "LOW",
      "gaps": [
        "NaMa_dusun, NaMa_rw: applicant's village subdivision — critical for KUA verification",
        "NaMa_kepala_camat, SeButan_camat: camat name and title — needed for PA submission",
        "binti_dcpW: mother's maiden name for Akta Nikah religious — CRITICAL; Seruni has no binti field",
        "JeNis_kelamin_dcpw: gender of prospective spouse"
      ],
      "seruni_extras": [
        "model_formulir: N-1 to N-6 consolidated — OpenSID has 6 separate surat types"
      ],
      "dna_quality": "LOW",
      "dna_gaps": [
        "{{binti_dcpW}} absent — mother's maiden name not printed",
        "{{NaMa_dusun}}, {{NaMa_rw}} absent",
        "{{NaMa_kepala_camat}} absent",
        "{{status_kawiN}} absent"
      ]
    },
    {
      "pair": "Keterangan Kelahiran → SP_AKTA_KELAHIRAN",
      "match_quality": "LOW",
      "gaps": [
        "Nik_ayaH, Nik_ibU: father and mother NIK — CRITICAL for Dukcapil",
        "Nik_pelapoR, Nik_saksi_I, Nik_saksi_iI: NIK of reporter and 2 witnesses",
        "Pekerjaan_ayaH, Pekerjaan_ibU, Pekerjaan_pelapoR, Pekerjaan_saksi_I, Pekerjaan_saksi_iI: occupations",
        "Alamat_ayaH, Alamat_ibU, Alamat_pelapoR, Alamat_saksi_I, Alamat_saksi_iI: addresses",
        "Tempat_tgl_lahir_ayaH, Tempat_tgl_lahir_ibU: parents' birth date/place",
        "Usia_ayaH, Usia_ibU, Usia_pelapoR, Usia_saksi_I, Usia_saksi_iI: ages",
        "Jam_kelahiraN, Hari_kelahiraN: birth time and day",
        "Warga_negara_ayaH: father's citizenship"
      ],
      "seruni_extras": [],
      "dna_quality": "LOW",
      "dna_gaps": [
        "Only 5 of 51+ OpenSID placeholders are rendered in DNA — all parent/witness data missing from letter",
        "Nik_ayah, nik_ibu, nik_pelapor, nik_saksi_1, nik_saksi_2, alamat_ayah, alamat_ibu, pekerjaan, ttl_ayah, ttl_ibu, jam, hari, nama_saksi_1, nama_saksi_2, alamat_saksi, pekerjaan_saksi — all absent"
      ]
    },
    {
      "pair": "Keterangan Kematian → SP_AKTA_KEMATIAN",
      "match_quality": "MEDIUM",
      "gaps": [
        "Nik_pelapoR: NIK of death reporter — CRITICAL for Akta Kematian",
        "Alamat_pelapoR, Pekerjaan_pelapoR, Tanggallahir_pelapoR: reporter's full identity",
        "Jam_kematiaN, Hari_kematiaN: exact time and day of death",
        "Penyebab_kematiaN: cause of death — field exists in Seruni but NOT rendered in DNA"
      ],
      "seruni_extras": [],
      "dna_quality": "MEDIUM",
      "dna_gaps": [
        "{{penyebab}} exists as form field but NOT rendered in DNA — BUG: field collected but invisible in letter",
        "{{nik_pelapor}}, {{alamat_pelapor}}, {{pekerjaan_pelapor}}, {{jam_kematian}}, {{hari_kematian}} absent"
      ]
    },
    {
      "pair": "Keterangan Beda Identitas → BEDA_NAMA",
      "match_quality": "MEDIUM",
      "gaps": [
        "perbedaaN: specific description of the difference between names — Seruni lacks this",
        "nama_kartu_identitaS, nomor_identitaS: document type and number"
      ],
      "seruni_extras": ["jenis_dokumen1, jenis_dokumen2: structured select vs OpenSID text input"],
      "dna_quality": "MEDIUM",
      "dna_gaps": ["{{perbedaaN}} absent — exact nature of name difference not stated in letter"]
    },
    {
      "pair": "Keterangan Domisili Usaha → SKU",
      "match_quality": "HIGH",
      "gaps": [],
      "seruni_extras": [
        "jenis_usaha, alamat_usaha, tahun_berdiri, jumlah_karyawan: all missing from OpenSID"
      ],
      "dna_quality": "HIGH",
      "dna_gaps": []
    },
    {
      "pair": "Keterangan Jual Beli → SK_JUAL_BELI_TANAH",
      "match_quality": "LOW",
      "gaps": [
        "AlAmat_pembeli, Nik_pembelI, Jenis_kelamin_pembeli, Pekerjaan_pembeli, Tanggallahir_pembelI, TeMpatlahir_pembeli: buyer's full identity — CRITICAL for AJB at PPAT",
        "nama_ketua_adaT: village/traditional leader name — Seruni has no field",
        "rincian_barang: itemized transaction detail — OpenSID has; Seruni doesn't"
      ],
      "seruni_extras": ["harga: transaction price — OpenSID omits price entirely from letter"],
      "dna_quality": "LOW",
      "dna_gaps": [
        "Buyer's NIK, address, occupation, birth date/place absent from DNA",
        "Seller's NIK, occupation also absent from DNA (only nama_penjual/nama_pembeli text)"
      ]
    },
    {
      "pair": "Keterangan Kepemilikan Tanah → SK_TANAH_MILIK",
      "match_quality": "MEDIUM",
      "gaps": [
        "atas_nama_tanaH: name on land certificate — CRITICAL; Seruni only uses pemohon name",
        "batas_barat_tanaH, batas_selatan_tanaH, batas_timur_tanaH, batas_utara_tanaH: structured boundary by direction — Seruni uses single textarea",
        "FoRm_jenis_tanah: land type (sawah/tegalan/bangunan)",
        "nomor_bukti_kepemilikan_tanaH: certificate number — needed for BPN verification"
      ],
      "seruni_extras": ["keperluan: OpenSID lacks purpose field"],
      "dna_quality": "MEDIUM",
      "dna_gaps": [
        "{{atas_nama_tanah}} absent — land may be under a different person's name",
        "{{nomor_sertifikat}} absent"
      ]
    },
    {
      "pair": "Pengantar Izin Keramaian → IZIN_KERAMAIAN",
      "match_quality": "HIGH",
      "gaps": ["Mulai_berlaku, Berlaku_sampai: validity period — Seruni lacks this"],
      "seruni_extras": [
        "nama_acara, tgl_mulai, tgl_selesai, lokasi, jumlah_tamu, keterangan: all missing from OpenSID"
      ],
      "dna_quality": "HIGH",
      "dna_gaps": ["{{jenis_acarA}} not rendered — only nama_acara used"]
    },
    {
      "pair": "Pengantar Laporan Kehilangan → SK_KEHILANGAN",
      "match_quality": "MEDIUM",
      "gaps": ["rincian: detailed list of lost items — Seruni lacks this field"],
      "seruni_extras": ["tempat_hilang, waktu_hilang: not in OpenSID"],
      "dna_quality": "MEDIUM",
      "dna_gaps": ["{{rincian}} collected but not rendered in DNA"]
    },
    {
      "pair": "Pengantar SKCK → SP_SKCK",
      "match_quality": "HIGH",
      "gaps": ["Kepala_kk: name of household head — Seruni autofill lacks this"],
      "seruni_extras": [],
      "dna_quality": "HIGH",
      "dna_gaps": []
    },
    {
      "pair": "Keterangan Wali Hakim → WALI_NIKAH",
      "match_quality": "MEDIUM",
      "gaps": [
        "NaMa_kepala_camat: nama camat — needed for submission to Pengadilan Agama",
        "NaMa_dusun, NaMa_rw: dusun and RW — same gap as SK_NIKAH"
      ],
      "seruni_extras": [
        "alasan_tidak_ada_wali: structured reason for absent guardian — better than OpenSID"
      ],
      "dna_quality": "MEDIUM",
      "dna_gaps": ["{{NaMa_kepala_camat}} absent; {{NaMa_dusun}} and {{NaMa_rw}} absent"]
    },
    {
      "pair": "Keterangan Penghasilan Orang Tua → SK_PENGHASILAN",
      "match_quality": "VERY_LOW",
      "gaps": [
        "Nama_ayaH, NiK_ayaH, Alamat_ayaH, Agama_ayaH, Usia_ayaH, Jenis_kelamin_ayaH, Pekerjaan_ayaH, Ttl_ayaH, penghasilan_ayaH: ALL 9 father fields absent",
        "Nama_ibU, NiK_ibU, Alamat_ibU, Agama_ibU, Usia_ibU, Jenis_kelamin_ibU, Pekerjaan_ibU, Ttl_ibU, penghasilan_ibU: ALL 9 mother fields absent",
        "sekolahperguruan_tinggI, jurusanfakultasi/prodI, kelas/semesteR, nomor_induk_siswamahasiswA: student info for scholarship",
        "Terbilang: auto-spellout of amount in words"
      ],
      "seruni_extras": ["sumber_penghasilan, keperluan"],
      "dna_quality": "VERY_LOW",
      "dna_gaps": [
        "All 18 parent fields absent from DNA and field list — letter only shows pemohon's income, not parents'",
        "This defeats the entire purpose of 'SK Penghasilan Orang Tua' which is specifically for dependent children applying for scholarships/DTKS"
      ]
    }
  ],
  "critical_gaps": [
    "SP_AKTA_KELAHIRAN: 46+ parent/witness fields (NIK, alamat, pekerjaan, TTL, usia, jam, hari) completely absent — Akta Kelahiran will be rejected by Dukcapil without these",
    "SP_AKTA_KEMATIAN: {{penyebab}} field exists but NOT rendered in DNA — BUG, cause of death won't appear in letter",
    "SK_PENGHASILAN: 18 parent fields (father + mother) entirely missing — letter is nearly useless for its intended purpose (dependent child scholarship/DTKS)",
    "SK_JUAL_BELI_TANAH: Buyer's NIK, alamat, pekerjaan, TTL absent — AJB at PPAT requires full identity of both parties",
    "SK_TANAH_MILIK: atas_nama_tanah and nomor_sertifikat missing — BPN cannot verify ownership without these",
    "SK_NIKAH: binti_dcpW (mother's maiden name), camat name, dusun/RW missing — Akta Nikah at KUA/PA requires these",
    "SKTM: Id_bdT / DTKS ID absent — SKTM cannot be verified by DTKS-integrated programs (PKH, BPNT, PBI JKN)"
  ],
  "summary": "Seruni Mumbul memiliki 73 surat vs OpenSID 43, menunjukkan perluasan signifikan untuk use case non-wewenang. Untuk surat paling umum (SKD, SP_SKCK, IZIN_KERAMAIAN), Seruni bahkan lebih lengkap.Namun terdapat 4 area gap KRITIS yang memerlukan perhatian segera: (1) SP_AKTA_KELAHIRAN kehilangan 46+ field orang tua/saksi — hampir semua data yang diperlukan Dukcapil; (2) SK_PENGHASILAN kehilangan 18 field orang tua — letter tidak berguna untuk purpose-nya; (3) SKTM kehilangan ID DTKS/BPT — tidak bisa diverifikasi oleh instansi; (4) SP_AKTA_KEMATIAN memiliki bug implementasi ({{penyebab}} tidak dirender). Secara umum, Seruni lebih unggul untuk surat wewenang penuh, tapi untuk surat yang menjadi pengantar ke instansi lain (akta kelahiran, akta kematian, AJB), Seruni perlu menambah data party terkait (orang tua, pembeli, dll.) dan memastikan semua field yang dikumpulkan juga benar-benar dirender di DNA clauses."
}
```

---

## 4. Rekomendasi Prioritas

### 🔴 PRIORITAS 1 — Perbaiki Segera (Affected Letters Will Be Rejected)

| #   | Surat               | Gap                                           | Tindakan                                                                    |
| --- | ------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | `SP_AKTA_KEMATIAN`  | `{{penyebab}}` ada di field tapi tidak di DNA | Tambahkan `{{penyebab}}` ke DNA clause                                      |
| 2   | `SP_AKTA_KELAHIRAN` | 46+ field hilang                              | Rancang ulang dengan section untuk Data Orang Tua, Data Pelapor, Data Saksi |
| 3   | `SKTM`              | Tidak ada `id_bdt` / DTKS ID                  | Tambahkan field `id_dtks` + render di DNA                                   |

### 🟡 PRIORITAS 2 — Tingkatkan Kelengkapan

| #   | Surat                | Gap                                      | Tindakan                                                                      |
| --- | -------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| 4   | `SK_PENGHASILAN`     | 18 field orang tua hilang                | Rancang ulang: section Ayah + section Ibu + section Anak (calon penerima)     |
| 5   | `SK_NIKAH`           | binti, camat, dusun, RW hilang           | Tambahkan `binti`, `nama_camat`, `dusun`, `rw`                                |
| 6   | `SK_JUAL_BELI_TANAH` | Data pembeli tidak lengkap               | Tambahkan `nik_pembeli`, `alamat_pembeli`, `pekerjaan_pembeli`, `ttl_pembeli` |
| 7   | `SK_TANAH_MILIK`     | atas_nama_tanah, nomor_sertifikat hilang | Tambahkan kedua field + render di DNA                                         |

### 🟢 PRIORITAS 3 — Peningkatan Minor

| #   | Surat             | Gap                                                       | Tindakan                           |
| --- | ----------------- | --------------------------------------------------------- | ---------------------------------- |
| 8   | `PINDAH_DOMISILI` | Nama pengikut tidak dicetak                               | Tambahkan textarea `nama_pengikut` |
| 9   | `SKD`             | `{{lama_tinggal}}` tidak dirender                         | Tambahkan ke DNA clause            |
| 10  | `SKU`             | `{{tahun_berdiri}}`, `{{jumlah_karyawan}}` tidak dirender | Tambahkan ke DNA clause            |
| 11  | `SK_KEHILANGAN`   | `{{rincian}}` tidak dirender                              | Tambahkan ke DNA clause            |
| 12  | `IZIN_KERAMAIAN`  | `{{jenis_acara}}` tidak dirender                          | Ratakan dengan `nama_acara`        |

---

## 5. Kesimpulan

Seruni Mumbul **secara arsitektural lebih unggul** dari OpenSID untuk sebagian besar surat wewenang penuh desa — desain DNA clauses yang terpisah dari RTF template, autofill warga yang terstruktur, dan 73 jenis surat yang mencakup use case lebih luas.

**Namun terdapat pola gap sistematis untuk surat yang interfacenya dengan instansi eksternal** (Dukcapil, PPAT, Pengadilan Agama, BPN, KUA):

1. **Akta Kelahiran & Kematian**: OpenSID menangkap data pihak terkait lengkap (orang tua, saksi, pelapor). Seruni hanya menangkap nama — NIK, alamat, pekerjaan semua hilang.
2. **Surat Tanah (Jual Beli & Milik)**: OpenSID punya identitas lengkap pembeli/penjual. Seruni hanya nama tanpa NIK.
3. **SKTM**: Tidak ada ID DTKS — tidak bisa diverifikasi oleh sistem.
4. **SK Penghasilan Orang Tua**: Gap paling parah — hampir seluruh data orang tua hilang, membuat surat tidak berguna untuk purpose-nya.

**Rekomendasi strategi**: Prioritas perbaikan berdasarkan jumlah warga yang terdampak dan tingkat kegagalan surat. Akta Kelahiran dan SKTM adalah surat dengan volume tinggi — keduanya memerlukan perbaikan segera.
