# Production Readiness Checklist

**Last Updated:** 23 Mei 2026  
**Status:** ⚠️ NOT PRODUCTION READY  
**Estimated Time to Production:** 4-6 weeks

---

## Critical Blockers (Must Fix Before Production)

### Security Vulnerabilities

- [ ] **H-01: HMAC Secret Exposed to Browser** (CRITICAL)
  - **Issue:** `VITE_ADMIN_SESSION_SECRET` in browser bundle allows session forgery
  - **Impact:** Attacker can forge admin sessions
  - **Fix:** Move signing to server-side, remove from browser
  - **ETA:** 3 days

- [ ] **H-02: No Session Revocation** (HIGH)
  - **Issue:** Stolen sessions valid until expiry
  - **Impact:** Compromised sessions cannot be invalidated
  - **Fix:** Implement session table + revoke endpoint
  - **ETA:** 2 days

- [ ] **H-03: Dev Mode Bypass Too Permissive** (MEDIUM)
  - **Issue:** Unsigned sessions accepted in dev mode
  - **Impact:** Could leak to production
  - **Fix:** Enforce signature in all environments
  - **ETA:** 1 day

### Missing Core Features

- [ ] **No Monitoring** (CRITICAL)
  - **Issue:** No uptime monitoring, Sentry DSN empty
  - **Impact:** Downtime undetected, errors not tracked
  - **Fix:** Setup UptimeRobot + fill Sentry DSN
  - **ETA:** 1 day

- [ ] **No Backup Verification** (CRITICAL)
  - **Issue:** No automated backup testing
  - **Impact:** Cannot verify restore capability
  - **Fix:** Create backup verification script
  - **ETA:** 1 day

- [ ] **No Test Suite** (HIGH)
  - **Issue:** 0% test coverage
  - **Impact:** Bugs not caught before production
  - **Fix:** Setup Vitest + 60% coverage critical paths
    **ETA:** 1 week

### API Issues

- [ ] **No Pagination** (HIGH)
  - **Issue:** `GET /api/admin-users` can return thousands of records
  - **Impact:** Performance degradation, memory issues
  - **Fix:** Add limit/offset to admin-users, template-version
  - **ETA:** 1 day

- [ ] **No Request Size Limits** (MEDIUM)
  - **Issue:** No body size limit
  - **Impact:** DoS via large payloads
  - **Fix:** Add `express.json({ limit: '10mb' })`
  - **ETA:** 1 hour

---

## High Priority (Should Fix Before Production)

### Documentation

- [ ] **No Deployment Guide**
  - **Fix:** Create `docs/DEPLOYMENT.md`
  - **ETA:** 3 hours

- [ ] **No Runbook**
  - **Fix:** Create `docs/RUNBOOK.md`
  - **ETA:** 3 hours

- [ ] **No User Manual**
  - **Fix:** Create `docs/USER_GUIDE.pdf`
  - **ETA:** 1 day

- [ ] **No OpenAPI Spec**
  - **Fix:** Generate from Zod schemas
  - **ETA:** 1 day

### Code Quality

- [ ] **No Error Boundaries**
  - **Fix:** Add React error boundaries at route level
  - **ETA:** 2 hours

- [ ] **Large Files**
  - **Fix:** Refactor Admin.tsx (2000+ lines)
  - **ETA:** 1 day

### Performance

- [ ] **Bundle Size Not Optimized**
  - **Fix:** y load Recharts (379KB)
  - **ETA:** 1 day

- [ ] **No Caching Strategy**
  - **Fix:** Add React Query for API caching
  - **ETA:** 2 days

---

## Medium Priority (Nice to Have)

### User Experience

- [ ] **No Loading States**
  - **Fix:** Add skeleton loaders
  - **ETA:** 1 day

- [ ] **No Onboarding**
  - **Fix:** Create wizard for new users
  - **ETA:** 2 days

### Infrastructure

- [ ] **No Load Testing**
  - **Fix:** k6 load test (target: 500 RPS)
  - **ETA:** 1 day

- [ ] **No Security Audit**
  - **Fix:** OWASP ZAP scan
  - **ETA:** 1 day

---

## Roadmap to Production

### Week 1: Security Fixes

- Day 1-3: Fix H-01 (HMAC secret)
- Day 4-5: Fix H-02 (session revocation)

### Week 2: Testing + API Improvements

- Day 1: Add pagination
- Day 2: Add rate limiting + request limits
- Day 3: Fix dev mode bypass
- Day 4-5: Setup test suite

### Week 3: Documentation + Code Quality

- Day 1: OpenAPI documentation
- Day 2: Deployment guide + runbook
- Day 3: User guide
- Day 4: Fix GOALS.md accuracy
- Day 5: Add error boundaries

### Week 4: Performance + Operations

- Day 1: Bundle optimization
- Day 2: Backup verification
- Day 3: Loading states
- Day 4: API versioning
- Day 5: Refactor Admin.tsx

---

## Sign-Off Criteria

Before production deployment, ALL of the following must be TRUE:

- [x] All CRITICAL blockers resolved
- [ ] All HIGH priority items resolved
- [ ] Test coverage ≥ 60% for critical paths
- [ ] Load test passed (500 RPS sustained)
- [ ] Security audit passed (no HIGH vulnerabilities)
- [ ] Backup restore tested successfully
- [ ] Monitoring active (UptimeRobot + Sentry)
- [ ] Deployment guide reviewed by ops team
- [ ] User guide reviewed by village staff

---

**Prepared by:** System Audit  
**Next Review:** After Week 1 completion
