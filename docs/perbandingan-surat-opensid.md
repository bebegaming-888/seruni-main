# Perbandingan Jenis Surat — OpenSID vs Seruni Mumbul

> **Terakhir diperbarui:** Mei 2026
> **OpenSID:** [github.com/OpenSID/OpenSID](https://github.com/OpenSID/OpenSID) — `template-surat-tinymce.json` (43 jenis bawaan)
> **Seruni Mumbul:** `src/data/surat-master.ts` — SURAT_MASTER (72 jenis)

---

## Ringkasan

| Metrik                     | OpenSID | Seruni Mumbul | Selisih |
| -------------------------- | ------- | ------------- | ------- |
| Total jenis surat          | 43      | 72            | +29     |
| Dengan lampiran Kemendagri | 9       | 0             | —       |
| Tanpa lampiran             | 34      | 72            | —       |
| Untuk layanan mandiri      | ~15     | 72            | —       |

Seruni Mumbul memiliki **29 jenis surat lebih banyak** dari standar OpenSID. Beberapa merupakan perluasan (misalnya SKTM → ada versi khusus DTKS, beasiswa, dll.) dan beberapa adalah surat non-wewenang yang dijadikan pengantar.

---

## Tabel Perbandingan Lengkap

### Keterangan: Kolom

- **Status**: ✅ ada di Seruni Mumbul | ⚠️ mirip tapi berbeda | ❌ tidak ada | 🔄 berbeda nama/format
- **OpenSID Nama**: nama resmi di template OpenSID
- **Seruni Mumbul**: kode di `surat-master.ts`
- **Keterangan**: catatan perbedaan atau catatan tambahan

Legend: `✅ = ada di Seruni`, `⚠️ = mirip`, `❌ = tidak ada`, `🔄 = beda nama/format`

---

### KEPENDUDUKAN

| #   | OpenSID Nama                | Kode OpenSID | Seruni Mumbul        | Status | Keterangan                                                         |
| --- | --------------------------- | ------------ | -------------------- | ------ | ------------------------------------------------------------------ |
| 1   | Keterangan Domisili         | S-41         | `SKD`                | ✅     | Ada di Seruni, kode `S-474`                                        |
| 2   | Keterangan Pindah Penduduk  | S-04         | `PINDAH_DOMISILI`    | ✅     | Seruni memecah jadi 2: pindah + pendatang                          |
| 3   | —                           | —            | `PENDATANG`          | 🔄     | Seruni-only: keterangan numpang KK                                 |
| 4   | Permohonan Kartu Keluarga   | S-36         | `KK_BARU`            | ✅     | Seruni tambahkan `daftar_anggota` field                            |
| 5   | Permohonan Perubahan KK     | S-41         | `SP_KK`              | ⚠️     | Seruni jadi `SP_KK` (surat pengantar), OpenSID sebagai form F-1.16 |
| 6   | Keterangan Beda Identitas   | 471.1        | `BEDA_NAMA`          | ✅     | Persis sama                                                        |
| 7   | Keterangan Alamat Sementara | —            | `ALAMAT_SEMENTARA`   | 🔄     | Seruni-only                                                        |
| 8   | Keterangan KTP dalam Proses | S-08         | `SP_KTP`             | ✅     | Seruni dengan `jenis_permohonan` field                             |
| 9   | —                           | —            | `SP_AKTA_KELAHIRAN`  | 🔄     | Seruni-only: pengantar ke Dukcapil                                 |
| 10  | Permohonan Akta Lahir       | S-18         | `SP_AKTA_LAHIR`      | ✅     | Seruni sebagai pengantar                                           |
| 11  | —                           | —            | `SP_VERIF_KELAHIRAN` | 🔄     | Seruni-only: verif FKTP dari DTKS                                  |

---

### SOSIAL & KESEJAHTERAAN

| #   | OpenSID Nama            | Kode OpenSID | Seruni Mumbul       | Status | Keterangan                               |
| --- | ----------------------- | ------------ | ------------------- | ------ | ---------------------------------------- |
| 12  | Keterangan Kurang Mampu | S-11         | `SKTM`              | ✅     | Seruni paling lengkap: DTKS, BPJS, KIP   |
| 13  | Keterangan JAMKESOS     | S-15         | `VERIF_DTKS`        | ⚠️     | Seruni memecah jadi 2: DTKS verification |
| 14  | —                       | —            | `SK_BEASISWA`       | 🔄     | Seruni-only: untuk KIP-Kuliah dll        |
| 15  | —                       | —            | `SK_PENELITIAN`     | 🔄     | Seruni-only                              |
| 16  | Keterangan Bepergian    | S-10         | ❌                  | ⚠️     | Mirip: Seruni punya `ALAMAT_SEMENTARA`   |
| 17  | —                       | —            | `SP_INSTANSI`       | 🔄     | Seruni-only: surat pengantar ke instansi |
| 18  | —                       | —            | `SURAT_BANTUAN`     | 🔄     | Seruni-only: multi-bantuan sosial        |
| 19  | —                       | —            | `SURAT_REKOMENDASI` | 🔄     | Seruni-only: surat rekomendasi umum      |

---

### PERNIKAHAN & KELUARGA

| #   | OpenSID Nama                          | Kode OpenSID | Seruni Mumbul          | Status | Keterangan                                                          |
| --- | ------------------------------------- | ------------ | ---------------------- | ------ | ------------------------------------------------------------------- |
| 20  | Keterangan Belum Menikah              | —            | `SK_BELUM_MENIKAH`     | 🔄     | Seruni-only, biasanya ada di OpenSID tapi tidak di template default |
| 21  | Keterangan Nikah                      | S-23         | `SK_NIKAH`             | ✅     | Keduanya persis 6-formulir N-1 s/d N-6                              |
| 22  | Keterangan Untuk Nikah Non-Muslim     | S-50         | `SK_NIKAH_NONMUSLIM`   | ✅     | Persis sama, form F-2.12                                            |
| 23  | —                                     | —            | `SK_JANDA`             | 🔄     | Seruni-only                                                         |
| 24  | —                                     | —            | `SK_DUDA`              | 🔄     | Seruni-only                                                         |
| 25  | Keterangan Pengantar Rujuk atau Cerai | S-35         | ❌                     | ⚠️     | Seruni punya: `SK_JANDA`, `SK_DUDA` bisa mencakup                   |
| 26  | —                                     | —            | `SK_HUBUNGAN_KELUARGA` | 🔄     | Seruni-only                                                         |
| 27  | Keterangan Wali Hakim                 | S-32         | `WALI_NIKAH`           | ⚠️     | Seruni rename jadi `WALI_NIKAH`                                     |
| 28  | —                                     | —            | `DISPENSA_NIKAH`       | 🔄     | Seruni-only                                                         |
| 29  | Keterangan Izin Orang Tua Suami Istri | S-39         | ❌                     | ❌     | —                                                                   |
| 30  | —                                     | —            | `SK_AHLI_WARIS`        | 🔄     | Seruni-only                                                         |
| 31  | Keterangan Pergi Kawin                | S-30         | ❌                     | ❌     | —                                                                   |

---

### USAHA & EKONOMI

| #   | OpenSID Nama                     | Kode OpenSID | Seruni Mumbul       | Status | Keterangan                                         |
| --- | -------------------------------- | ------------ | ------------------- | ------ | -------------------------------------------------- |
| 32  | Keterangan Usaha                 | 500          | `SKU`               | ✅     | Seruni dengan NIB field                            |
| 33  | Keterangan Domisili Usaha        | S-16         | `SKU` + field       | ⚠️     | Seruni: `SKU` dengan `alamat_usaha`, `jenis_usaha` |
| 34  | —                                | —            | `SK_PENGRAJIN`      | 🔄     | Seruni-only                                        |
| 35  | —                                | —            | `SK_PEDAGANG_PASAR` | 🔄     | Seruni-only                                        |
| 36  | —                                | —            | `SP_IZIN_REKLAME`   | 🔄     | Seruni-only: pengantar izin reklame                |
| 37  | —                                | —            | `SP_SANGGAR`        | 🔄     | Seruni-only: pengantar sanggar Seni                |
| 38  | Keterangan Penghasilan Orang Tua | S-42         | `SK_PENGHASILAN`    | ⚠️     | Seruni-generalisasi jadi satu surat                |

---

### PERTANIAN & PETERNAKAN

| #   | OpenSID Nama | Kode OpenSID | Seruni Mumbul      | Status | Keterangan                 |
| --- | ------------ | ------------ | ------------------ | ------ | -------------------------- |
| 39  | —            | —            | `SK_PETANI`        | 🔄     | Seruni-only: Kartu Tani    |
| 40  | —            | —            | `SK_NELAYAN`       | 🔄     | Seruni-only: Kartu Nelayan |
| 41  | —            | —            | `SK_PETERNAK`      | 🔄     | Seruni-only: Kartu Ternak  |
| 42  | —            | —            | `SK_KELOMPOK_TANI` | 🔄     | Seruni-only                |

---

### TANAH & PROPERTI

| #   | OpenSID Nama                 | Kode OpenSID | Seruni Mumbul             | Status | Keterangan                                |
| --- | ---------------------------- | ------------ | ------------------------- | ------ | ----------------------------------------- |
| 43  | Keterangan Kepemilikan Tanah | S-49         | `SK_TANAH_MILIK`          | ✅     | Persis sama                               |
| 44  | Keterangan Jual Beli         | S-05         | `SK_JUAL_BELI_TANAH`      | ✅     | Seruni lebih spesifik: untuk AJB          |
| 45  | Keterangan Harga Tanah       | 845          | ❌                        | ❌     | OpenSID only                              |
| 46  | Pernyataan SPORADIK          | S-40         | `SP_PTSL`                 | ⚠️     | Seruni sebagai `SP_PTSL` (pengantar PTSL) |
| 47  | —                            | —            | `SK_TANAH_TIDAK_SENGKETA` | 🔄     | Seruni-only                               |
| 48  | —                            | —            | `SK_HIBAH_TANAH`          | 🔄     | Seruni-only                               |
| 49  | —                            | —            | `SK_RUMAH_MILIK`          | 🔄     | Seruni-only                               |
| 50  | —                            | —            | `SK_BELUM_PUNYA_RUMAH`    | 🔄     | Seruni-only                               |
| 51  | —                            | —            | `SK_TANAH_WAKAF`          | 🔄     | Seruni-only                               |
| 52  | —                            | —            | `SP_PENDAFTARAN_TANAH`    | 🔄     | Seruni-only: pengantar ke BPN             |
| 53  | —                            | —            | `SP_IMB`                  | 🔄     | Seruni-only: pengantar IMB                |

---

### KESEHATAN & KHUSUS

| #   | OpenSID Nama                  | Kode OpenSID | Seruni Mumbul    | Status | Keterangan  |
| --- | ----------------------------- | ------------ | ---------------- | ------ | ----------- |
| 54  | Keterangan Lahir Mati         | S-22         | ❌               | ❌     | —           |
| 55  | —                             | —            | `SK_DISABILITAS` | 🔄     | Seruni-only |
| 56  | —                             | —            | `SK_LANSIA`      | 🔄     | Seruni-only |
| 57  | —                             | —            | `SK_YATIM_PIATU` | 🔄     | Seruni-only |
| 58  | —                             | —            | `SK_HAMIL`       | 🔄     | Seruni-only |
| 59  | Keterangan Beda Identitas KIS | S-38         | ❌               | ❌     | —           |

---

### PENDIDIKAN

| #   | OpenSID Nama                       | Kode OpenSID | Seruni Mumbul      | Status | Keterangan                              |
| --- | ---------------------------------- | ------------ | ------------------ | ------ | --------------------------------------- |
| 60  | —                                  | —            | `SK_PUTUS_SEKOLAH` | 🔄     | Seruni-only                             |
| 61  | —                                  | —            | `SK_AKTIF_SEKOLAH` | 🔄     | Seruni-only                             |
| 62  | Pernyataan Belum Miliki Akta Lahir | S-19         | ❌                 | ⚠️     | Seruni bisa menggunakan `SP_AKTA_LAHIR` |
| 63  | —                                  | —            | `SK_BENCANA`       | 🔄     | Seruni-only: Surat keterangan bencana   |

---

### SURAT PENGANTAR & PERMINTAAN

| #   | OpenSID Nama                         | Kode OpenSID | Seruni Mumbul          | Status | Keterangan                                      |
| --- | ------------------------------------ | ------------ | ---------------------- | ------ | ----------------------------------------------- |
| 64  | Pengantar Izin Keramaian             | S-12         | `IZIN_KERAMAIAN`       | ✅     | Seruni lebih lengkap dengan `jenis_kegiatan`    |
| 65  | Pengantar Laporan Kehilangan         | S-13         | `SK_KEHILANGAN`        | ✅     | Seruni dengan field `jenis_hilang`, `kronologi` |
| 66  | Pengantar SKCK                       | S-07         | `SP_SKCK`              | ✅     | Persis sama                                     |
| 67  | Pengantar Permohonan Buku Pas Lintas | S-43         | ❌                     | ❌     | —                                               |
| 68  | —                                    | —            | `SP_BEBAS_NARKOBA`     | 🔄     | Seruni-only                                     |
| 69  | —                                    | —            | `SP_PENEBANGAN_POHON`  | 🔄     | Seruni-only                                     |
| 70  | —                                    | —            | `SP_PENGGALANGAN_DANA` | 🔄     | Seruni-only                                     |
| 71  | —                                    | —            | `SK_KEGAWATDARURATAN`  | 🔄     | Seruni-only                                     |

---

### ADMINISTRASI UMUM

| #   | OpenSID Nama                       | Kode OpenSID | Seruni Mumbul          | Status | Keterangan                                           |
| --- | ---------------------------------- | ------------ | ---------------------- | ------ | ---------------------------------------------------- |
| 72  | Keterangan Pengantar               | S-01         | `SP_INSTANSI`          | ⚠️     | Seruni-generalisasi                                  |
| 73  | Keterangan Penduduk                | S-02         | ❌                     | ⚠️     | Seruni punya `SKD` sebagai alternatif                |
| 74  | —                                  | —            | `SPTJM`                | 🔄     | Seruni-only: Surat Pernyataan Tanggung Jawab Mandiri |
| 75  | —                                  | —            | `SURAT_KUASA`          | 🔄     | Seruni-only                                          |
| 76  | —                                  | —            | `SK_WNI_KETURUNAN`     | 🔄     | Seruni-only                                          |
| 77  | —                                  | —            | `SK_HAJI`              | 🔄     | Seruni-only                                          |
| 78  | —                                  | —            | `SK_PASPOR`            | 🔄     | Seruni-only                                          |
| 79  | —                                  | —            | `SK_TKI`               | 🔄     | Seruni-only                                          |
| 80  | —                                  | —            | `SK_KELAKUAN_BAIK`     | 🔄     | Seruni-only: SKCK-like                               |
| 81  | —                                  | —            | `SK_TIDAK_PUNYA_KERJA` | 🔄     | Seruni-only                                          |
| 82  | —                                  | —            | `SK_TIDAK_DI_DESA`     | 🔄     | Seruni-only                                          |
| 83  | Keterangan Kepemilikan Kendaraan   | S-48         | ❌                     | ❌     | —                                                    |
| 84  | Keterangan Wali / Penghasilan Ayah | S-42, S-44   | `SK_PENGHASILAN`       | ⚠️     | Seruni-generalisasi                                  |
| 85  | Keterangan Penghasilan Ibu         | S-45         | `SK_PENGHASILAN`       | ⚠️     | Seruni-generalisasi                                  |
| 86  | Permohonan Duplikat Kelahiran      | S-20         | `SP_AKTA_LAHIR`        | ⚠️     | Seruni sebagai pengantar                             |
| 87  | Permohonan Duplikat Surat Nikah    | S-33         | ❌                     | ❌     | —                                                    |
| 88  | Permohonan Cerai                   | S-34         | ❌                     | ❌     | —                                                    |
| 89  | Kuasa                              | S-47         | `SURAT_KUASA`          | ✅     | Persis sama                                          |
| 90  | —                                  | —            | `SK_ORGANISASI`        | 🔄     | Seruni-only                                          |
| 91  | —                                  | —            | `SK_PENGGUNAAN_LAHAN`  | 🔄     | Seruni-only                                          |
| 92  | Perintah Perjalanan Dinas          | S-46         | ❌                     | ❌     | OpenSID surat dinas                                  |

---

## Kategori yang Sama Sekali Tidak Ada di OpenSID

Surat-surat berikut ada di Seruni Mumbul tapi **tidak ada** di template bawaan OpenSID:

| #   | Kode Seruni               | Nama Surat                               | Kategori     |
| --- | ------------------------- | ---------------------------------------- | ------------ |
| 1   | `SK_PETANI`               | Surat Keterangan Petani                  | Pertanian    |
| 2   | `SK_NELAYAN`              | Surat Keterangan Nelayan                 | Pertanian    |
| 3   | `SK_PETERNAK`             | Surat Keterangan Peternak                | Pertanian    |
| 4   | `SK_KELOMPOK_TANI`        | Surat Keterangan Kelompok Tani           | Pertanian    |
| 5   | `SK_DISABILITAS`          | Surat Keterangan Disabilitas             | Kesehatan    |
| 6   | `SK_LANSIA`               | Surat Keterangan Lansia                  | Kesehatan    |
| 7   | `SK_YATIM_PIATU`          | Surat Keterangan Yatim Piatu             | Kesehatan    |
| 8   | `SK_HAMIL`                | Surat Keterangan Hamil                   | Kesehatan    |
| 9   | `SK_PUTUS_SEKOLAH`        | Surat Keterangan Putus Sekolah           | Pendidikan   |
| 10  | `SK_AKTIF_SEKOLAH`        | Surat Keterangan Aktif Sekolah           | Pendidikan   |
| 11  | `SK_BENCANA`              | Surat Keterangan Bencana                 | Umum         |
| 12  | `SK_PENGGUNAAN_LAHAN`     | Surat Keterangan Penggunaan Lahan        | Tanah        |
| 13  | `SK_JANDA`                | Surat Keterangan Janda                   | Pernikahan   |
| 14  | `SK_DUDA`                 | Surat Keterangan Duda                    | Pernikahan   |
| 15  | `SK_WNI_KETURUNAN`        | Surat Keterangan WNI Keturunan           | Umum         |
| 16  | `SK_HAJI`                 | Surat Keterangan Haji                    | Umum         |
| 17  | `SK_PASPOR`               | Surat Keterangan Paspor                  | Umum         |
| 18  | `SK_TKI`                  | Surat Keterangan TKI                     | Umum         |
| 19  | `SK_HUBUNGAN_KELUARGA`    | Surat Keterangan Hubungan Keluarga       | Keluarga     |
| 20  | `SK_RUMAH_MILIK`          | Surat Keterangan Rumah Milik             | Tanah        |
| 21  | `SK_BELUM_PUNYA_RUMAH`    | Surat Keterangan Belum Punya Rumah       | Tanah        |
| 22  | `SK_TANAH_WAKAF`          | Surat Keterangan Tanah Wakaf             | Tanah        |
| 23  | `SK_TANAH_TIDAK_SENGKETA` | Surat Keterangan Tanah Tidak Bersengketa | Tanah        |
| 24  | `SK_HIBAH_TANAH`          | Surat Keterangan Hibah Tanah             | Tanah        |
| 25  | `SK_PENGRAJIN`            | Surat Keterangan Pengrajin               | Usaha        |
| 26  | `SK_PEDAGANG_PASAR`       | Surat Keterangan Pedagang Pasar          | Usaha        |
| 27  | `SP_INSTANSI`             | Surat Pengantar ke Instansi              | Umum         |
| 28  | `SURAT_BANTUAN`           | Surat Keterangan Bantuan Sosial          | Sosial       |
| 29  | `SURAT_REKOMENDASI`       | Surat Rekomendasi                        | Umum         |
| 30  | `SP_VERIF_KELAHIRAN`      | Surat Pengantar Verifikasi Kelahiran     | Kependudukan |

---

## Kategori yang Ada di OpenSID tapi Tidak Ada di Seruni Mumbul

| #   | Kode OpenSID | Nama Surat                        | Alasan Tidak Ada                      |
| --- | ------------ | --------------------------------- | ------------------------------------- |
| 1   | S-22         | Keterangan Lahir Mati             | Tidak ada di OpenSID default          |
| 2   | 845          | Keterangan Harga Tanah            | Kebutuhan lokal Lombok Timur          |
| 3   | S-38         | Keterangan Beda Identitas KIS     | Cukup `BEDA_NAMA`                     |
| 4   | S-39         | Keterangan Izin Orang Tua         | Jarang diminta                        |
| 5   | S-43         | Pengantar Buku Pas Lintas         | Jarang ada di Lombok                  |
| 6   | S-48         | Keterangan Kepemilikan Kendaraan  | Cukup SKCK + KK                       |
| 7   | S-30         | Keterangan Pergi Kawin            | Cukup `SK_BELUM_MENIKAH`              |
| 8   | S-46         | Perintah Perjalanan Dinas         | Surat kepala daerah, bukan surat desa |
| 9   | S-19         | Pernyataan Belum Milik Akta Lahir | Cukup `SP_AKTA_LAHIR`                 |
| 10  | S-33         | Permohonan Duplikat Surat Nikah   | Cukup `SP_AKTA_LAHIR`                 |
| 11  | S-34         | Permohonan Cerai                  | Cukup pengantar dari KUA              |

---

## Rekomendasi Penambahan ke Seruni Mumbul

Dari analisis perbandingan, berikut surat OpenSID yang **sebaiknya ditambahkan** ke Seruni Mumbul:

### 🔴 High Priority (sering diminta)

1. **Keterangan Harga Tanah** — sangat umum untuk transaksi tanah di Lombok Timur

### 🟡 Medium Priority

2. **Keterangan Lahir Mati** — ada kebutuhan khusus untuk klaim asuransi
3. **Keterangan Beda Identitas KIS** — spesifik untuk klaim BPJS
4. **Keterangan Izin Orang Tua** — diperlukan untuk pernikahan di luar kecamatan

### 🟢 Low Priority

5. **Pengantar Permohonan Buku Pas Lintas** — jarang diminta di Lombok Timur

---

## Kode Klasifikasi Kemendagri

| Kode  | Kepada                          | OpenSID   | Seruni Mumbul |
| ----- | ------------------------------- | --------- | ------------- |
| 474   | Keterangan Pengantar / Domisili | S-01/S-41 | ✅            |
| 475   | Keterangan Pindah               | S-04      | ✅            |
| 470   | Keterangan Kelahiran            | S-17      | ✅            |
| 471   | Keterangan Kematian             | S-21      | ✅            |
| 472   | Keterangan Perkawinan           | S-23      | ✅            |
| 473   | Keterangan Usaha                | 500       | ✅            |
| 474.1 | Keterangan Beda Nama            | 471.1     | ✅            |

---

## Catatan Teknis

### Kemungkinan Duplikat di Seruni Mumbul

- `SK_NIKAH` + `WALI_NIKAH` → bisa digabung karena `SK_NIKAH` sudah mencakup fungsi wali
- `SKU` + `SK_PENGRAJIN` + `SK_PEDAGANG_PASAR` → mirip scope, bisa disederhanakan

### Template Bawaan OpenSID (9 surat dengan lampiran F/N/SWN/SPS)

Seruni Mumbul saat ini TIDAK menggunakan lampiran Kemendagri untuk keperluan pencetakan. Jika diperlukan, berikut yang paling penting:

| Lampiran         | Surat                       | Prioritas |
| ---------------- | --------------------------- | --------- |
| F-1.01           | Biodata Keluarga (KK)       | ⭐⭐⭐    |
| F-1.08           | Pindah Datang WNI           | ⭐⭐      |
| N-1 s/d N-6      | Keterangan Nikah            | ⭐⭐⭐    |
| F-2.01-KELAHIRAN | Kelahiran                   | ⭐⭐      |
| F-2.01-KEMATIAN  | Kematian                    | ⭐⭐      |
| SWN              | Surat Keterangan Wali Nikah | ⭐        |

---

_Dokumen ini membandingkan jenis surat OpenSID (43 default) dengan Seruni Mumbul (72 jenis)._
_Sumber: OpenSID `template-surat-tinymce.json` + Seruni Mumbul `src/data/surat-master.ts`_
