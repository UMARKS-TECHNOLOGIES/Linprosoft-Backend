# Phase 3 Implementation Guide

**Version:** 1.0  
**Date:** April 27, 2026  
**Status:** Draft

---

## Overview

This guide outlines concrete steps to implement `jobs` and `assignments` modules following project conventions (Controller → Service → Repository). Use Phase 2 modules as reference implementations.

## Database Migrations

- Add migration SQL for `job_postings` and `job_assignments` (include `deleted_at` for soft deletes as needed).

## Step-by-step Implementation (detailed)

1. Database
	- Add migration file `src/migrations/00xx_job_postings_assignments.sql` (see `PHASE_3_DATABASE_SCHEMA.md`).
	- Run migrations in staging first; ensure no destructive operations on production tables.

2. Types
	- Add `src/types/jobTypes.ts` and `src/types/assignmentTypes.ts` with `JobRow`, `JobDTO`, `CreateJobInput`, `UpdateJobInput`, `JobAssignmentRow`, `AssignmentDTO`.

3. Validation
	- Create `src/modules/jobs/jobsValidation.ts` and `src/modules/assignments/assignmentsValidation.ts` using Zod. Include transition schemas for `accept`, `reject`, `start`, `complete`.

4. Repository
	- Implement `src/modules/jobs/jobsRepository.ts` with `createJob`, `findJobById`, `listJobs`, `updateJob`, `softDeleteJob`, `findMatchesForJob`.
	- Implement `src/modules/assignments/assignmentsRepository.ts` with `createAssignment`, `findById`, `updateStatus`, `listByProfessional`, `listByEmployer`.

5. Service Layer
	- Implement safe state transition helpers and ownership checks in `jobsService` and `assignmentsService`.
	- Map camelCase DTOs → snake_case DB rows in service layer using small mapper helpers.

6. Controllers & Routes
	- Add `jobsRoutes.ts` and `assignmentsRoutes.ts` and wire them into `app.ts`.
	- Protect write endpoints with `protect` middleware and ensure role checks where needed.

7. Tests
	- Add unit tests for mappers and services.
	- Add integration tests under `__tests__/jobs/` and `__tests__/assignments/` using fixtures and the existing test DB setup.

8. Documentation
	- Finalize `docs/PHASE3/*` (this set) including Thunder Client collection and cURL samples.

## Files & Location Checklist

- `src/modules/jobs/` — routes, controller, service, repository, validation, tests
- `src/modules/assignments/` — routes, controller, service, repository, validation, tests
- `src/types/jobTypes.ts`, `src/types/assignmentTypes.ts`
- `src/migrations/00xx_job_postings_assignments.sql`

## Example: wiring route in `app.ts`

Add:

```ts
import jobsRoutes from './modules/jobs/jobsRoutes';
import assignmentsRoutes from './modules/assignments/assignmentsRoutes';

app.use('/api/jobs', jobsRoutes);
app.use('/api/assignments', assignmentsRoutes);
```



## Types

- Define `JobRow`, `JobPostingResponseDTO`, `JobAssignmentRow`, and `JobAssignmentResponseDTO` in `src/types`.

## Validation (Zod)

- Create `jobsValidation.ts` and `assignmentsValidation.ts` with create/update schemas and transition schemas (accept/reject/start/complete).

## Repository Pattern

- Implement `jobsRepository.ts` with methods: `create`, `findById`, `findAll`, `update`, `softDelete`, `findMatches`.
- Implement `assignmentsRepository.ts` with methods: `createAssignment`, `findById`, `updateStatus`, `listByProfessional`, `listByEmployer`.

## Service Layer

- Implement safe state transition helpers (verify current status before changing).  
- Enforce ownership checks and validation beyond Zod (e.g., `job.employer_id === user.id`).

## Controllers and Routes

- Map routes in `jobsRoutes.ts` and `assignmentsRoutes.ts`; apply `protect` middleware.  
- Use `catchAsync` wrapper and `ApiResponseHandler` for consistent responses.

## Testing Hooks

- Expose repository helpers to create fixtures for tests.  
- Provide sample fixtures for job creation and assignment flows.

---

## Example: `jobsService.create` (pseudocode)

1. Validate input (Zod)  
2. Verify employer exists and has permissions  
3. Insert job row via repository  
4. Return DTO to controller

---

## Deployment Notes

- Add DB migration to CI pipeline, ensure migrations run in staging before production.
