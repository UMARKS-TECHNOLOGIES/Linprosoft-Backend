# Phase 3 Implementation Guide

**Version:** 1.0  
**Date:** April 27, 2026  
**Status:** Draft

---

## Overview

This guide outlines concrete steps to implement `jobs` and `assignments` modules following project conventions (Controller → Service → Repository). Use Phase 2 modules as reference implementations.

## Database Migrations

- Add migration SQL for `job_postings` and `job_assignments` (include `deleted_at` for soft deletes as needed).

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
