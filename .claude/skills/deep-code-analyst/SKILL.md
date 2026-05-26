---
name: deep-code-analyst
description: >
  Lakukan analisa mendalam (deep scan) terhadap codebase web — mulai dari deteksi tech stack,
  pemahaman konteks & tujuan project, penemuan seluruh masalah (frontend, backend, database,
  security, performance, deployment, git, requirement), pembuatan laporan komprehensif,
  pemberian solusi terbaik sesuai tech stack, hingga perbaikan end-to-end dengan loop
  verifikasi (Kerjakan→Periksa→Perbaiki→Periksa→Selesai).

  Gunakan skill ini SETIAP KALI user meminta: audit kode, scan masalah, analisa project,
  cari bug, review codebase, perbaiki semua masalah, deep scan, "cek project saya",
  "ada masalah apa", atau ingin laporan kesehatan project (project health report).
  Juga aktifkan bila user bilang "fix semua", "benerin project", atau "analisa dulu baru perbaiki".
---

# Deep Code Analyst

Skill untuk melakukan analisa mendalam, pelaporan komprehensif, dan perbaikan end-to-end
pada project web development. Bekerja dari konteks → scan → laporan → solusi → perbaikan → verifikasi.

---

## ALUR KERJA UTAMA

### FASE 1 — DISCOVERY & CONTEXT UNDERSTANDING

**Langkah 1: Peta Struktur Project**

```bash
# Lihat struktur direktori (2 level)
find . -maxdepth 2 -not -path '*/node_modules/*' -not -path '*/.git/*' \
       -not -path '*/.next/*' -not -path '*/dist/*' -not -path '*/build/*' \
       -not -path '*/__pycache__/*' | sort

# Lihat file konfigurasi kunci
ls -la | head -40
```

**Langkah 2: Deteksi Tech Stack**
Identifikasi dari file yang ada:

- `package.json` → Node/JS ecosystem (React, Vue, Next.js, Express, dll)
- `composer.json` → PHP/Laravel/Symfony
- `requirements.txt` / `pyproject.toml` → Python/Django/FastAPI/Flask
- `Gemfile` → Ruby on Rails
- `go.mod` → Golang
- `pom.xml` / `build.gradle` → Java/Spring
- `*.env` / `.env.example` → Environment config
- `docker-compose.yml` / `Dockerfile` → Containerization
- `nginx.conf` / `apache.conf` → Web server
- Database config files → MySQL, PostgreSQL, MongoDB, SQLite, Redis

```bash
# Baca file manifest utama
cat package.json 2>/dev/null || cat composer.json 2>/dev/null || \
cat requirements.txt 2>/dev/null || cat pyproject.toml 2>/dev/null

# Cek .env atau .env.example (JANGAN tampilkan nilai sensitif)
cat .env.example 2>/dev/null || ls .env* 2>/dev/null
```

**Langkah 3: Pahami Tujuan Project**

- Baca README.md / docs/ jika ada
- Identifikasi tipe aplikasi: e-commerce, CMS, SaaS, API-only, dashboard, portal, dll
- Catat skala project: file count, baris kode, jumlah dependencies
- Identifikasi entrypoint utama (index.js, main.py, app.php, dll)

---

### FASE 2 — DEEP SCAN MASALAH

Lakukan scan per kategori. Untuk setiap masalah yang ditemukan, catat:

- **Lokasi**: file + baris (jika relevan)
- **Tingkat Keparahan**: 🔴 KRITIS | 🟠 TINGGI | 🟡 SEDANG | 🟢 RENDAH
- **Dampak**: apa yang bisa terjadi jika dibiarkan

Referensi katalog lengkap masalah: lihat `references/problem-catalog.md`

#### 2A. Frontend Scan

```bash
# Cek responsive design issues
grep -rn "px\|width:[[:space:]]*[0-9]*px\|height:[[:space:]]*[0-9]*px" \
  --include="*.css" --include="*.scss" --include="*.less" . 2>/dev/null | head -30

# Cek CSS conflicts / specificity wars
grep -rn "!important" --include="*.css" --include="*.scss" . 2>/dev/null | wc -l

# Cek inline styles berlebihan (React)
grep -rn "style={{" --include="*.jsx" --include="*.tsx" . 2>/dev/null | wc -l

# Cek state management (React)
grep -rn "useState\|useEffect\|useContext\|Redux\|Zustand\|Pinia\|Vuex" \
  --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" . 2>/dev/null | head -20

# Cek props drilling patterns
grep -rn "props\." --include="*.jsx" --include="*.tsx" . 2>/dev/null | wc -l
```

#### 2B. Backend Scan

```bash
# Cek error handling
grep -rn "catch\|try\|throw\|Exception\|Error" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.php" . 2>/dev/null | head -20

# Cek validasi input
grep -rn "validate\|sanitize\|schema\|joi\|zod\|yup\|validator" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.php" . 2>/dev/null | wc -l

# Cek memory leak patterns
grep -rn "setInterval\|setTimeout\|addEventListener\|EventEmitter" \
  --include="*.js" --include="*.ts" . 2>/dev/null | head -20

# Cek API routes
grep -rn "router\.\|app\.get\|app\.post\|app\.put\|app\.delete\|@app\.route\|Route::" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.php" . 2>/dev/null | head -30
```

#### 2C. Security Scan

```bash
# 🔴 KRITIS: Cek credential exposure
grep -rn "password\s*=\s*['\"][^'\"]\|secret\s*=\s*['\"][^'\"]\|api_key\s*=\s*['\"][^'\"]" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.php" \
  --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -20

# 🔴 KRITIS: Cek SQL injection patterns
grep -rn "query\s*[+]\s*\$\|execute.*\$_\|db->query.*\.\s*\$\|\${.*}.*SELECT\|f\".*SELECT" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.php" . 2>/dev/null | head -20

# 🔴 KRITIS: Cek XSS vectors
grep -rn "innerHTML\s*=\|dangerouslySetInnerHTML\|eval(" \
  --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" . 2>/dev/null | head -20

# 🟠 TINGGI: Cek .env terlindungi
cat .gitignore 2>/dev/null | grep -i "env\|secret\|credential" || echo "PERIKSA: .env mungkin tidak di .gitignore"

# Cek CORS config
grep -rn "cors\|Access-Control-Allow-Origin" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.php" . 2>/dev/null | head -10

# Cek auth/JWT
grep -rn "jwt\|token\|Bearer\|session\|passport\|bcrypt\|argon2" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.php" . 2>/dev/null | head -20
```

#### 2D. Performance Scan

```bash
# Cek image optimization
find . -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif" \
  -not -path '*/node_modules/*' 2>/dev/null | xargs ls -lh 2>/dev/null | sort -k5 -rh | head -10

# Cek bundle size (JS)
find . -name "*.js" -not -path '*/node_modules/*' -not -path '*/dist/*' \
  -not -path '*/.next/*' 2>/dev/null | xargs wc -l 2>/dev/null | sort -rn | head -10

# Cek N+1 query patterns
grep -rn "forEach\|for.*loop\|\.map(" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.php" . 2>/dev/null | \
  grep -i "query\|find\|fetch\|select\|where" | head -15

# Cek caching
grep -rn "cache\|redis\|memcached\|@cache\|memoize" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.php" . 2>/dev/null | wc -l

# Cek lazy loading
grep -rn "lazy\|Suspense\|dynamic.*import\|import('" \
  --include="*.jsx" --include="*.tsx" --include="*.js" . 2>/dev/null | head -10
```

#### 2E. Database Scan

```bash
# Cek file migration/schema
find . -name "*.sql" -o -name "*migration*" -o -name "*schema*" \
  -not -path '*/node_modules/*' 2>/dev/null | head -20

# Cek ORM queries (potensial N+1)
grep -rn "\.find\|\.findAll\|\.query\|\.where\|\.select" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.php" . 2>/dev/null | head -20

# Cek indexing hints di schema
grep -rn "INDEX\|index\|@Index\|createIndex" \
  --include="*.sql" --include="*.js" --include="*.ts" --include="*.py" . 2>/dev/null | head -10

# Cek connection pooling
grep -rn "pool\|Pool\|connection_pool\|createPool" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.php" . 2>/dev/null | head -10
```

#### 2F. Deployment & DevOps Scan

```bash
# Cek Docker config
cat Dockerfile 2>/dev/null
cat docker-compose.yml 2>/dev/null || cat docker-compose.yaml 2>/dev/null

# Cek CI/CD
ls .github/workflows/ 2>/dev/null || ls .gitlab-ci.yml 2>/dev/null || ls Jenkinsfile 2>/dev/null

# Cek environment separation
ls .env* 2>/dev/null
grep -rn "NODE_ENV\|APP_ENV\|ENVIRONMENT\|DEBUG" --include="*.js" --include="*.ts" \
  --include="*.py" --include="*.php" . 2>/dev/null | head -10

# Cek lockfile consistency
ls package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null
```

#### 2G. Code Quality Scan

```bash
# Cek linter config
ls .eslintrc* .prettier* tslint.json pylintrc .flake8 2>/dev/null

# Cek TODO/FIXME/HACK
grep -rn "TODO\|FIXME\|HACK\|XXX\|BUG\|TEMP\|WORKAROUND" \
  --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" \
  --include="*.py" --include="*.php" \
  --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -30

# Cek fungsi terlalu panjang (>50 baris)
awk 'BEGIN{fn=""; lines=0} /function |def |public function/{if(lines>50)print fn": "lines" lines"; fn=FILENAME":"NR; lines=0} {lines++}' \
  $(find . -name "*.js" -o -name "*.py" -o -name "*.php" -not -path '*/node_modules/*' 2>/dev/null) 2>/dev/null | head -10

# Cek duplikasi kode (patterns berulang)
grep -rh "function\|def \|public function" --include="*.js" --include="*.ts" \
  --include="*.py" --include="*.php" --exclude-dir=node_modules . 2>/dev/null | \
  sort | uniq -d | head -10
```

#### 2H. Git & Version Control Scan

```bash
# Cek git log summary
git log --oneline -10 2>/dev/null || echo "Bukan git repo atau tidak ada commit"

# Cek file sensitif yang mungkin ter-commit
git log --all --full-history -- "*.env" "*.pem" "*.key" "*.p12" 2>/dev/null | head -5

# Cek branches
git branch -a 2>/dev/null | head -10

# Cek uncommitted changes
git status 2>/dev/null | head -20
```

---

### FASE 3 — LAPORAN KOMPREHENSIF

Setelah scan selesai, buat laporan dalam format berikut.
Lihat template di `references/report-template.md` untuk format lengkap.

**Struktur laporan:**

```
# 📊 LAPORAN ANALISA PROJECT: [Nama Project]
Tanggal: [tanggal]   Tech Stack: [stack]   Tipe: [tipe aplikasi]

## RINGKASAN EKSEKUTIF
[2-4 kalimat kondisi keseluruhan + skor kesehatan /100]

## STATISTIK MASALAH
| Tingkat    | Jumlah |
|------------|--------|
| 🔴 Kritis  | X      |
| 🟠 Tinggi  | X      |
| 🟡 Sedang  | X      |
| 🟢 Rendah  | X      |
| **Total**  | **X**  |

## DETAIL MASALAH (diurutkan prioritas)
### [Nomor]. [Nama Masalah] — [🔴/🟠/🟡/🟢] [KRITIS/TINGGI/SEDANG/RENDAH]
- **Lokasi**: file/baris atau area
- **Deskripsi**: apa yang salah
- **Dampak**: konsekuensi jika dibiarkan
- **Bukti**: snippet kode atau output scan yang relevan

## REKOMENDASI SOLUSI
[Lihat Fase 4]

## RENCANA PERBAIKAN
[Lihat Fase 5]
```

---

### FASE 4 — SOLUSI & REKOMENDASI

Untuk setiap masalah kritis dan tinggi, berikan:

1. **Solusi yang direkomendasikan** — sesuai tech stack yang terdeteksi
2. **Opsi alternatif** — berikan 2-3 pilihan jika ada tradeoff:
   - Opsi A: [cepat tapi trade-off X]
   - Opsi B: [lebih robust tapi butuh effort lebih]
   - Opsi C: [solusi jangka panjang / refactor]
3. **Estimasi effort**: Kecil (< 1 jam) | Sedang (1-4 jam) | Besar (> 4 jam)
4. **Urutan pengerjaan**: berdasarkan dampak dan dependencies

Rujuk `references/solution-patterns.md` untuk pola solusi per tech stack.

**Tanyakan ke user sebelum eksekusi:**

- Konfirmasi tech stack yang terdeteksi sudah benar
- Tanyakan prioritas: "Apakah ingin saya perbaiki semua sekarang, atau mulai dari yang kritis dulu?"
- Tanyakan constraint: "Ada file/area yang tidak boleh disentuh?"

---

### FASE 5 — PERBAIKAN END-TO-END

Ikuti loop berikut dengan **disiplin ketat**:

```
┌─────────────────────────────────────┐
│  LOOP PERBAIKAN (per masalah/grup)  │
│                                     │
│  1. KERJAKAN → implementasi fix     │
│  2. PERIKSA  → verifikasi hasil     │
│  3. PERBAIKI → jika ada sisa error  │
│  4. PERIKSA  → verifikasi ulang     │
│  5. SELESAI  → tandai ✅ & lanjut   │
└─────────────────────────────────────┘
```

**Protokol verifikasi per kategori fix:**

| Kategori Fix      | Cara Verifikasi                                   |
| ----------------- | ------------------------------------------------- |
| Security patch    | Re-run security scan, test endpoint manual        |
| Performance fix   | Bandingkan sebelum/sesudah (timing, file size)    |
| Bug logic         | Jalankan fungsi yang diperbaiki, cek output       |
| Database query    | Explain query, bandingkan execution time          |
| CSS/Layout        | Cek di multiple viewport (jika ada browser tools) |
| Dependency update | `npm install` / `pip install`, test import        |
| Config fix        | Reload config, cek env variable terbaca           |

**Aturan perbaikan:**

- Jangan pernah tandai ✅ tanpa verifikasi konkret
- Jika fix menimbulkan masalah baru → loop ulang dari langkah 1
- Dokumentasikan setiap perubahan: file apa, baris apa, dari apa ke apa
- Buat backup sebelum perubahan besar: `cp file.js file.js.bak`

**Setelah semua fix selesai:**

- Lakukan final scan ulang (ulangi Fase 2 secara ringkas)
- Bandingkan skor kesehatan sebelum vs sesudah
- Buat ringkasan perubahan yang dilakukan
- Sarankan langkah selanjutnya (testing, deployment, monitoring)

---

## REFERENSI

- `references/problem-catalog.md` — Katalog lengkap semua tipe masalah + indikatornya
- `references/solution-patterns.md` — Pola solusi per tech stack (JS/TS, Python, PHP, Go, dll)
- `references/report-template.md` — Template laporan lengkap dalam Markdown

---

## CATATAN PENTING

1. **Jangan ekspos nilai sensitif** — saat scan .env atau credentials, tampilkan nama key saja, bukan nilainya
2. **Tanya dulu sebelum modifikasi besar** — presentasikan laporan & rencana, tunggu konfirmasi user
3. **Bertahap untuk project besar** — jika >500 file, scan per modul/folder
4. **Preserve working code** — jangan ubah kode yang sudah berjalan baik kecuali ada masalah nyata
5. **Context is king** — selalu sesuaikan solusi dengan tech stack, bukan solusi generik
