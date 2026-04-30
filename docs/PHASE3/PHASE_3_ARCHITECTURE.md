# Phase 3 Architecture

**Version:** 1.0  
**Date:** April 27, 2026  
**Status:** Draft

---

## Purpose

Describe architecture changes required to support job postings and assignment workflows. Include ER updates, sequence diagrams for assignment lifecycle, and module interactions.

## ER Diagram (High level)

```
users
  └─ 1:M → job_postings

professional_profiles
  └─ 1:M → job_assignments

job_postings
  └─ 1:M → job_assignments
```

## Sequence: Invite → Accept → Start → Complete

1. Employer creates job (POST /api/jobs)  
2. Employer invites professional (POST /api/assignments)  
3. System creates `job_assignments` record with `status=invited`  
4. Professional accepts (PUT /api/assignments/:id/accept) → `status=accepted`  
5. Employer or professional starts work (PUT .../start) → `status=in_progress`  
6. Mark complete (PUT .../complete) → `status=completed`

## Data Flow & Interactions

- Controllers validate incoming requests (Zod) and call Services.  
- Services enforce business rules and call Repositories.  
- Repositories execute parameterized SQL via `pool.query()`.

## Module Mapping

- `src/modules/jobs/*` — models, repository, service, controller, routes  
- `src/modules/assignments/*` — same layout  
- `src/modules/search/*` — reused for matches endpoint

--- 

## Performance & Indexing

- Index `job_postings(skill_id)`, `job_postings(employer_id)`, `job_assignments(job_id)`, `job_assignments(professional_id)`.
- Consider materialized views for heavy match queries if performance degrades.

---

## Security Considerations

- Enforce ownership/role checks in Services.  
- Rate-limit job creation and invitation endpoints.  
- Audit logs for state transitions.

---

## Mapping & Conventions (important)

- API DTOs use camelCase (e.g., `skillId`, `durationDays`). Repositories use DB rows in snake_case (e.g., `skill_id`, `duration_days`). Map at the service boundary.
- Validation uses Zod and should validate DTO shapes; mapping happens after validation and before repository calls.
- Use `deleted_at` (soft delete) rather than hard deletes for jobs to preserve audit history.

## Operational Notes

- Index `job_postings(skill_id)`, `job_postings(status)`, `job_assignments(job_id)`, and `job_assignments(status)` for common filters and joins.
- When listing jobs with joins to `professional_profiles` for matches, prefer LIMIT/OFFSET pagination and pre-filter by `skill_id` to reduce join cardinality.
- Tests must set JWT env vars (`JWT_SECRET`) and run migrations in test DB before integration tests that depend on schema changes.

---

## Mapping & Conventions (important)

- API DTOs use camelCase (e.g., `skillId`, `durationDays`). Repositories operate on DB rows in snake_case (e.g., `skill_id`, `duration_days`). Map at the service boundary.
- Validation uses Zod and should validate DTO shapes; mapping happens after validation and before repository calls.
- Use `deleted_at` (soft delete) rather than hard deletes for jobs to preserve audit history.

## Performance Considerations

- Index `job_postings(skill_id)`, `job_postings(status)`, `job_assignments(job_id)`, and `job_assignments(status)` for common filters and joins.
- When listing jobs with joins to `professional_profiles` for matches, prefer LIMIT/OFFSET pagination and pre-filter by `skill_id` to reduce join cardinality.

## Security

- Protect endpoints with `protect` middleware (JWT in HTTP-only cookie). Tests must set `JWT_SECRET` in their environment.
- Enforce role checks (employer vs professional) in service layer; do not trust client-provided role flags.
