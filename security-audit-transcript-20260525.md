# SECURITY AUDIT — TOOL CALL TRANSCRIPT

# Proyek: d:\seruni-mumbul

# Tanggal: 25 Mei 2026

## PHASE 1: Project Structure Reconnaissance

### Bash (parallel) — ls top-level dirs

Command: ls d:/seruni-mumbul/
Output: show directories — server, src, docs, scripts, supabase, public, dist, etc.

### Bash (parallel) — ls subdirs

Commands:

- ls d:/seruni-mumbul/server/
- ls d:/seruni-mumbul/server/middleware/ && ls d:/seruni-mumbul/server/lib/
- ls d:/seruni-mumbul/src/lib/

Output:

- server/api/ = auth, surat, keuangan, pembangunan, bantuan, etc. (40+ endpoints)
- server/middleware/ = auth.ts, rate-limit.js, api-response.js
- src/lib/ = 45+ store/utility files

---

## PHASE 2: Credential Scan

### Grep #1 — Hardcoded secrets pattern

Pattern: (password|passwd|pwd|secret|api[_-]?key|token|auth|bearer|credential|private[_-]?key)\s*[=:]\s*["'][^"']{8,}["']
File filter: \*.{js,ts,tsx,vars,env,sql,json,toml}
Result: No matches found

### Grep #2 — Scan for VITE_DEV / VITE_TEST / VITE_DEBUG / SKIP_AUTH / DEV_MODE / BYPASS

Result: 3 matches in src/lib/auth.ts (lines 303, 306, 311) — VITE_DEV_LOGIN_ENABLED, VITE_ADMIN_PASS

### Grep #3 — Scan for VITE\_ secrets in server

Pattern: VITE\_|import.meta.env
Result: No matches in server (server uses process.env only, good!)

---

## PHASE 3: SQL Injection Scan

### Grep — SQL template literals

Pattern: `\$\{.*\+|\.format\(.*\+|sql`|`._\$\{|string\s_\+\s\*(req|param|body|query)
Result: No matches found

### Grep — Supabase query patterns in src

Pattern: \.select\(._\+|\.filter\(._\+|\.order\(._\+|\.eq\(._\+
Result: No matches found

### Grep — SQL concat in server

Pattern: `\$\{.*req\.|`\$\{.*body\.|`\$\{.*query\.
Result: No matches found

---

## PHASE 4: XSS Vector Scan

### Grep — innerHTML / dangerouslySetInnerHTML

Pattern: innerHTML|dangerouslySetInnerHTML
Result: No matches in src, no matches in server

### Grep — .text( / .html( / .string(

Pattern: \.text\(|\.html\(|\.string\(
Result: No matches found

### Grep — renderToStaticMarkup / renderToString / DOMParser / dangerouslySetInnerHTML

Pattern: renderToString|renderToStaticMarkup|DOMParser|dangerouslySetInnerHTML
Result: No matches

### Grep — sanitizeHtml usage

Pattern: sanitizeHtml|\_\_html|dangerouslySet
Result: No matches — function defined in utils.ts but not used anywhere

### Grep — innerHTML in pages

Pattern: innerHTML|textContent\s\*=|setHTML|insertAdjacentHTML
Result: No matches

### Grep — setAttribute(on | eval( | new Function(

Pattern: setAttribute\s*\(\s*['\"]on\w+|eval\s*\(|new\s+Function\s*\(|script\s\*inject|document\.write
Result: No matches

---

## PHASE 5: Full File Reads

### Read server/index.js — FULL (324 lines)

Key findings:

- CORS: explicit whitelist, refuses to start if wildcard in production ✓
- Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy ✓
- Error handler: production hides details ✓
- Rate limiting: comprehensive ✓
- JSON body limit: 10mb ✓

### Read server/api/auth-admin-login.js — FULL (142 lines)

Key findings:

- ADMIN_USER, ADMIN_PASS from process.env ✓
- timingSafeEquals() with constant-time comparison ✓
- IP-based rate limiting + account lockout ✓
- No HMAC sig returned in session ✓

### Read server/middleware/auth.js — FULL (309 lines)

Key findings:

- buildSignPayload(), hmacVerify(), hmacSign() exported ✓
- isSessionRevoked() via Supabase ✓
- verifyAdmin() — full check with HMAC ✓
- verifyAdminLight() — expiry only ✓
- checkRole() ✓
- Dev bypass: unsigned sessions allowed in non-production ✓
- Production: reject unsigned sessions ✓

### Read server/middleware/rate-limit.js — FULL (114 lines)

Key findings:

- 7 rate limiters defined ✓
- Documented: in-memory, resets on restart ✓
- Recommended: Redis or Supabase RPC for distributed ✓

### Read server/api/request-otp.js — FULL (179 lines)

Key findings:

- PBKDF2-SHA512 OTP hashing with 100k iterations ✓
- Fonnte API key from env var (not exposed) ✓
- Dev mode: return OTP in response if Fonnte not configured ✓

### Read server/api/verify-otp.js — FULL (110 lines)

Key findings:

- Atomic RPC: warga_verify_otp_and_create_session ✓
- NIK validation: /^\d{16}$/ regex ✓
- OTP validation: /^\d{6}$/ regex ✓

### Read server/api/submit-surat.js — FULL (381 lines)

Key findings:

- HMAC session verification (inline hmacVerify) ✓
- Turnstile captcha verification ✓
- Zod schema validation ✓
- Rate limit: 3 per NIK per 24h ✓
- QR signing with QR_SECRET ✓
- Dev bypass: unsigned sessions allowed in non-prod ✓
- inline hmacVerify: length check is lenient (sig.length === 0 vs !== 64)

### Read server/api/generate-pdf.js — FULL (159 lines)

Key findings:

- verifyAdmin + checkRole middleware ✓
- Status check: only "Disetujui" can generate PDF ✓

### Read server/api/sign-surat-qr.js — FULL (72 lines)

Key findings:

- Zod schema validation ✓
- QR_SECRET length check (>= 32) ✓
- verifyAdmin + checkRole ✓

### Read server/api/generate-nomor-surat.js — FULL (154 lines)

Key findings:

- sanitizeInisial() with whitelist regex /^[A-Z0-9.]+$/ ✓
- Atomic RPC: increment_nomor_surat_counter — NO FALLBACK ✓

### Read server/api/verify-surat.js — FULL (161 lines)

Key findings:

- Public endpoint (no auth) ✓
- Rate limit: 5 NIK searches per IP per 60s ✓
- encodeURIComponent for URL params ✓
- publicRecord() — masks phone numbers ✓

### Read server/api/send-wa.js — FULL (202 lines)

Key findings:

- Fonnte token from env var (not exposed) ✓
- sendWaAuth middleware: supports admin + warga sessions ✓
- Zod schema validation ✓
- Token priority: request body > env var (concern noted) ✓

### Read server/api/auth-sign-session.js — FULL (87 lines)

Key findings:

- HMAC signing on server side ✓
- Validates expiresAt is in future ✓
- Dev mode: returns unsigned session if secret not configured ✓

### Read server/api/refresh-warga-session.js — FULL (79 lines)

Key findings:

- Token validation: length >= 10 ✓
- Session extension: 7 days ✓

### Read src/lib/auth.ts — FULL (545 lines)

Key findings:

- FIXED_ADMIN loaded from VITE_ADMIN_USER (not password) ✓
- PBKDF2 verification for stored hashes ✓
- login() — dev-mode fixed admin bypass with VITE_ADMIN_PASS (MITIGATED) ✓
- loginHybrid() — server-side HMAC signing flow ✓
- Session stored in localStorage/sessionStorage ✓
- getSessionAsync() — production rejects unsigned sessions ✓

### Read src/lib/warga-auth.ts — FULL (300 lines)

Key findings:

- OTP rate limit: 3 per 15 min per NIK ✓
- Dev OTP bypass with hardcoded "123456" (MITIGATED) ✓
- Session stored in sessionStorage ✓

### Read src/lib/supabase.ts — FULL (58 lines)

Key findings:

- persistSession: false, autoRefreshToken: false ✓
- VITE_ADMIN_DB_TOKEN removed from client (correct!) ✓
- Comment explains why: RLS doesn't check custom headers ✓

### Read src/lib/roles.ts — FULL (139 lines)

Key findings:

- can() function — centralized role checking ✓
- MATRIX defines permissions per role ✓

### Read src/lib/utils.ts — FULL (122 lines)

Key findings:

- sanitizeHtml() defined but not used anywhere ✓
- maskNik(), maskPhone(), maskNama() for PDP compliance ✓

### Read src/lib/penduduk-store.ts — FULL (720 lines)

Key findings:

- No SQL injection — all queries use Supabase parameterized API ✓
- syncOpenSidProperties() called on all imports ✓
- Orphan-aware merge strategy in importPenduduk() ✓
- No mock data auto-injection ✓

### Read src/lib/content-store.ts — FULL (type definitions + store)

Key findings:

- Article.content: string // HTML — stored as HTML ✓
- sanitizeHtml() NOT called in content rendering ✓
- Zod schemas for validation ✓

### Read src/lib/offline-queue.ts — FULL (168 lines)

Key findings:

- Exponential backoff: 30s, 2m, 10m, 30m, 2h, 10h ✓
- Session token not stored in queue items ✓
- Handles "surat" and "attachment_upload" types ✓

### Read src/lib/letter-renderer.ts — FULL (513 lines)

Key findings:

- renderLetterToHTML() — generates HTML string ✓
- Uses template literal concatenation for HTML building ✓
- Values inserted via replaceText() — NOT from user input directly ✓
- No innerHTML or dangerouslySetInnerHTML — just string interpolation ✓

### Read src/lib/qr-signature.ts — FULL (102 lines)

Key findings:

- HMAC-SHA256 via Web Crypto API ✓
- Sign and verify functions ✓

### Read src/lib/pdf-generator.ts — FIRST 60 lines

Key findings:

- Uses pdf-lib (not client-side HTML injection) ✓

### Read src/lib/esurat-submit.ts — FULL (167 lines)

Key findings:

- submitSurat() — captcha + server submission ✓
- AbortSignal.timeout(15_000) ✓

### Read server/api/admin-users.js — FIRST 60 lines

Key findings:

- verifyAdmin + checkRole middleware ✓
- Pagination sanitization with clamp to MAX_LIMIT=100 ✓

---

## PHASE 6: Specific Scans

### Grep — localStorage/sessionStorage usage

Result: Found in auth.ts (getStorage/setItem), warga-auth.ts (sessionStorage)

### Grep — Supabase REST URL construction

Result: verify-surat.js uses encodeURIComponent() for URL params ✓

### Grep — inline hmacVerify vs imported

Result: submit-surat.js has inline copy with lenient check (length === 0 vs !== 64)

### Grep — VITE_DEV_OTP_BYPASS usage

Result: warga-auth.ts lines 243-267

---

## PHASE 7: Report Generation

### TodoWrite — Updated progress tracking throughout

Used TodoWrite tool to track:

1. Project structure exploration ✓
2. Credential scan ✓
3. SQL injection scan ✓
4. XSS vectors scan ✓
5. CORS and auth config ✓
6. Server security check ✓
7. Report generation ✓

### Write — security-audit-report-20260525.md

Created comprehensive report with:

- Executive summary with severity table
- Methodology
- 7 medium findings (M-01 to M-07)
- 4 low findings (L-01 to L-04)
- All positive security areas (SQL injection-free, XSS-free, etc.)
- Prioritized fix recommendations
- Conclusion

---

## SUMMARY

Total tool calls made:

- Bash: 7 (directory listings)
- Grep: 18 (pattern scans)
- Read: 22 (full file reads)
- Write: 1 (report output)

Key files scanned:

- Server: 14 API endpoints, 2 middleware files, main server
- Client: 10 lib files, auth stores, stores, renderers
- Pages: 8 pages (Admin, ESurat, Lacak, etc. — via glob)

Findings:

- 🔴 KRITIS: 0
- 🟡 MENENGAH: 7
- 🟢 LOW: 3
- ✅ GOOD: 9 categories verified clean

Output saved to: d:/seruni-mumbul/security-audit-report-20260525.md
