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
