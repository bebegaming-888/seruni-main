# Katalog Masalah Web Development

Referensi lengkap semua tipe masalah yang perlu di-scan. Digunakan oleh SKILL.md Fase 2.

---

## 1. MASALAH FRONTEND (UI/UX)

### 1.1 Responsive Design

**Indikator masalah:**

- Fixed pixel width tanpa media query (`width: 800px` tanpa breakpoint)
- Viewport meta tag hilang di `<head>`
- Gambar tanpa `max-width: 100%` atau `object-fit`
- Font size hardcoded `px` tanpa `rem`/`em` fallback
- Overflow horizontal di mobile
- Touch target < 44px (WCAG recommendation)

**Scan patterns:**

```bash
grep -rn "width:\s*[0-9]*px" --include="*.css" .
grep -rn "height:\s*[0-9]*px" --include="*.css" .
grep -rn "viewport" --include="*.html" --include="*.jsx" --include="*.tsx" .
```

### 1.2 Cross-Browser Compatibility

**Indikator masalah:**

- CSS property tanpa vendor prefix (perlu cek caniuse.com)
- `grid` tanpa fallback untuk IE
- `CSS variables` tanpa fallback value
- ES2020+ syntax tanpa transpiling (optional chaining, nullish coalescing)

**Scan patterns:**

```bash
grep -rn "display: grid\|display: flex" --include="*.css" .
grep -rn "\.?\.\|??" --include="*.js" --include="*.ts" . # optional chaining, nullish coalescing
```

### 1.3 Layout Shift / CLS (Core Web Vitals)

**Indikator masalah:**

- `<img>` tanpa `width` dan `height` attributes
- Font loading tanpa `font-display: swap`
- Dynamic content injection ke atas existing content
- Ad slots tanpa reserved space

**Scan patterns:**

```bash
grep -rn "<img" --include="*.html" --include="*.jsx" --include="*.tsx" . | grep -v "width\|height"
grep -rn "font-display" --include="*.css" .
```

### 1.4 Styling Conflict

**Indikator masalah:**

- `!important` berlebihan (>10 penggunaan)
- Multiple CSS frameworks loaded bersamaan
- Global class names terlalu generic (`.button`, `.text`, `.container`)
- Specificity wars (>3 level selector chaining)

**Scan patterns:**

```bash
grep -rn "!important" --include="*.css" --include="*.scss" . | wc -l
grep -rn "Bootstrap\|Tailwind\|Foundation\|Bulma" --include="*.html" --include="*.jsx" .
```

### 1.5 State Management

**Indikator masalah:**

- Props drilling > 3 level
- State di komponen yang salah (misal: global state di leaf component)
- Missing dependency array di `useEffect`
- Mutation langsung pada state object (tanpa copy)
- Komponen re-render berlebihan

**Scan patterns:**

```bash
grep -rn "useEffect" --include="*.jsx" --include="*.tsx" . | grep -v "\[\]" # useEffect tanpa deps
grep -rn "setState\|useState" --include="*.jsx" --include="*.tsx" . | head -30
```

---

## 2. MASALAH BACKEND

### 2.1 API Error Handling

**Indikator masalah:**

- `try/catch` kosong (catch tanpa penanganan)
- Error message expose internal stack trace ke client
- HTTP status code tidak tepat (misal: 200 untuk error)
- Async function tanpa error handling

**Scan patterns:**

```bash
grep -rn "catch\s*(e\|err\|error)\s*{}" --include="*.js" --include="*.ts" .
grep -rn "catch\s*(.*)\s*{\s*}" --include="*.py" .
grep -rn "res.send.*error\|res.json.*stack" --include="*.js" --include="*.ts" .
```

### 2.2 Logic Bug Patterns

**Indikator masalah:**

- Validasi input tidak lengkap atau hilang
- Off-by-one error pada loop/pagination
- Floating point comparison (`if (price == 0.1 + 0.2)`)
- Null/undefined tidak di-check sebelum digunakan

**Scan patterns:**

```bash
grep -rn "==\s*undefined\|==\s*null" --include="*.js" --include="*.ts" . # gunakan ===
grep -rn "parseInt\|parseFloat" --include="*.js" --include="*.ts" . | head -10
```

### 2.3 Memory Leak

**Indikator masalah:**

- `setInterval` tanpa `clearInterval`
- `addEventListener` tanpa `removeEventListener`
- Promise chain yang tidak diselesaikan
- Database connection tidak ditutup setelah query
- Large object dalam global scope

**Scan patterns:**

```bash
grep -rn "setInterval" --include="*.js" --include="*.ts" . | head -20
grep -rn "addEventListener" --include="*.js" --include="*.ts" . | head -20
grep -rn "new\s\+Connection\|createConnection\|connect(" --include="*.js" .
```

### 2.4 Race Condition

**Indikator masalah:**

- Update stok/saldo tanpa locking/transaction
- Concurrent write ke file yang sama
- Non-atomic read-modify-write operations

**Scan patterns:**

```bash
grep -rn "transaction\|BEGIN\|COMMIT\|ROLLBACK\|FOR UPDATE" --include="*.js" --include="*.ts" --include="*.py" --include="*.php" . | head -20
grep -rn "stock\|saldo\|balance\|quantity" --include="*.js" --include="*.ts" --include="*.py" . | head -20
```

---

## 3. MASALAH DATABASE

### 3.1 Query Lambat

**Indikator masalah:**

- SELECT \* (ambil semua kolom, bukan yang dibutuhkan)
- Query dalam loop (N+1 problem)
- JOIN tanpa index pada kolom yang di-join
- LIKE '%keyword%' (full table scan)
- Tidak ada pagination (query semua data)

**Scan patterns:**

```bash
grep -rn "SELECT \*\|select\(\)" --include="*.js" --include="*.ts" --include="*.py" --include="*.php" --include="*.sql" . | head -20
grep -rn "\.forEach\|for.*in\|for.*of" --include="*.js" . | xargs grep -l "query\|find\|select" 2>/dev/null
```

### 3.2 Data Inconsistency

**Indikator masalah:**

- Tidak ada foreign key constraints
- Soft delete tidak konsisten (ada yang pakai `deleted_at`, ada yang langsung hapus)
- Data type mismatch antar tabel yang berelasi
- Tidak ada transaction pada operasi multi-table

### 3.3 Migration Issues

**Indikator masalah:**

- Migration tidak reversible (tidak ada `down()`)
- Migration mengubah data langsung (bukan schema)
- Tidak ada seed file untuk testing
- Migration dijalankan manual, tidak otomatis di deployment

**Scan patterns:**

```bash
find . -name "*migration*" -o -name "*migrate*" | grep -v node_modules | head -20
grep -rn "down\|rollback\|revert" --include="*.js" --include="*.ts" --include="*.py" . | head -10
```

---

## 4. AUTHENTICATION & SECURITY

### 4.1 Credential Exposure 🔴 KRITIS

**Indikator masalah:**

- Password/secret hardcoded di source code
- API key di frontend (visible di browser)
- `.env` tidak di `.gitignore`
- JWT secret terlalu pendek atau predictable

**Scan patterns:**

```bash
grep -rn "password\s*=\s*['\"].\+['\"]" --exclude-dir=node_modules --include="*.js" --include="*.py" --include="*.php" .
grep -rn "secret\s*=\s*['\"].\+['\"]" --exclude-dir=node_modules .
git log --all -- "*.env" 2>/dev/null # cek apakah .env pernah ter-commit
```

### 4.2 SQL Injection 🔴 KRITIS

**Indikator masalah:**

- String concatenation untuk query SQL
- Raw query dengan input user langsung
- Tidak menggunakan parameterized query / prepared statement

**Contoh berbahaya:**

```javascript
// BAHAYA
db.query("SELECT * FROM users WHERE id = " + req.params.id);
// AMAN
db.query("SELECT * FROM users WHERE id = ?", [req.params.id]);
```

### 4.3 XSS (Cross-Site Scripting) 🔴 KRITIS

**Indikator masalah:**

- `innerHTML =` dengan input user
- `dangerouslySetInnerHTML` di React tanpa sanitasi
- Template string langsung render ke DOM
- Output user tidak di-escape sebelum ditampilkan

### 4.4 CSRF Protection

**Indikator masalah:**

- Form POST tanpa CSRF token
- Cookie tanpa `SameSite` attribute
- API menerima request dari origin mana saja

### 4.5 Insecure Direct Object Reference (IDOR)

**Indikator masalah:**

- `GET /api/orders/:id` tanpa cek ownership
- User bisa akses resource milik user lain dengan ganti ID di URL

### 4.6 Konfigurasi Security

**Indikator masalah:**

- HTTPS tidak diforce
- HTTP security headers hilang (HSTS, CSP, X-Frame-Options)
- Password tidak di-hash (atau pakai MD5/SHA1)
- Session timeout tidak diset

**Scan patterns:**

```bash
grep -rn "bcrypt\|argon2\|scrypt\|pbkdf2" --include="*.js" --include="*.ts" --include="*.py" --include="*.php" .
grep -rn "helmet\|cors\|csp\|hsts" --include="*.js" --include="*.ts" .
```

---

## 5. PERFORMANCE

### 5.1 Asset Loading

**Indikator masalah:**

- Image besar tidak di-compress (>500KB untuk web image)
- Tidak menggunakan format modern (WebP, AVIF)
- CSS/JS tidak diminify di production
- Render-blocking scripts di `<head>` tanpa `defer`/`async`
- Tidak ada CDN untuk static assets

### 5.2 JavaScript Performance

**Indikator masalah:**

- Bundle JS terlalu besar (>500KB uncompressed)
- Tidak ada code splitting / lazy loading
- Semua library di-import walaupun sebagian kecil yang dipakai
- Synchronous operations yang bisa diparalelkan

### 5.3 Caching

**Indikator masalah:**

- Tidak ada cache headers untuk static assets
- API response tidak di-cache
- Database query yang sama dipanggil berulang
- Session store di memory (tidak scalable)

### 5.4 Too Many Requests

**Indikator masalah:**

- Polling interval terlalu pendek (< 5 detik)
- API dipanggil di setiap keystroke tanpa debounce
- Infinite scroll tanpa throttle
- `useEffect` re-run berlebihan karena dependency salah

---

## 6. DEPLOYMENT & DEVOPS

### 6.1 Environment Inconsistency ("Works on My Machine")

**Indikator masalah:**

- Tidak ada `package-lock.json` / `yarn.lock`
- Node/Python/PHP version tidak di-lock (tidak ada `.nvmrc`, `.python-version`)
- Environment variable tidak didokumentasikan (tidak ada `.env.example`)
- Tidak ada Docker untuk development

### 6.2 Build & CI/CD

**Indikator masalah:**

- Tidak ada CI/CD pipeline
- Build tidak otomatis test sebelum deploy
- Environment production sama dengan development
- Tidak ada staging environment

### 6.3 Logging & Monitoring

**Indikator masalah:**

- `console.log` berlebihan di production code
- Tidak ada structured logging
- Error tidak di-log ke monitoring service
- Tidak ada health check endpoint

**Scan patterns:**

```bash
grep -rn "console\.log\|console\.error\|print(" --include="*.js" --include="*.ts" --include="*.py" --exclude-dir=node_modules . | wc -l
grep -rn "winston\|bunyan\|pino\|morgan\|logging\|logger" --include="*.js" --include="*.ts" . | head -10
```

---

## 7. GIT & VERSION CONTROL

### 7.1 Branch Strategy

**Indikator masalah:**

- Semua developer commit langsung ke `main`/`master`
- Branch tidak dihapus setelah merge
- Nama branch tidak deskriptif (`fix`, `test`, `aaa`)

### 7.2 Commit Quality

**Indikator masalah:**

- Commit message tidak deskriptif ("fix", "update", "changes")
- Satu commit berisi perubahan yang tidak related
- Commit message menggunakan bahasa yang tidak konsisten

### 7.3 File Sensitif

**Indikator masalah:**

- `.env` atau file credential masuk ke repository
- Build artifacts masuk ke repo (`node_modules`, `dist`, `__pycache__`)
- Binary/media file besar di repo tanpa Git LFS

---

## 8. REQUIREMENT & COMMUNICATION

### 8.1 Code Maintainability

**Indikator masalah:**

- Fungsi terlalu panjang (>50 baris)
- Magic numbers tanpa konstanta (`if (status == 3)` vs `if (status == STATUS_ACTIVE)`)
- Variable naming tidak deskriptif (`a`, `b`, `x`, `data2`)
- Tidak ada komentar untuk logika kompleks

### 8.2 Technical Debt

**Indikator masalah:**

- Banyak `TODO`/`FIXME` yang tidak diselesaikan
- Kode yang di-comment-out (bukan dihapus)
- Dependency yang sudah outdated (>2 major version)
- Test coverage rendah atau tidak ada

**Scan patterns:**

```bash
grep -rn "TODO\|FIXME\|HACK\|XXX" --exclude-dir=node_modules . | wc -l
grep -rn "^//\|^#" --include="*.js" --include="*.py" . | grep -i "old\|remove\|delete\|unused" | head -10
```

---

## SEVERITY MATRIX

| Masalah                      | Default Severity |
| ---------------------------- | ---------------- |
| Credential exposure          | 🔴 KRITIS        |
| SQL Injection                | 🔴 KRITIS        |
| XSS aktif                    | 🔴 KRITIS        |
| Auth bypass                  | 🔴 KRITIS        |
| Memory leak (production)     | 🟠 TINGGI        |
| Race condition di transaksi  | 🟠 TINGGI        |
| N+1 query (traffic tinggi)   | 🟠 TINGGI        |
| No error handling            | 🟠 TINGGI        |
| Responsive design rusak      | 🟠 TINGGI        |
| Missing index (query lambat) | 🟡 SEDANG        |
| Props drilling berlebihan    | 🟡 SEDANG        |
| Console.log di production    | 🟡 SEDANG        |
| TODO/FIXME tidak selesai     | 🟢 RENDAH        |
| Commit message buruk         | 🟢 RENDAH        |
| Magic numbers                | 🟢 RENDAH        |
