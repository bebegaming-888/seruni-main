# Tabel Referensi Lengkap Jenis Surat — Desa Seruni Mumbul

> **Terakhir diperbarui:** Mei 2026
> **Sumber:** `src/data/surat-master.ts` + `src/lib/letter-engine.ts` (DNA_CLAUSES_PRESETS)
> **Total jenis surat:** 77 (72 Seruni + 5 diadopsi dari OpenSID)

---

## Ringkasan

### Statistik Jenis Surat

| Metrik                                               | Jumlah                                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Total jenis surat                                    | **77**                                                                                                    |
| Berkategori wewenang penuh desa                      | **77** (100%)                                                                                             |
| Surat pengganti (non-wewenang asli → jadi pengantar) | 10 (`isNew: true`)                                                                                        |
| Surat diadopsi dari OpenSID                          | **5** (SKTM-DTKS, SK_PENGHASILAN-extended, SP_AKTA_KELAHIRAN-full, SP_AKTA_KEMATIAN-full, SK_HARGA_TANAH) |
| Kategori Surat Umum & Lainnya                        | 30                                                                                                        |
| Kategori Pernikahan & Keluarga                       | 12                                                                                                        |
| Kategori Kependudukan                                | 8                                                                                                         |
| Kategori Sosial & Ekonomi                            | 8                                                                                                         |
| Kategori Tanah & Properti                            | 7                                                                                                         |
| Kategori Pertanian & Lingkungan                      | 5                                                                                                         |
| Kategori Usaha & Ekonomi                             | 5                                                                                                         |
| Kategori Surat Dinas                                 | 3                                                                                                         |
| Kategori Pendidikan                                  | 4                                                                                                         |
| Kategori Kesehatan & Khusus                          | 4                                                                                                         |

### Kategori Wewenang vs Non-Wewenang

Semua 72 surat dalam sistem ini ditetapkan sebagai **`wewenang: true`** — artinya desa memiliki wewenang untuk menerbitkannya. Namun secara substansi ada dua kelompok:

- **Wewenang substantif (keterangan asli):** Surat ini merupakan surat keterangan yang diterbitkan desa karena memang memiliki kompetensi untuk membenarkan isinya. Contoh: SKD, SKTM, SKU, SK_PETANI, SK_NELAYAN, dll.
- **Surat pengantar (referral letter):** Surat ini bukan wewenang asli desa, tetapi tetap bisa diterbitkan sebagai pengantar ke instansi berwenang. Contoh: SP-AKTA-KELAHIRAN (wewenang asli = Dukcapil), SP_IMB (wewenang asli = Dinas Perizinan), SP_BEBAS_NARKOBA, SP_PENEBANGAN_POHON, dll.

Tujuh surat ditandai `isNew: true` dalam kode sumber — ini adalah surat-surat pengganti yang dulunya bukan wewenang desa tetapi kini dijadikan surat pengantar dengan wewenang penuh.

### Ringkasan DNA Clauses Coverage

DNA clauses adalah klausa-klausa bernomor baris dalam body surat, berisi placeholder `{{nama_field}}` yang akan disubstitusi saat surat dicetak. Dari 77 jenis surat:

| Status DNA                                    | Jumlah      |
| --------------------------------------------- | ----------- |
| Memiliki DNA_CLAUSES_PRESETS                  | **77**      |
| Total placeholder clause lines seluruh sistem | ~350+ baris |
| Rata-rata clauses per surat                   | ~4.5 baris  |

Semua 72 jenis surat memiliki DNA clauses di `DNA_CLAUSES_PRESETS`. Placeholder DNA default yang berlaku untuk hampir semua surat (bawaan letter-engine):

| Placeholder                | Asal                                                                       |
| -------------------------- | -------------------------------------------------------------------------- |
| `{{nama}}`                 | Data warga: nama lengkap                                                   |
| `{{nik}}`                  | Data warga: NIK 16 digit                                                   |
| `{{tempat_tanggal_lahir}}` | Data warga: kota, DD Bulan YYYY                                            |
| `{{alamat}}`               | Data warga: alamat lengkap + RT/RW/Dusun/Desa/Kecamatan/Kabupaten/Provinsi |
| `{{nama_desa}}`            | Setting: nama desa                                                         |
| `{{nama_kecamatan}}`       | Setting: nama kecamatan                                                    |
| `{{nama_kabupaten}}`       | Setting: nama kabupaten                                                    |
| `{{nomor_surat}}`          | Nomor surat dari `generate-nomor-surat.ts`                                 |
| `{{tanggal}}`              | Tanggal surat diformat Indonesia                                           |
| `{{nama_pejabat}}`         | Setting: nama penanda tangan                                               |
| `{{jabatan_pejabat}}`      | Setting: jabatan penanda tangan                                            |

---

## Tabel Referensi Lengkap

### Keterangan Kolom

| Kolom                 | Penjelasan                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **No**                | Nomor urut                                                                                |
| **Kode**              | Kode identifikasi unik surat (digunakan di URL, form, database)                           |
| **Nama Surat**        | Nama resmi surat dalam sistem                                                             |
| **Kategori**          | Kategori besar berdasarkan klasifikasi 11 kategori                                        |
| **Wewenang**          | `✓` = wewenang penuh (surat keterangan asli); `→` = surat pengantar (bukan wewenang asli) |
| **ETA**               | Estimasi waktu proses                                                                     |
| **Jumlah Field**      | Berapa banyak field formulir spesifik (di luar identitas warga otomatis)                  |
| **Daftar Field**      | Key field formulir yang perlu diisi pemohon                                               |
| **Jumlah DNA**        | Jumlah clause line di DNA_CLAUSES_PRESETS yang berisi placeholder                         |
| **Contoh Clause DNA** | 1–2 baris contoh clause dari DNA_CLAUSES_PRESETS                                          |

> **Catatan:** Field "identitas otomatis" (nama, NIK, alamat, dll.) tidak dihitung di kolom Jumlah Field karena otomatis terisi dari data warga. Daftar Field hanya mencantumkan field yang **harus diisi manual** oleh pemohon.

---

### KEPENDUDUKAN (8 Jenis)

| No  | Kode             | Nama Surat                              | Kategori     | Wewenang | ETA          | Jumlah Field | Daftar Field                                                             | Jumlah DNA | Contoh Clause DNA                                                                                                                                         |
| --- | ---------------- | --------------------------------------- | ------------ | -------- | ------------ | ------------ | ------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | SKD              | Surat Keterangan Domisili               | Kependudukan | ✓        | 1 hari kerja | 2            | keperluan, lama_tinggal                                                  | 3          | `{{nama}}\nNIK         : {{nik}}\nTempat/Tgl Lahir: {{tempat_tanggal_lahir}}\nAlamat     : {{alamat}}`                                                    |
| 2   | PINDAH_DOMISILI  | Surat Keterangan Pindah Domisili        | Kependudukan | ✓        | 2 hari kerja | 4            | alamat_tujuan, alasan_pindah, jumlah_pengikut, jenis_kepindahan          | 4          | `Alamat Tujuan  : {{alamat_tujuan}}\nJenis Kepindahan: {{jenis_kepindahan}}\nJumlah Pengikut: {{jumlah_pengikut}} orang`                                  |
| 3   | PENDATANG        | Surat Keterangan Pendatang / Numpang KK | Kependudukan | ✓        | 1 hari kerja | 4            | asal, alasan_datang, lama_tinggal, nama_pemilik_kk                       | 3          | `{{nama}}\nNIK    : {{nik}}\nAlamat : {{alamat}} (numpek di KK {{nama_pemilik_kk}})`                                                                      |
| 4   | KK_BARU          | Surat Keterangan Kepala Keluarga        | Kependudukan | ✓        | 2 hari kerja | 3            | alasan, jumlah_anggota, daftar_anggota                                   | 3          | `Yang bersangkutan belum memiliki Kartu Keluarga (KK) dengan alasan: {{alasan}}.\nJumlah anggota keluarga yang akan terdaftar: {{jumlah_anggota}} orang.` |
| 5   | BEDA_NAMA        | Surat Keterangan Beda Nama              | Kependudukan | ✓        | 1 hari kerja | 6            | dokumen1, keperluan, jenis_dokumen1, dokumen2, jenis_dokumen2, keperluan | 3          | `Nama pada Dokumen 1 ({{jenis_dokumen1}}) : {{dokumen1}}\nNama pada Dokumen 2 ({{jenis_dokumen2}}) : {{dokumen2}}`                                        |
| 6   | ALAMAT_SEMENTARA | Surat Keterangan Alamat Sementara       | Kependudukan | ✓        | 1 hari kerja | 3            | alamat_sementara, alasan, lama_tinggal                                   | 3          | `Yang bersangkutan saat ini berdomisili sementara di {{alamat_sementara}}.\nAlasan       : {{alasan}}`                                                    |
| 7   | SP-KTP           | Surat Pengantar Pembuatan KTP           | Kependudukan | ✓        | 1 hari kerja | 2            | jenis_permohonan, alasan                                                 | 2          | `Untuk pengajuan Pembuatan KTP dengan jenis permohonan {{jenis_permohonan}}.`                                                                             |
| 8   | SP-KK            | Surat Pengantar Pembuatan KK            | Kependudukan | ✓        | 1 hari kerja | 2            | jenis_perubahan, keterangan                                              | 2          | `Untuk pengajuan Pembuatan/Perubahan Kartu Keluarga dengan jenis {{jenis_perubahan}}.`                                                                    |

---

### SOSIAL & EKONOMI (8 Jenis)

| No  | Kode                 | Nama Surat                             | Kategori         | Wewenang | ETA          | Jumlah Field | Daftar Field                                                                                                                                                                                                                                                                                                  | Jumlah DNA | Contoh Clause DNA                                                                                                                                        |
| --- | -------------------- | -------------------------------------- | ---------------- | -------- | ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | SKTM                 | Surat Keterangan Tidak Mampu (SKTM)    | Sosial & Ekonomi | ✓        | 1 hari kerja | 6            | penghasilan, tanggungan, keperluan, id_bdt, program_bantuan, no_kartu_bantuan                                                                                                                                                                                                                                 | 6          | `Yang bersangkutan termasuk keluarga kurang mampu/prasejahtera dengan penghasilan Rp {{penghasilan}} per bulan dan menanggung {{tanggungan}} jiwa.`      |
| 10  | SK_PENGHASILAN       | Surat Keterangan Penghasilan           | Sosial & Ekonomi | ✓        | 1 hari kerja | 17           | penghasilan, sumber_penghasilan, keperluan, nama_ayah, nik_ayah, tempat_lahir_ayah, tanggal_lahir_ayah, pekerjaan_ayah, penghasilan_ayah, alamat_ayah, nama_ibu, nik_ibu, tempat_lahir_ibu, tanggal_lahir_ibu, pekerjaan_ibu, penghasilan_ibu, alamat_ibu, nama_sekolah, jurusan, kelas_semester, nomor_induk | 16         | `--- DATA AYAH ---` conditional lines + `--- DATA IBU ---` + `--- DATA SEKOLAH ---` (adopsi OpenSID — fully conditional)                                 |
| 11  | SK_KEHILANGAN        | Surat Keterangan Kehilangan            | Sosial & Ekonomi | ✓        | 1 hari kerja | 4            | barang_hilang, tempat_hilang, waktu_hilang, keterangan                                                                                                                                                                                                                                                        | 2          | `Barang/Dokumen : {{barang_hilang}}\nTempat          : {{tempat_hilang}}\nWaktu           : {{waktu_hilang}}`                                            |
| 12  | SP-SKCK              | Surat Pengantar SKCK                   | Sosial & Ekonomi | ✓        | 1 hari kerja | 1            | keperluan                                                                                                                                                                                                                                                                                                     | 2          | `Bahwa yang bersangkutan adalah benar warga kami dan selama berdomisili di Desa {{nama_desa}}, tidak pernah tercatat melakukan tindak pidana/kejahatan.` |
| 13  | SK_KELAKUAN_BAIK     | Surat Keterangan Kelakuan Baik         | Sosial & Ekonomi | ✓        | 1 hari kerja | 1            | keperluan                                                                                                                                                                                                                                                                                                     | 2          | `Yang bersangkutan dikenal berkelakuan baik, tidak pernah tersangkut masalah hukum, dan aktif dalam kegiatan sosial kemasyarakatan.`                     |
| 14  | SK_TIDAK_PUNYA_KERJA | Surat Keterangan Tidak Punya Pekerjaan | Sosial & Ekonomi | ✓        | 1 hari kerja | 1            | keperluan                                                                                                                                                                                                                                                                                                     | 2          | `Yang bersangkutan saat ini tidak memiliki pekerjaan tetap dan termasuk kategori Pencari Kerja.`                                                         |
| 15  | VERIF-DTKS           | Surat Pengantar Verifikasi DTKS        | Sosial & Ekonomi | ✓        | 1 hari kerja | 2            | program_bantuan, keperluan                                                                                                                                                                                                                                                                                    | 2          | `Program bantuan yang dituju: {{program_bantuan}}.`                                                                                                      |
| 16  | SK_BELUM_MENIKAH     | Surat Keterangan Belum Menikah         | Sosial & Ekonomi | ✓        | 1 hari kerja | 3            | keperluan, saksi_1, saksi_2                                                                                                                                                                                                                                                                                   | 3          | `Yang bersangkutan berstatus BELUM MENIKAH / belum pernah melangsungkan pernikahan.`                                                                     |

---

### PERNIKAHAN & KELUARGA (12 Jenis)

| No  | Kode                 | Nama Surat                            | Kategori              | Wewenang | ETA          | Jumlah Field | Daftar Field                                                                                     | Jumlah DNA | Contoh Clause DNA                                                                                                                              |
| --- | -------------------- | ------------------------------------- | --------------------- | -------- | ------------ | ------------ | ------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 17  | SK_BELUM_MENIKAH     | Surat Keterangan Belum Menikah        | Pernikahan & Keluarga | ✓        | 1 hari kerja | 3            | keperluan, saksi_1, saksi_2                                                                      | 3          | `Yang bersangkutan berstatus BELUM MENIKAH / belum pernah melangsungkan pernikahan.`                                                           |
| 18  | SK-NIKAH             | Surat Keterangan Nikah (N-1 s/d N-6)  | Pernikahan & Keluarga | ✓        | 2 hari kerja | 9            | model_formulir, nama_calon, nik_calon, tanggal_nikah, tempat_nikah, binti, nama_camat, dusun, rw | 4          | `Model Formulir  : {{model_formulir}}\nNama Pasangan  : {{nama_calon}}\nNIK Pasangan   : {{nik_calon}}\nBinti          : {{binti}}`            |
| 19  | SK_NIKAH_NONMUSLIM   | Surat Keterangan Nikah Non-Muslim     | Pernikahan & Keluarga | ✓        | 2 hari kerja | 4            | nama_calon, nik_calon, tanggal_nikah, tempat_nikah                                               | 2          | `Bahwa yang bersangkutan rencana akan melangsungkan pernikahan dan surat ini dibuat untuk dicatatkan di Kantor Catatan Sipil.`                 |
| 20  | SK_JANDA             | Surat Keterangan Status Janda         | Pernikahan & Keluarga | ✓        | 1 hari kerja | 3            | alasan_janda, tanggal_status, keperluan                                                          | 2          | `Yang bersangkutan saat ini berstatus JANDA.`                                                                                                  |
| 21  | SK_DUDA              | Surat Keterangan Status Duda          | Pernikahan & Keluarga | ✓        | 1 hari kerja | 3            | alasan_duda, tanggal_status, keperluan                                                           | 2          | `Yang bersangkutan saat ini berstatus DUDA.`                                                                                                   |
| 22  | SK_HUBUNGAN_KELUARGA | Surat Keterangan Hubungan Keluarga    | Pernikahan & Keluarga | ✓        | 1 hari kerja | 4            | nama_anggota_keluarga, keperluan, hubungan, keperluan                                            | 3          | `Hubungan Keluarga : {{hubungan}}\nDengan ini menyatakan bahwa yang bersangkutan memiliki hubungan keluarga dengan {{nama_anggota_keluarga}}.` |
| 23  | SK_AHLI_WARIS        | Surat Keterangan Ahli Waris           | Pernikahan & Keluarga | ✓        | 2 hari kerja | 3            | nama_alm, tgl_meninggal, daftar_waris                                                            | 2          | `Yang bersangkutan adalah benar ahli waris sah dari:\nNama Almarhum/ah : {{nama_alm}}\nTanggal Meninggal : {{tgl_meninggal}}`                  |
| 24  | DISPENSA_NIKAH       | Surat Dispensasi Nikah (Pengantar PA) | Pernikahan & Keluarga | ✓        | 3 hari kerja | 2            | alasan, keterangan                                                                               | 2          | `Bahwa yang bersangkutan mengajukan dispensasi nikah ke Pengadilan Agama dengan alasan: {{alasan}}.`                                           |
| 25  | WALI_NIKAH           | Surat Keterangan Wali Nikah Hakim     | Pernikahan & Keluarga | ✓        | 2 hari kerja | 2            | alasan_tidak_ada_wali, keterangan                                                                | 2          | `Bahwa yang bersangkutan tidak memiliki wali nikah yang dapat hadir karena: {{alasan_tidak_ada_wali}}.`                                        |

---

### USAHA & EKONOMI (5 Jenis)

| No  | Kode              | Nama Surat                           | Kategori        | Wewenang | ETA          | Jumlah Field | Daftar Field                                                                                | Jumlah DNA | Contoh Clause DNA                                                                                                                                                 |
| --- | ----------------- | ------------------------------------ | --------------- | -------- | ------------ | ------------ | ------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 26  | SKU               | Surat Keterangan Usaha (SKU)         | Usaha & Ekonomi | ✓        | 2 hari kerja | 7            | nama_usaha, keperluan, jenis_usaha, alamat_usaha, tahun_berdiri, jumlah_karyawan, keperluan | 3          | `Yang bersangkutan memiliki dan mengelola usaha dengan data:\nNama Usaha    : {{nama_usaha}}\nJenis Usaha    : {{jenis_usaha}}\nAlamat Usaha  : {{alamat_usaha}}` |
| 27  | IZIN_KERAMAIAN    | Surat Keterangan Izin Keramaian      | Usaha & Ekonomi | ✓        | 2 hari kerja | 6            | nama_acara, tgl_mulai, tgl_selesai, lokasi, jumlah_tamu, keterangan                         | 3          | `Nama Acara   : {{nama_acara}}\nPelaksana   : {{nama}}\nLokasi      : {{lokasi}}\nTanggal      : {{tgl_mulai}} s.d. {{tgl_selesai}}`                              |
| 28  | SK_PETERNAK       | Surat Keterangan Peternak            | Usaha & Ekonomi | ✓        | 1 hari kerja | 2            | keperluan, keterangan                                                                       | 2          | `Yang bersangkutan berprofesi sebagai peternak di wilayah Desa {{nama_desa}}.`                                                                                    |
| 29  | SK_PENGRAJIN      | Surat Keterangan Pengrajin / Seniman | Usaha & Ekonomi | ✓        | 1 hari kerja | 2            | jenis_kerajinan, keperluan                                                                  | 2          | `Yang bersangkutan bergerak di bidang kerajinan/seni: {{jenis_kerajinan}}.`                                                                                       |
| 30  | SK_PEDAGANG_PASAR | Surat Keterangan Pedagang Pasar      | Usaha & Ekonomi | ✓        | 1 hari kerja | 3            | nama_pasar, jenis_dagangan, keperluan                                                       | 2          | `Yang bersangkutan tercatat sebagai pedagang di {{nama_pasar}}.`                                                                                                  |

---

### TANAH & PROPERTI (7 Jenis)

| No  | Kode                    | Nama Surat                            | Kategori         | Wewenang | ETA          | Jumlah Field | Daftar Field                                                                                                                                                                                                     | Jumlah DNA | Contoh Clause DNA                                                                                                                                                                                       |
| --- | ----------------------- | ------------------------------------- | ---------------- | -------- | ------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 31  | SK_TANAH_MILIK          | Surat Keterangan Kepemilikan Tanah    | Tanah & Properti | ✓        | 2 hari kerja | 13           | lokasi_tanah, atas_nama_tanah, nomor_sertifikat, jenis_hak, bukti_kepemilikan, luas_tanah, batas_utara, batas_timur, batas_selatan, batas_barat, batas, keperluan                                                | 3          | `--- DATA TANAH ---`\n`Lokasi     : {{lokasi_tanah}}\nLuas       : {{luas_tanah}}\nAtas Nama  : {{atas_nama_tanah}}\nNo. Sertifikat: {{nomor_sertifikat}}` (adopsi OpenSID — 4 batas terpisah)          |
| 32  | SK_TANAH_TIDAK_SENGKETA | Surat Keterangan Tidak Sengketa Tanah | Tanah & Properti | ✓        | 2 hari kerja | 5            | lokasi_tanah, keperluan, luas_tanah, batas, keterangan                                                                                                                                                           | 3          | `Tanah yang dikuasai:\nLokasi     : {{lokasi_tanah}}\nLuas       : {{luas_tanah}}\nBatas-batas: {{batas}}`                                                                                              |
| 33  | SK_HIBAH_TANAH          | Surat Keterangan Hibah Tanah          | Tanah & Properti | ✓        | 2 hari kerja | 4            | lokasi_tanah, luas_tanah, penerima_hibah, hubungan                                                                                                                                                               | 3          | `Tanah yang dihibahkan:\nLokasi        : {{lokasi_tanah}}\nLuas          : {{luas_tanah}}\nPenerima Hibah: {{penerima_hibah}}`                                                                          |
| 34  | SK_JUAL_BELI_TANAH      | Surat Keterangan Jual Beli Tanah      | Tanah & Properti | ✓        | 2 hari kerja | 11           | lokasi_tanah, luas_tanah, harga, penjual, nik_penjual, alamat_penjual, pekerjaan_penjual, pembeli, nik_pembeli, tanggal_lahir_pembeli, tempat_lahir_pembeli, pekerjaan_pembeli, alamat_pembeli, nomor_sertifikat | 3          | `Transaksi jual beli tanah:\nLokasi  : {{lokasi_tanah}}\nLuas    : {{luas_tanah}}\nPenjual : {{penjual}} ({{nik_penjual}})\nPembeli : {{pembeli}} ({{nik_pembeli}})` (adopsi OpenSID — data PPAT-ready) |
| 35  | SK_RUMAH_MILIK          | Surat Keterangan Kepemilikan Rumah    | Tanah & Properti | ✓        | 1 hari kerja | 4            | lokasi_rumah, keperluan, luas_bangunan, tahun_bangun                                                                                                                                                             | 2          | `Yang bersangkutan memiliki bangunan rumah:\nLokasi      : {{lokasi_rumah}}\nLuas        : {{luas_bangunan}} m2\nTahun Dibangun: {{tahun_bangun}}`                                                      |
| 36  | SK_BELUM_PUNYA_RUMAH    | Surat Keterangan Belum Memiliki Rumah | Tanah & Properti | ✓        | 1 hari kerja | 1            | keperluan                                                                                                                                                                                                        | 2          | `Yang bersangkutan saat ini belum memiliki rumah/kediaman sendiri.`                                                                                                                                     |
| 37  | SK_TANAH_WAKAF          | Surat Keterangan Tanah Wakaf          | Tanah & Properti | ✓        | 2 hari kerja | 4            | lokasi_tanah, luas_tanah, nadzir_wakaf, tujuan_wakaf                                                                                                                                                             | 2          | `Tanah wakaf:\nLokasi    : {{lokasi_tanah}}\nLuas      : {{luas_tanah}}\nNadzir    : {{nadzir_wakaf}}\nTujuan    : {{tujuan_wakaf}}`                                                                    |

---

### PENDIDIKAN (4 Jenis)

| No  | Kode             | Nama Surat                              | Kategori   | Wewenang | ETA          | Jumlah Field | Daftar Field                                                                     | Jumlah DNA | Contoh Clause DNA                                                                                                                                  |
| --- | ---------------- | --------------------------------------- | ---------- | -------- | ------------ | ------------ | -------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 38  | SK_BEASISWA      | Surat Keterangan untuk Beasiswa         | Pendidikan | ✓        | 1 hari kerja | 3            | nama_institusi, program_beasiswa, keperluan                                      | 2          | `Yang bersangkutan saat ini menempuh pendidikan:\nNama Institusi   : {{nama_institusi}}\nProgram Beasiswa : {{program_beasiswa}}`                  |
| 39  | SK_PENELITIAN    | Surat Keterangan Penelitian / KKN / PKL | Pendidikan | ✓        | 2 hari kerja | 5            | nama_institusi, judul_kegiatan, lokasi_penelitian, lama_kegiatan, jumlah_peserta | 2          | `Nama Kegiatan : {{judul_kegiatan}}\nInstitusi     : {{nama_institusi}}\nLokasi        : {{lokasi_penelitian}}\nLama          : {{lama_kegiatan}}` |
| 40  | SK_PUTUS_SEKOLAH | Surat Keterangan Putus Sekolah          | Pendidikan | ✓        | 1 hari kerja | 2            | alasan, keperluan                                                                | 2          | `Yang bersangkutan pernah duduk di bangku pendidikan namun kemudian putus sekolah.`                                                                |
| 41  | SK_AKTIF_SEKOLAH | Surat Aktif Sekolah (PIP/KPS)           | Pendidikan | ✓        | 1 hari kerja | 4            | nama_sekolah, keperluan, jenjang, keperluan                                      | 2          | `Nama Sekolah: {{nama_sekolah}}\nJenjang     : {{jenjang}}\nYang bersangkutan saat ini masih aktif bersekolah.`                                    |

---

### KESEHATAN & KHUSUS (4 Jenis)

| No  | Kode           | Nama Surat                              | Kategori           | Wewenang | ETA          | Jumlah Field | Daftar Field                 | Jumlah DNA | Contoh Clause DNA                                                                               |
| --- | -------------- | --------------------------------------- | ------------------ | -------- | ------------ | ------------ | ---------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| 42  | SK_DISABILITAS | Surat Keterangan Penyandang Disabilitas | Kesehatan & Khusus | ✓        | 1 hari kerja | 2            | jenis_disabilitas, keperluan | 2          | `Yang bersangkutan termasuk kategori penyandang disabilitas: {{jenis_disabilitas}}.`            |
| 43  | SK_LANSIA      | Surat Keterangan Lansia                 | Kesehatan & Khusus | ✓        | 1 hari kerja | 2            | umur, keperluan              | 2          | `Yang bersangkutan saat ini berusia {{umur}} tahun dan termasuk kategori lanjut usia (Lansia).` |
| 44  | SK_YATIM_PIATU | Surat Keterangan Anak Yatim / Piatu     | Kesehatan & Khusus | ✓        | 1 hari kerja | 2            | status_yatim, keperluan      | 2          | `Yang bersangkutan termasuk dalam kategori: {{status_yatim}}.`                                  |
| 45  | SK_HAMIL       | Surat Keterangan Hamil / Ibu Melahirkan | Kesehatan & Khusus | ✓        | 1 hari kerja | 2            | usia_kandungan, keperluan    | 2          | `Usia Kandungan : {{usia_kandungan}} bulan`                                                     |

---

### PERTANIAN & LINGKUNGAN (5 Jenis)

| No  | Kode                | Nama Surat                               | Kategori               | Wewenang | ETA          | Jumlah Field | Daftar Field                                                                | Jumlah DNA | Contoh Clause DNA                                                                                                                                                                      |
| --- | ------------------- | ---------------------------------------- | ---------------------- | -------- | ------------ | ------------ | --------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 46  | SK_PETANI           | Surat Keterangan Petani                  | Pertanian & Lingkungan | ✓        | 1 hari kerja | 2            | keperluan, keterangan                                                       | 2          | `Yang bersangkutan berprofesi sebagai petani di wilayah Desa {{nama_desa}}.`                                                                                                           |
| 47  | SK_NELAYAN          | Surat Keterangan Nelayan                 | Pertanian & Lingkungan | ✓        | 1 hari kerja | 2            | keperluan, keterangan                                                       | 2          | `Yang bersangkutan berprofesi sebagai nelayan di wilayah pesisir Desa {{nama_desa}}.`                                                                                                  |
| 48  | SK_BENCANA          | Surat Keterangan Dampak Bencana          | Pertanian & Lingkungan | ✓        | 1 hari kerja | 3            | jenis_bencana, tanggal_kejadian, kerugian                                   | 2          | `Yang bersangkutan terdampak bencana:\nJenis    : {{jenis_bencana}}\nTanggal  : {{tanggal_kejadian}}\nKerugian: {{kerugian}}`                                                          |
| 49  | SK_PENGGUNAAN_LAHAN | Surat Keterangan Penggunaan Lahan        | Pertanian & Lingkungan | ✓        | 2 hari kerja | 5            | lokasi_lahan, keperluan, luas_lahan, peruntukan_sekarang, peruntukan_usulan | 2          | `Lahan dengan:\nLokasi             : {{lokasi_lahan}}\nLuas              : {{luas_lahan}}\nPeruntukan Sekarang : {{peruntukan_sekarang}}\nPeruntukan Usulan   : {{peruntukan_usulan}}` |
| 50  | SK_KELOMPOK_TANI    | Surat Keterangan Kelompok Tani / Nelayan | Pertanian & Lingkungan | ✓        | 1 hari kerja | 3            | nama_kelompok, jumlah_anggota, keperluan                                    | 3          | `Kelompok Tani: {{nama_kelompok}}\nJumlah Anggota: {{jumlah_anggota}} orang`                                                                                                           |

---

### SURAT DINAS (3 Jenis)

| No  | Kode              | Nama Surat                       | Kategori    | Wewenang | ETA          | Jumlah Field | Daftar Field                              | Jumlah DNA | Contoh Clause DNA                                                                      |
| --- | ----------------- | -------------------------------- | ----------- | -------- | ------------ | ------------ | ----------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| 51  | SP-INSTANSI       | Surat Pengantar ke Instansi Lain | Surat Dinas | ✓        | 1 hari kerja | 3            | nama_instansi, alamat_instansi, keperluan | 4          | `Untuk keperluan kepada:\nInstansi : {{nama_instansi}}\nAlamat  : {{alamat_instansi}}` |
| 52  | SURAT_BANTUAN     | Surat Permohonan Bantuan         | Surat Dinas | ✓        | 1 hari kerja | 2            | jenis_bantuan, alasan                     | 3          | `Jenis bantuan: {{jenis_bantuan}}\nAlasan pengajuan: {{alasan}}.`                      |
| 53  | SURAT_REKOMENDASI | Surat Rekomendasi                | Surat Dinas | ✓        | 1 hari kerja | 2            | instansi_tujuan, isi_rekomendasi          | 3          | `Isi Rekomendasi:\n{{isi_rekomendasi}}`                                                |

---

### SURAT UMUM & LAINNYA (16 Jenis — non-wewenang yang dikonversi)

| No  | Kode             | Nama Surat                                     | Kategori             | Wewenang | ETA          | Jumlah Field | Daftar Field                                                                                                       | Jumlah DNA | Contoh Clause DNA                                                                                                                                             |
| --- | ---------------- | ---------------------------------------------- | -------------------- | -------- | ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 54  | SPTJM            | Surat Pernyataan Tanggung Jawab Mutlak (SPTJM) | Surat Umum & Lainnya | ✓        | 1 hari kerja | 2            | judul_pernyataan, isi_pernyataan                                                                                   | 5          | `Menyatakan dan bertanggung jawab penuh atas:\nJudul Pernyataan: {{judul_pernyataan}}`                                                                        |
| 55  | SURAT_KUASA      | Surat Kuasa                                    | Surat Umum & Lainnya | ✓        | 1 hari kerja | 3            | penerima_kuasa, nik_penerima_kuasa, wewenang                                                                       | 2          | `Wewenang yang diberikan:\n{{wewenang}}`                                                                                                                      |
| 56  | SK_WNI_KETURUNAN | Surat Keterangan WNI Keturunan                 | Surat Umum & Lainnya | ✓        | 1 hari kerja | 1            | keperluan                                                                                                          | 2          | `Yang bersangkutan adalah warga negara Indonesia keturunan.`                                                                                                  |
| 57  | SK_HAJI          | Surat Keterangan Naik Haji / Umrah             | Surat Umum & Lainnya | ✓        | 1 hari kerja | 2            | tahun, keperluan                                                                                                   | 2          | `Yang bersangkutan akan menunaikan ibadah Haji/Umrah.`                                                                                                        |
| 58  | SK_PASPOR        | Surat Keterangan untuk Paspor                  | Surat Umum & Lainnya | ✓        | 1 hari kerja | 1            | keperluan                                                                                                          | 2          | `Bahwa yang bersangkutan akan mengajukan pembuatan paspor dan membutuhkan surat pengantar dari pemerintah desa.`                                              |
| 59  | SK_TKI           | Surat Keterangan Calon TKI / PMI               | Surat Umum & Lainnya | ✓        | 2 hari kerja | 3            | negara_tujuan, jenis_pekerjaan, nama_pt                                                                            | 3          | `Nama           : {{nama}}\nNIK            : {{nik}}\nNegara Tujuan : {{negara_tujuan}}\nJenis Pekerjaan: {{jenis_pekerjaan}}\nPerusahaan/PJTKI: {{nama_pt}}` |
| 60  | SP_PTSL          | Surat Pengantar PTSL                           | Surat Umum & Lainnya | ✓        | 1 hari kerja | 2            | lokasi_tanah, luas_tanah                                                                                           | 2          | `Untuk pengajuan:\nLokasi Tanah : {{lokasi_tanah}}\nLuas Tanah   : {{luas_tanah}}`                                                                            |
| 61  | SK_ORGANISASI    | Surat Keterangan Keaktifan Organisasi          | Surat Umum & Lainnya | ✓        | 1 hari kerja | 1            | keperluan                                                                                                          | 2          | `Yang bersangkutan aktif dalam organisasi kemasyarakatan di Desa {{nama_desa}}.`                                                                              |
| 62  | SK_TIDAK_DI_DESA | Surat Keterangan Tidak Berada di Desa          | Surat Umum & Lainnya | ✓        | 1 hari kerja | 3            | alasan, keperluan, lokasi_sekarang                                                                                 | 2          | `Yang bersangkutan saat ini tidak berada di Desa {{nama_desa}}.`                                                                                              |
| 63  | SK_HARGA_TANAH   | Surat Keterangan Harga Tanah (OpenSID)         | Surat Umum & Lainnya | ✓        | 1 hari kerja | 8            | lokasi_tanah, luas_tanah, luas_bangunan, atas_nama_tanah, nomor_sertifikat, harga_tanah, harga_bangunan, keperluan | 9          | `--- DATA TANAH ---                                                                                                                                           |

Lokasi : {{lokasi_tanah}}
Harga Tanah : Rp {{harga_tanah}}/m²
Harga Bangunan: Rp {{harga_bangunan}}/m²`(BARU dari OpenSID) |
| 64  | SK_LAHIR_MATI    | Surat Keterangan Lahir/Mati (OpenSID)         | Surat Umum & Lainnya | ✓        | 1 hari kerja | 9            | nama_ibu, lama_kandungan, tanggal_kelahiran, hari, jam, tempat_mati, jenis_kelamin_janin, keperluan | 5          |`--- DATA IBU ---
Kehamilan : {{lama_kandungan}} bulan
--- DATA KELAHIRAN ---
Tanggal : {{tanggal_kelahiran}} (BARU dari OpenSID) `|
| 65  | SK_IZIN_ORANG_TUA | Surat Izin Orang Tua (OpenSID)               | Surat Umum & Lainnya | ✓        | 1 hari kerja | 9            | nama_pemberi_izin, nama_anak, alamat_anak, pekerjaan_anak, status_pekerjaan, negara_tujuan, masa_kontrak, keperluan | 5          |`Nama Pemberi Izin : {{nama_pemberi_izin}}
--- DATA ANAK ---
Nama : {{nama_anak}}
Tujuan : {{negara_tujuan}}` (BARU dari OpenSID) |

---

### SURAT PENGANTAR — PENGGANTI NON-WEWENANG (11 Jenis)

> Beberapa surat (`isNew: true`) sebelumnya bukan wewenang desa (harus diterbitkan instansi lain), tetapi dikonversi menjadi **surat pengantar dari Kepala Desa** sehingga warga cukup datang ke desa untuk mendapatkannya. Ini adalah inovasi utama sistem e-surat Seruni Mumbul.

| No                | Kode                         | Nama Surat                                 | Kategori             | Wewenang | ETA          | Jumlah Field | Daftar Field                                                                                                                                                                                                                                                                                                                                                                                                                         | Jumlah DNA | Contoh Clause DNA                                                                                                                                               |
| ----------------- | ---------------------------- | ------------------------------------------ | -------------------- | -------- | ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 66                | SP-AKTA-KELAHIRAN            | Surat Pengantar Penerbitan Akta Kelahiran  | Surat Umum & Lainnya | →        | 1 hari kerja | 26           | nama_bayi, tanggal_lahir, tempat_lahir, jenis_kelamin_bayi, nama_ibu, nama_ayah, nik_ayah, tempat_lahir_ayah, tanggal_lahir_ayah, kewarganegaraan_ayah, pekerjaan_ayah, alamat_ayah, nik_ibu, tempat_lahir_ibu, tanggal_lahir_ibu, kewarganegaraan_ibu, pekerjaan_ibu, alamat_ibu, nama_pelapor, nik_pelapor, hubungan_pelapor, alamat_pelapor, nama_saksi_1, nik_saksi_1, alamat_saksi_1, nama_saksi_2, nik_saksi_2, alamat_saksi_2 | 10         | `--- DATA AYAH ---\nNama Ayah : {{nama_ayah}}\nNIK Ayah : {{nik_ayah}}\nTTL Ayah : {{tempat_lahir_ayah}}                                                        | {{tanggal_lahir_ayah}}` (adopsi OpenSID full — 26 fields) |
| 67                | SP-AKTA-KEMATIAN             | Surat Pengantar Penerbitan Akta Kematian   | Surat Umum & Lainnya | →        | 1 hari kerja | 10           | nama_jenazah, tanggal_meninggal, tempat_meninggal, penyebab, nama_pelapor, nik_pelapor, hubungan_pelapor, alamat_pelapor, nama_saksi, nik_saksi, alamat_saksi                                                                                                                                                                                                                                                                        | 7          | `--- DATA PELAPOR ---\nNama Pelapor : {{nama_pelapor}}\nNIK Pelapor  : {{nik_pelapor}}\n--- DATA SAKSI ---\nSaksi        : {{nama_saksi}}` (adopsi OpenSID)     |
| 68                | SP-AKTA-LAHIR                | Surat Pengantar Penerbitan Akta Lahir      | Surat Umum & Lainnya | →        | 1 hari kerja | 1            | keperluan                                                                                                                                                                                                                                                                                                                                                                                                                            | 1          | `Surat pengantar ini dibuat sebagai salah satu syarat pengurusan Akta Lahir bagi warga yang belum memiliki.`                                                    |
| 69                | SP-IZIN-REKLAME              | Surat Pengantar Izin Reklame               | Surat Umum & Lainnya | →        | 1 hari kerja | 1            | keperluan                                                                                                                                                                                                                                                                                                                                                                                                                            | 2          | `Surat pengantar ini dibuat sebagai salah satu syarat pengajuan izin reklame ke Dinas Perizinan.`                                                               |
| 70                | SP-IMB                       | Surat Pengantar Izin Bangunan (IMB/PBG)    | Surat Umum & Lainnya | →        | 1 hari kerja | 3            | lokasi_bangunan, luas_bangunan, fungsi_bangunan                                                                                                                                                                                                                                                                                                                                                                                      | 2          | `Nama    : {{nama}}\nNIK     : {{nik}}\nLokasi   : {{lokasi_bangunan}}\nLuas     : {{luas_bangunan}} m2\nFungsi   : {{fungsi_bangunan}}`                        |
| 71                | SP-SANGGAR                   | Surat Pengantar Pendirian Sanggar / Kursus | Surat Umum & Lainnya | →        | 1 hari kerja | 1            | keperluan                                                                                                                                                                                                                                                                                                                                                                                                                            | 2          | `Surat pengantar ini dibuat sebagai salah satu syarat pengajuan izin pendirian sanggar/kursus.`                                                                 |
| 72                | SP-BEBAS-NARKOBA             | Surat Pengantar Pemeriksaan Bebas Narcaba  | Surat Umum & Lainnya | →        | 1 hari kerja | 1            | keperluan                                                                                                                                                                                                                                                                                                                                                                                                                            | 2          | `Surat pengantar ini dibuat sebagai salah satu syarat pemeriksaan bebas narkoba diinstansi kesehatan.`                                                          |
| 73                | SP-PENEBANGAN-POHON          | Surat Pengantar Izin Penebangan Pohon      | Surat Umum & Lainnya | →        | 1 hari kerja | 3            | jumlah_pohon, lokasi, alasan                                                                                                                                                                                                                                                                                                                                                                                                         | 2          | `Nama   : {{nama}}\nNIK    : {{nik}}\nJumlah Pohon : {{jumlah_pohon}} pohon\nLokasi Pohon: {{lokasi}}\nAlasan       : {{alasan}}`                               |
| 74                | SP-PENGGALANGAN-DANA         | Surat Pengantar Izin Penggalangan Dana     | Surat Umum & Lainnya | →        | 1 hari kerja | 3            | jenis_kegiatan, target_dana, keperluan                                                                                                                                                                                                                                                                                                                                                                                               | 2          | `Nama Kegiatan : {{nama_acara}}\nTarget Dana  : Rp {{target_dana}}`                                                                                             |
| 75                | SP-PENDAFTARAN-TANAH         | Surat Pengantar Pendaftaran Tanah          | Surat Umum & Lainnya | →        | 1 hari kerja | 3            | lokasi_tanah, luas_tanah, batas                                                                                                                                                                                                                                                                                                                                                                                                      | 2          | `Nama   : {{nama}}\nNIK    : {{nik}}\nLokasi : {{lokasi_tanah}}\nLuas   : {{luas_tanah}}`                                                                       |
| 76                | SP-VERIF-KELAHIRAN           | Surat Pengantar Verifikasi Kelahiran       | Surat Umum & Lainnya | →        | 1 hari kerja | 5            | nama_bayi, tanggal_lahir, tempat_lahir, nama_ibu, nama_ayah                                                                                                                                                                                                                                                                                                                                                                          | 2          | `Nama Bayi     : {{nama_bayi}}\nTgl Lahir    : {{tanggal_lahir}}\nTempat Lahir : {{tempat_lahir}}\nNama Ibu      : {{nama_ibu}}\nNama Ayah     : {{nama_ayah}}` |
| SK_HARGA_TANAH    | Surat Keterangan Harga Tanah | 466                                        |
| SK_LAHIR_MATI     | Surat Keterangan Lahir/Mati  | 475.6                                      |
| SK_IZIN_ORANG_TUA | Surat Izin Orang Tua         | 477.3                                      |

---

## Referensi Cepat: Kode Klasifikasi

Berikut kode klasifikasi按照 Peraturan Menteri Dalam Negeri untuk setiap jenis surat:

| Kode                    | Nama Surat                                     | Kode Klasifikasi Kemendagri |
| ----------------------- | ---------------------------------------------- | --------------------------- |
| SKD                     | Surat Keterangan Domisili                      | 474                         |
| PINDAH_DOMISILI         | Surat Keterangan Pindah Domisili               | 475                         |
| PENDATANG               | Surat Keterangan Pendatang / Numpang KK        | 475.1                       |
| KK_BARU                 | Surat Keterangan Kepala Keluarga               | 474.5                       |
| BEDA_NAMA               | Surat Keterangan Beda Nama                     | 474.3                       |
| ALAMAT_SEMENTARA        | Surat Keterangan Alamat Sementara              | 475.2                       |
| SP-KTP                  | Surat Pengantar Pembuatan KTP                  | 465                         |
| SP-KK                   | Surat Pengantar Pembuatan KK                   | 465.2                       |
| SKTM                    | Surat Keterangan Tidak Mampu (SKTM)            | 474.6                       |
| SK_PENGHASILAN          | Surat Keterangan Penghasilan                   | 300                         |
| SK_KEHILANGAN           | Surat Keterangan Kehilangan                    | 300.1                       |
| SP-SKCK                 | Surat Pengantar SKCK                           | 465.4                       |
| SK_KELAKUAN_BAIK        | Surat Keterangan Kelakuan Baik                 | 475.3                       |
| SK_TIDAK_PUNYA_KERJA    | Surat Keterangan Tidak Punya Pekerjaan         | 475.4                       |
| VERIF-DTKS              | Surat Pengantar Verifikasi DTKS                | 474.7                       |
| SK_BELUM_MENIKAH        | Surat Keterangan Belum Menikah                 | 451                         |
| SK-NIKAH                | Surat Keterangan Nikah (N-1 s/d N-6)           | 477                         |
| SK_NIKAH_NONMUSLIM      | Surat Keterangan Nikah Non-Muslim              | 477.1                       |
| SK_JANDA                | Surat Keterangan Status Janda                  | 477.2                       |
| SK_DUDA                 | Surat Keterangan Status Duda                   | 474.8                       |
| SK_HUBUNGAN_KELUARGA    | Surat Keterangan Hubungan Keluarga             | 474.9                       |
| SK_AHLI_WARIS           | Surat Keterangan Ahli Waris                    | 451.1                       |
| DISPENSA_NIKAH          | Surat Dispensasi Nikah (Pengantar PA)          | 451.2                       |
| WALI_NIKAH              | Surat Keterangan Wali Nikah Hakim              | 510                         |
| SKU                     | Surat Keterangan Usaha (SKU)                   | 140                         |
| IZIN_KERAMAIAN          | Surat Keterangan Izin Keramaian                | 524                         |
| SK_PETERNAK             | Surat Keterangan Peternak                      | 530                         |
| SK_PENGRAJIN            | Surat Keterangan Pengrajin / Seniman           | 510.2                       |
| SK_PEDAGANG_PASAR       | Surat Keterangan Pedagang Pasar                | 30.1                        |
| SK_TANAH_MILIK          | Surat Keterangan Kepemilikan Tanah             | 30.2                        |
| SK_TANAH_TIDAK_SENGKETA | Surat Keterangan Tidak Sengketa Tanah          | 30.3                        |
| SK_HIBAH_TANAH          | Surat Keterangan Hibah Tanah                   | 30.4                        |
| SK_JUAL_BELI_TANAH      | Surat Keterangan Jual Beli Tanah               | 650                         |
| SK_RUMAH_MILIK          | Surat Keterangan Kepemilikan Rumah             | 650.1                       |
| SK_BELUM_PUNYA_RUMAH    | Surat Keterangan Belum Memiliki Rumah          | 451.3                       |
| SK_TANAH_WAKAF          | Surat Keterangan Tanah Wakaf                   | 420                         |
| SK_BEASISWA             | Surat Keterangan untuk Beasiswa                | 420.2                       |
| SK_PENELITIAN           | Surat Keterangan Penelitian / KKN / PKL        | 420.3                       |
| SK_PUTUS_SEKOLAH        | Surat Keterangan Putus Sekolah                 | 420.5                       |
| SK_AKTIF_SEKOLAH        | Surat Aktif Sekolah (PIP/KPS)                  | 461                         |
| SK_DISABILITAS          | Surat Keterangan Penyandang Disabilitas        | 463.1                       |
| SK_LANSIA               | Surat Keterangan Lansia                        | 463.2                       |
| SK_YATIM_PIATU          | Surat Keterangan Anak Yatim / Piatu            | 440.1                       |
| SK_HAMIL                | Surat Keterangan Hamil / Ibu Melahirkan        | 520                         |
| SK_PETANI               | Surat Keterangan Petani                        | 523                         |
| SK_NELAYAN              | Surat Keterangan Nelayan                       | 360                         |
| SK_BENCANA              | Surat Keterangan Dampak Bencana                | 520.2                       |
| SK_PENGGUNAAN_LAHAN     | Surat Keterangan Penggunaan Lahan              | 520.3                       |
| SK_KELOMPOK_TANI        | Surat Keterangan Kelompok Tani / Nelayan       | 140.1                       |
| SP-INSTANSI             | Surat Pengantar ke Instansi Lain               | 140.2                       |
| SURAT_BANTUAN           | Surat Permohonan Bantuan                       | 140.3                       |
| SURAT_REKOMENDASI       | Surat Rekomendasi                              | 474.10                      |
| SPTJM                   | Surat Pernyataan Tanggung Jawab Mutlak (SPTJM) | 474.11                      |
| SURAT_KUASA             | Surat Kuasa                                    | 474.12                      |
| SK_WNI_KETURUNAN        | Surat Keterangan WNI Keturunan                 | 180                         |
| SK_HAJI                 | Surat Keterangan Naik Haji / Umrah             | 471                         |
| SK_PASPOR               | Surat Keterangan untuk Paspor                  | 456                         |
| SK_TKI                  | Surat Keterangan Calon TKI / PMI               | 471.1                       |
| SP_PTSL                 | Surat Pengantar PTSL                           | 471.2                       |
| SK_ORGANISASI           | Surat Keterangan Keaktifan Organisasi          | 30.9                        |
| SK_TIDAK_DI_DESA        | Surat Keterangan Tidak Berada di Desa          | 220                         |
| SP-AKTA-KELAHIRAN       | Surat Pengantar Penerbitan Akta Kelahiran      | 475.5                       |
| SP-AKTA-KEMATIAN        | Surat Pengantar Penerbitan Akta Kematian       | 474.20                      |
| SP-AKTA-LAHIR           | Surat Pengantar Penerbitan Akta Lahir          | 474.21                      |
| SP-IZIN-REKLAME         | Surat Pengantar Izin Reklame                   | 474.22                      |
| SP-IMB                  | Surat Pengantar Izin Bangunan (IMB/PBG)        | 510.4                       |
| SP-SANGGAR              | Surat Pengantar Pendirian Sanggar / Kursus     | 510.5                       |
| SP-BEBAS-NARKOBA        | Surat Pengantar Pemeriksaan Bebas Narcaba      | 510.6                       |
| SP-PENEBANGAN-POHON     | Surat Pengantar Izin Penebangan Pohon          | 440.2                       |
| SP-PENGGALANGAN-DANA    | Surat Pengantar Izin Penggalangan Dana         | 510.7                       |
| SP-PENDAFTARAN-TANAH    | Surat Pengantar Pendaftaran Tanah              | 466.1                       |
| SP-VERIF-KELAHIRAN      | Surat Pengantar Verifikasi Kelahiran           | 30.10                       |

---

## Surat Paling Penting (Prioritas Tinggi)

Dari 72 jenis surat, berikut surat-surat yang paling sering diajukan oleh warga:

| Prioritas | Kode               | Nama Surat                         | Alasan                                                       |
| --------- | ------------------ | ---------------------------------- | ------------------------------------------------------------ |
| ⭐⭐⭐    | SKTM               | Surat Keterangan Tidak Mampu       | Akses BPJS PBI, beasiswa KIP-Kuliah, bantuan sosial PKH/BPNT |
| ⭐⭐⭐    | SKU                | Surat Keterangan Usaha             | Syarat pengurusan NIB (Nomor Induk Berusaha)                 |
| ⭐⭐⭐    | SKD                | Surat Keterangan Domisili          | Paling fundamental — keperluan bank, administrasi, dll       |
| ⭐⭐      | SP-SKCK            | Surat Pengantar SKCK               | Paling sering diminta untuk lamaran kerja                    |
| ⭐⭐      | SK_BELUM_MENIKAH   | Surat Keterangan Belum Menikah     | Syarat utama akta nikah di KUA                               |
| ⭐⭐      | SP-KTP             | Surat Pengantar Pembuatan KTP      | Wewenang penuh, paling banyak proses                         |
| ⭐⭐      | SP-AKTA-KELAHIRAN  | Surat Pengantar Akta Kelahiran     | Pengganti wewenang asli Dukcapil                             |
| ⭐⭐      | SP-AKTA-KEMATIAN   | Surat Pengantar Akta Kematian      | Pengganti wewenang asli Dukcapil                             |
| ⭐⭐      | SK_PENGHASILAN     | Surat Keterangan Penghasilan       | Syarat KUR (Kredit Usaha Rakyat)                             |
| ⭐⭐      | SK_TANAH_MILIK     | Surat Keterangan Kepemilikan Tanah | Sangat umum dibutuhkan untuk transaksi tanah                 |
| ⭐⭐      | SK_JUAL_BELI_TANAH | Surat Keterangan Jual Beli Tanah   | Tahap awal AJB di PPAT                                       |
| ⭐⭐      | SK_NIKAH           | Surat Keterangan Nikah             | SATUKAN 6 formulir (N-1 s/d N-6)                             |
| ⭐        | SK_PETANI          | Surat Keterangan Petani            | Kartu Tani                                                   |
| ⭐        | SK_NELAYAN         | Surat Keterangan Nelayan           | Kartu Nelayan                                                |
| ⭐        | SK_PETERNAK        | Surat Keterangan Peternak          | Kartu Ternak                                                 |
| ⭐        | VERIF-DTKS         | Surat Pengantar Verifikasi DTKS    | Verifikasi Data Terpadu Kesejahteraan Sosial                 |
| ⭐        | SK_BEASISWA        | Surat Keterangan untuk Beasiswa    | Akses beasiswa                                               |

---

## Catatan Teknis untuk Developer

### Source Files

- **Master data:** `src/data/surat-master.ts` — `SURAT_MASTER` object (77 entries)
- **Letter engine:** `src/lib/letter-engine.ts` — `DNA_CLAUSES_PRESETS` (77 entries)
- **Template store:** `src/lib/template-store.ts` — template rendering

### Field Autofill Mapping

Beberapa field memiliki `autofill` yang otomatis terisi dari data warga:

| Field Key            | Autofill Source    | Penjelasan                             |
| -------------------- | ------------------ | -------------------------------------- |
| `penghasilan`        | `pendapatan_bulan` | Otomatis terisi dari data warga        |
| `alamat_usaha`       | `alamat`           | Default alamat usaha = alamat domisili |
| `sumber_penghasilan` | `pekerjaan`        | Default = pekerjaan warga              |

### Workflow Status E-Surat

Semua surat menggunakan 5-status pipeline:

```
Menunggu Verifikasi → Diverifikasi → Menunggu Approval → Disetujui | Ditolak
```

Izin akses per action (dari `src/lib/roles.ts`):

- `surat.verify` — Verifikator, Operator, Super Admin
- `surat.approve` — Kepala Desa, Super Admin
- `surat.create` — Semua role yang login
- `surat.delete` — Super Admin, Operator

### Placeholder DNA vs Form Field

Placeholder DNA di `{{placeholder}}` dalam clauses BISA berbeda dengan key field formulir. Contoh:

| DNA Placeholder       | Form Field              | Asal                   |
| --------------------- | ----------------------- | ---------------------- |
| `{{nama}}`            | (tidak ada — autofill)  | Data warga             |
| `{{alamat}}`          | (tidak ada — autofill)  | Data warga (fmtAlamat) |
| `{{keperluan}}`       | field `keperluan`       | Input pemohon          |
| `{{nama_usaha}}`      | field `nama_usaha`      | Input pemohon          |
| `{{jumlah_pengikut}}` | field `jumlah_pengikut` | Input pemohon          |

### COMMON_FIELDS Reuse

Tiga preset `COMMON_FIELDS_*` digunakan ulang di beberapa surat untuk menghindari duplikasi:

| Preset                                                             | Digunakan oleh                                                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `COMMON_FIELDS_SHORT` (keperluan)                                  | SP-SKCK, SK_TIDAK_PUNYA_KERJA, SK_WNI_KETURUNAN, SK_PASPOR, SK_ORGANISASI, SP-IZIN-REKLAME, SP-SANGGAR, SP-BEBAS-NARKOBA |
| `COMMON_FIELDS_MEDIUM` (keperluan + keterangan)                    | SK_PETERNAK, SK_NELAYAN                                                                                                  |
| `COMMON_FIELDS_LONG` (keperluan + keterangan + no_surat_pengantar) | Tidak ada surat yang secara eksplisit menggunakan preset ini                                                             |

---

_Dokumen ini dibuat secara otomatis dari data source `surat-master.ts` dan `letter-engine.ts`._
_Jangan edit manual — edit source files lalu regenerate dokumen ini._
