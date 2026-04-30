# Phase 3 Testing Strategy

**Version:** 1.0  
**Date:** April 27, 2026  
**Status:** Draft

---

## Testing Pyramid

- Unit tests: business logic helpers, state-transition validation  
- Integration tests: controllers → services → repositories (using test DB)  
- E2E: optional, run against staging environment

## Fixtures

- Provide fixtures for: valid job, minimal job, valid assignment, invalid transitions (accept on non-invited), unauthorized updates.

## Coverage Targets

- Aim for >= 80% coverage for new modules (jobs + assignments).

## Test Organization

```
__tests__/
  jobs/
    jobs.integration.test.ts
    jobs.fixtures.ts
  assignments/
    assignments.integration.test.ts
    assignments.fixtures.ts
```

## Test Execution Guide

- Run unit and integration tests with the project test runner (Jest). Ensure the test DB is prepared and migrations applied.

Example commands:

```powershell
npm run test -- __tests__/jobs/jobs.integration.test.ts
npm run test -- __tests__/assignments/assignments.integration.test.ts
```

- Tests that rely on JWT must set `JWT_SECRET` and other auth env vars in the test environment. When using cookies in tests, ensure the test helper returns `set-cookie` and Supertest attaches cookies to subsequent requests.

## Thunder Client / Manual Tests

- Import `docs/PHASE3/Thunder-Client-Collection-Phase3.json` into Thunder Client or Postman.
- Configure environment variables (baseUrl, testUser email/password) and run the collection.
