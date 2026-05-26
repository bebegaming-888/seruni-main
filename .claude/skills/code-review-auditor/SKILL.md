---
name: code-review-auditor
description: >
  Performs systematic code review of pull requests, diffs, and code changes — audits
  correctness, security, performance, maintainability, and test coverage. Provides
  structured feedback with inline comments, suggested fixes, and approval recommendations.

  Use this skill whenever user requests: code review, review PR, check changes, audit code,
  analyze diff, "review this", "check if this is safe to merge", pull request feedback,
  or any code change that needs scrutiny. Also activates when user mentions "lgtm", "approve",
  or asks about code quality before merging.

context: fork
agent: Explore
---

# Code Review Auditor

Systematic code review for pull requests, diffs, and architectural changes.
Workflow: discover changes → analyze categories → score & recommend → report.

---

## REVIEW WORKFLOW

### PHASE 1 — DISCOVER CHANGES

**Step 1: Understand What Changed**

- Get list of changed files: `git diff --name-only HEAD~1` or `git diff --name-only origin/main`
- Get commit history: `git log --oneline -10`
- For GitHub PR: use `gh pr diff` or `gh pr view`
- Identify the primary purpose of these changes

**Step 2: Categorize Change Type**
Changes fall into one or more categories:
| Type | Signals |
|------|---------|
| Feature addition | New files, new routes, new components |
| Bug fix | Bug in description, regression in git log |
| Refactor | Same logic, moved files, renamed |
| Security | Auth, encryption, input handling changes |
| Performance | Query changes, caching, indexing |
| DevOps | CI/CD, Docker, config changes |
| Test | `*.test.*`, `*.spec.*` files |

**Step 3: Load Context**

- Read the full diff for each changed file: `git diff HEAD~1 -- file`
- Read surrounding context (functions, classes)
- For API changes: read old vs new endpoint signatures

---

### PHASE 2 — AUDIT BY CATEGORY

For each changed file, run targeted audits:

#### 2A. Correctness Audit

- Logic errors: off-by-one, wrong operators, missing conditions
- Null/undefined: unchecked returns, missing null guards
- Type errors: wrong types passed, missing type assertions
- Edge cases: empty arrays, zero values, boundary conditions
- Async bugs: missing await, race conditions, unhandled promise rejections

```bash
# Check for common logic errors in diff
git diff ... | Grep "== "| Grep "=== "  # equality checks
git diff ... | Grep "if\s*(" # conditionals that need scrutiny
```

#### 2B. Security Audit

- **Input validation**: new inputs without validation/sanitization
- **SQL injection**: string concatenation in queries (use Grep for `query(`, `execute(`)
- **XSS**: `innerHTML`, `dangerouslySetInnerHTML`, `eval()` in new code
- **Auth bypass**: changed permission checks, missing `can(role, action)` calls
- **Secrets**: new hardcoded credentials, exposed tokens
- **CSRF**: missing CSRF tokens on form POST

**Severity for security findings:**
| Issue | Severity |
|-------|----------|
| Unvalidated user input to DB query | 🔴 KRITIS |
| Auth bypass / privilege escalation | 🔴 KRITIS |
| Hardcoded secrets | 🔴 KRITIS |
| Missing input validation (non-DB) | 🟠 TINGGI |
| Missing CSRF token | 🟠 TINGGI |
| XSS without user input | 🟡 SEDANG |

#### 2C. Performance Audit

- N+1 queries: queries inside loops
- Missing indexes: new WHERE/ORDER BY columns without index
- Large data in memory: loading large datasets without pagination
- Unnecessary re-renders (React): state in wrong component, missing memo
- Sync operations blocking: `for...await` that could be parallelized
- Large bundle additions: new heavy dependencies without lazy loading

```bash
# Check for queries in loops
git diff ... | Grep "\.forEach|\.map\(|\.for\s*\(" | Grep "query\|find\|select\|await"
```

#### 2D. Maintainability Audit

- Function length: new functions > 40 lines need splitting
- Code duplication: copied-and-pasted logic
- Magic numbers: hardcoded numbers without named constants
- Naming: vague names (`data`, `temp`, `x`) vs descriptive names
- Missing comments: complex logic without explanation
- TODO/FIXME: new TODOs introduced by this change

```bash
# Check for new long functions (>40 lines)
git diff --stat  # large diff hunks indicate long functions
```

#### 2E. Test Coverage Audit

- New logic: was new logic tested?
- Bug fixes: was the bug covered by a test?
- Edge cases: boundary conditions tested?
- Missing test types: unit tests needed but absent

For each changed file:

1. Does a corresponding test file exist?
2. Are the core paths exercised?
3. Are edge cases covered?

#### 2F. API Contract Audit

- Endpoint changes: are breaking changes properly versioned?
- Request/response shape: does new shape break existing consumers?
- Error codes: consistent with existing API error format?
- Status codes: 200 for success, 4xx/5xx for errors?

#### 2G. Dependency Audit

- New dependencies: is each one necessary?
- Updated versions: major version bumps need scrutiny
- Removed dependencies: any functionality lost?
- Peer dependency conflicts: potential version issues?

---

### PHASE 3 — SCORE & RECOMMEND

Calculate overall review score and recommendation.

**Score Matrix (0-10 per category, 50 max):**
| Category | Weight | What to check |
|----------|--------|---------------|
| Correctness | 20 | Logic, types, edge cases, async |
| Security | 15 | Input, auth, secrets, XSS, injection |
| Performance | 10 | N+1, indexing, bundle size |
| Maintainability | 10 | Length, naming, duplication, comments |
| Test Coverage | 10 | Coverage of new logic, edge cases |
| API Contract | 5 | Breaking changes, error codes |

**Recommendation:**
| Score | Recommendation |
|-------|----------------|
| 45-50 | **APPROVE** — Ready to merge |
| 35-44 | **APPROVE WITH MINOR FIXES** — Address nits before merge |
| 20-34 | **REQUEST CHANGES** — Significant issues need fixing |
| 0-19 | **BLOCK** — Critical issues, do not merge |

---

### PHASE 4 — REPORT

Generate structured review report:

```
# Code Review Report: [PR Title / Branch]
Date: [date] | Reviewer: Claude | Files: [N] | +[N] -[N] lines

## SUMMARY
[1-2 sentence overview + recommendation]

## SCORE: [X]/50 — [APPROVE/APPROVE WITH CHANGES/REQUEST CHANGES/BLOCK]

| Category | Score | Status |
|----------|-------|--------|
| Correctness | X/20 | [OK/ISSUE] |
| Security | X/15 | [OK/ISSUE] |
| Performance | X/10 | [OK/ISSUE] |
| Maintainability | X/10 | [OK/ISSUE] |
| Test Coverage | X/10 | [OK/ISSUE] |
| API Contract | X/5 | [OK/ISSUE] |

## CHANGES OVERVIEW
| File | Change Type | Risk |
|------|------------|------|
| src/foo.ts | Feature | Low |
| server/api/bar.js | Bug fix | Medium |

## FINDINGS

### 🔴 KRITIS Issues (Must Fix)
#### [N]. [Title]
- **File**: `[file:line]`
- **Problem**: [what is wrong]
- **Impact**: [consequence]
- **Suggestion**: [how to fix]

### 🟠 TINGGI Issues (Should Fix)
...

### 🟡 SEDANG Issues (Nits)
...

### 🟢 Notes (Optional Improvements)
...

## POSITIVE FINDINGS
- [What was done well — mention even in critical reviews]

## TESTING RECOMMENDATIONS
[What manual testing should be done before merge]

## APPROVAL CHECKLIST
- [ ] All KRITIS issues addressed
- [ ] Security concerns verified
- [ ] Test coverage adequate
- [ ] No breaking changes without version bump
```

---

## REFERENCE FILES

- `references/security-checklist.md` — Detailed security review checklist
- `references/performance-patterns.md` — Performance anti-patterns to catch
- `references/review-template.md` — Detailed review report template

---

## IMPORTANT REMINDERS

1. **Be specific** — cite exact file:line for every finding
2. **Distinguish opinion from fact** — "Consider..." vs "This will break..."
3. **Severity matters** — don't label everything as KRITIS
4. **Acknowledge positives** — good patterns deserve recognition
5. **Offer solutions** — every problem should have a suggested fix
6. **Security first** — always audit input handling before anything else
7. **Test coverage check** — new logic without tests is a medium-risk finding
