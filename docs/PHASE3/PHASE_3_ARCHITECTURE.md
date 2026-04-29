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
