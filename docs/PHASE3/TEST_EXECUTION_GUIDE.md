# Phase 3 Test Execution Guide

**Version:** 1.0  
**Date:** April 27, 2026  
**Status:** Draft

---

## Local Test Setup

1. Create a test database (e.g., `linkprosoft_test`).
2. Populate `.env.test` with DB connection and test-specific vars.
3. Run migrations against the test DB.

## Run tests

```bash
npm run test
```

## Running a single test file

```bash
npm run test -- __tests__/jobs/jobs.integration.test.ts
```

## Fixtures

- Use provided fixtures in `__tests__/fixtures` to seed required data.
