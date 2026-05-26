# Security Review Checklist for Code Review

Use this checklist when auditing security in code changes.

---

## 1. Input Validation

- [ ] All user inputs validated (params, body, headers, cookies)
- [ ] Type checking: correct types expected, schema validation (Zod/Joi/yup/validator)
- [ ] Length limits: strings, arrays, upload sizes
- [ ] Range validation: numbers, dates, pagination
- [ ] Format validation: emails, URLs, phone numbers, NIK
- [ ] Blocked inputs: SQL injection payloads, XSS payloads, path traversal (`../`)
- [ ] No `eval()`, `new Function()`, or `exec()` with user input
- [ ] No `dangerouslySetInnerHTML` without sanitization

**Dangerous patterns:**

```javascript
// DANGEROUS - no validation
const id = req.params.id;
db.query("SELECT * FROM users WHERE id = " + id);

// SAFE - parameterized query with validation
const { id } = req.params;
const numId = parseInt(id, 10);
if (isNaN(numId)) return 400;
db.query("SELECT * FROM users WHERE id = $1", [numId]);
```

---

## 2. Authentication & Authorization

- [ ] New endpoints check authentication
- [ ] Permission checks added (role-based or resource-based)
- [ ] `can(role, action)` used from roles.ts (not inline checks)
- [ ] Auth checks happen server-side (not just client-side hiding)
- [ ] Token expiration checked
- [ ] Session revocation checked
- [ ] No auth bypass in new code (early returns without checks)

**Auth bypass patterns:**

```javascript
// DANGEROUS - route without auth middleware
app.post('/api/admin/delete-user', (req, res) => { ... })

// SAFE - middleware applied
app.post('/api/admin/delete-user', authMiddleware, (req, res) => { ... })
```

---

## 3. Secrets & Credentials

- [ ] No hardcoded passwords/secrets/API keys in source
- [ ] New env vars documented in .env.example
- [ ] .env not in git history (check `git log --all -- "*.env"`)
- [ ] No secrets in error messages or logs
- [ ] JWT secret >= 32 chars, random
- [ ] No secrets in client-side code (check VITE\_ prefix is appropriate)

---

## 4. SQL Injection

- [ ] All queries use parameterized queries or ORM
- [ ] No string concatenation in SQL
- [ ] No template literals with user input in queries
- [ ] ORM used correctly (not raw SQL unless necessary)

**Checklist:**

```bash
# Find dangerous patterns
git diff ... | Grep "query\s*\("
git diff ... | Grep "\+.*\$\|concat\(|template.*SELECT"
git diff ... | Grep "execute\s*\("
```

---

## 5. XSS (Cross-Site Scripting)

- [ ] No `innerHTML =` with user content
- [ ] No `dangerouslySetInnerHTML` without `sanitizeHtml()`
- [ ] User input escaped before rendering
- [ ] CSP headers present
- [ ] `httpOnly` and `SameSite` on cookies
- [ ] No `eval()` or `new Function()` with strings

---

## 6. CSRF

- [ ] State-changing endpoints (POST/PUT/DELETE) have CSRF token
- [ ] SameSite cookie attribute set
- [ ] CORS configured (not wildcard `*` for credentials)

---

## 7. Rate Limiting

- [ ] Auth endpoints rate-limited (login, OTP request, verify)
- [ ] File upload endpoints rate-limited
- [ ] Public API endpoints rate-limited

---

## 8. Secure Defaults

- [ ] HTTPS forced in production
- [ ] Security headers set (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- [ ] Helmet.js or equivalent used
- [ ] Debug mode disabled in production
- [ ] Error messages don't expose stack traces

---

## Severity Mapping for Security Issues

| Issue                               | Severity  |
| ----------------------------------- | --------- |
| Unvalidated user input to SQL query | 🔴 KRITIS |
| Auth bypass / privilege escalation  | 🔴 KRITIS |
| Hardcoded secrets                   | 🔴 KRITIS |
| XSS with user input                 | 🔴 KRITIS |
| Missing auth on new endpoint        | 🟠 TINGGI |
| Missing rate limit on auth          | 🟠 TINGGI |
| Missing CSRF token                  | 🟠 TINGGI |
| Missing security headers            | 🟡 SEDANG |
| Verbose error messages              | 🟡 SEDANG |
| Weak JWT secret                     | 🟡 SEDANG |
