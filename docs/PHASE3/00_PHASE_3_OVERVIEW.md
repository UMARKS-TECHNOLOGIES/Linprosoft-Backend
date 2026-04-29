# Linkprosoft Backend - Phase 3: Executive Summary

**Version:** 1.0  
**Date:** April 27, 2026  
**Status:** Draft — Ready for Implementation  
**Timeline:** 3 weeks (Phase 3)

---

## Phase 3 Overview

Phase 3 implements the Job Posting and Assignment workflows that connect employers with professionals. This phase builds on Phase 1 (authentication) and Phase 2 (profiles, skills, search) to enable employers to post jobs, invite professionals, accept assignments, manage lifecycle status, and track assignment history.

### Strategic Goals

1. Enable employers to create, update, and manage job postings.
2. Implement a robust assignment workflow (invite → accept/reject → in_progress → complete → cancel).
3. Provide employer-facing and professional-facing views for matches and assignments.
4. Ensure secure, auditable state transitions and ownership checks.
5. Deliver integration tests and fixtures for key happy-path and edge-case flows.

---

## What's Being Built

### New Entities (Database Tables)

```
job_postings  ← Jobs posted by employers
  ├─ employer_id (FK users.id)
  ├─ skill_id (FK skills.id)
  ├─ title
  ├─ description
  ├─ budget (decimal)
  ├─ currency
  ├─ duration_days
  ├─ location
  ├─ status (draft|posted|in_progress|completed|cancelled)
  ├─ visibility (public|private)
  ├─ created_at
  └─ updated_at

job_assignments  ← Assignment/invite records
  ├─ job_id (FK job_postings.id)
  ├─ professional_id (FK professional_profiles.id)
  ├─ employer_id (FK users.id)
  ├─ assigned_at
  ├─ started_at
  ├─ completed_at
  ├─ status (invited|accepted|rejected|in_progress|completed|cancelled)
  ├─ accepted_budget
  └─ updated_at
```

### New API Endpoints (focused set)

```
Jobs:
  POST   /api/jobs                 (create job posting)
  GET    /api/jobs                 (list jobs with filters)
  GET    /api/jobs/:id             (get job details)
  PUT    /api/jobs/:id             (update job posting)
  DELETE /api/jobs/:id             (soft-delete job posting)

Assignments:
  POST   /api/assignments          (invite professional / create assignment)
  GET    /api/assignments/:id      (get assignment details)
  PUT    /api/assignments/:id/accept   (professional accepts)
  PUT    /api/assignments/:id/reject   (professional rejects)
  PUT    /api/assignments/:id/start    (mark in_progress)
  PUT    /api/assignments/:id/complete (mark completed)
  PUT    /api/assignments/:id/cancel   (cancel assignment)

Matches:
  GET    /api/jobs/:id/matches     (list suitable professionals)
  GET    /api/professionals/:id/jobs (list jobs matched to professional)
```

Auth: All protected endpoints require `protect` middleware; role checks apply where appropriate (employer vs professional).

---

## Business Rules & State Transitions

- A job in `draft` may be edited or deleted only by the employer who created it.
- When an employer posts a job (`posted`), the system may surface matches from professionals with appropriate skills.
- An assignment starts as `invited`; only the invited professional may `accept` or `reject`.
- Accepting an assignment sets `status = accepted` and may record `accepted_budget`.
- Only the employer or assigned professional may trigger `start`, `complete`, or `cancel` actions and only when prior-state checks pass.
- Completed assignments are immutable except for administrative corrections.

---

## Search & Matching

Leverage Phase 2 skill-based search to produce candidate lists for a job posting. Matching considers:

- Required skill(s) and proficiency (primary skills preferred)
- Location (string matching for now)
- Hourly rate / budget compatibility
- Availability status

Matches are returned with relevance scoring (rating, recent activity, profile completeness).

---

## Architecture Highlights

Follow the existing layered architecture:

```
Controller → Validation (Zod) → Service → Repository → Database
```

Module layout for `jobs` and `assignments` mirrors Phase 2 conventions:

```
src/modules/jobs/
  - jobsRoutes.ts
  - jobsController.ts
  - jobsService.ts
  - jobsRepository.ts
  - jobsValidation.ts

src/modules/assignments/
  - assignmentsRoutes.ts
  - assignmentsController.ts
  - assignmentsService.ts
  - assignmentsRepository.ts
  - assignmentsValidation.ts
```

Key implementation notes:

- Use parameterized queries only (pg pool).
- Convert DB snake_case rows to camelCase DTOs before returning to controllers.
- Wrap async handlers with `catchAsync` and use `AppError` for operational errors.
- Enforce ownership checks in services (e.g., only employer can update their job).

---

## Development Process (High-level)

Week 1 — Core Implementation
- Day 1: DB migrations for `job_postings` and `job_assignments`; TypeScript types
- Day 2: Validation schemas and repository prototypes
- Day 3: Service layer and business rules implementation
- Day 4: Controllers, routes, and basic integration tests
- Day 5: Role checks, ownership validations, and test fixes

Week 2 — Matching & Edge Cases
- Implement `/jobs/:id/matches` and refine ranking
- Add pagination, sorting, and filters to job list
- Add tests for invite/accept/reject flows and invalid transitions

Week 3 — Hardening & Documentation
- Finalize docs and Thunder Client collection
- Security review and rate limiting for job endpoints
- Integration tests and test coverage targets

---

## Success Criteria

1. Jobs CRUD implemented and secured with RBAC.  
2. Assignment lifecycle implemented with enforced state transitions and audit fields.  
3. Integration tests covering core flows (create job, invite, accept, start, complete, cancel) with >= 80% coverage for new modules.  
4. Thunder Client collection imports successfully and supports guided manual testing.  
5. Documentation parity with Phase 2 structure.

---

## Acceptance Checklist

- [ ] DB migrations added: `job_postings`, `job_assignments`  
- [ ] Repositories implemented and tested  
- [ ] Services implemented with ownership and state checks  
- [ ] Controllers and routes added and registered in `app.ts`  
- [ ] Integration tests for happy and edge cases  
- [ ] Docs and Thunder Client collection published under `docs/PHASE3/`

---

## Next Steps

1. Create skeleton Phase 3 docs and API reference (done by this task).  
2. Start DB migration and repository implementation for `job_postings` and `job_assignments`.  
3. Implement services and controllers; run tests iteratively.  
