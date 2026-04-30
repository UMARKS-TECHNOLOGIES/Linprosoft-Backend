# Phase 3 API Endpoints (Jobs & Assignments)

**Version:** 1.0  
**Date:** April 27, 2026  
**Status:** Draft

---

This document lists the endpoints introduced in Phase 3. Each endpoint should include: description, auth requirements, request schema, success response, and possible errors.

Template (use for each endpoint):

```
### METHOD /api/path

Description

Auth required: Yes / No

Request body
```json
{ /* schema */ }
```

Success response
```json
{ /* example */ }
```

Errors
- 400 Validation
- 401 Unauthorized
- 403 Forbidden
- 404 Not found
```

---

## Jobs

- `POST /api/jobs` — Create a job posting  
  
### POST /api/jobs

Description: Create a job posting (employer only)

Auth required: Yes (employer)

Request body example
```json
{
	"title": "React Developer - 2 week contract",
	"description": "Build UI components",
	"skillId": 12,
	"budget": 150000,
	"currency": "NGN",
	"durationDays": 14,
	"location": "Remote",
	"visibility": "public"
}
```

Success response (201)
```json
{
	"success": true,
	"data": {
		"id": 123,
		"employerId": 45,
		"title": "React Developer - 2 week contract",
		"status": "draft",
		"createdAt": "2026-04-27T12:00:00.000Z"
	}
}
```

Errors
- 400 Validation
- 401 Unauthorized
- 403 Forbidden (not an employer)
- 422 Business rule (e.g., missing skill)

- `GET /api/jobs` — List jobs with filters (skill, location, employer, status, pagination)  
- `GET /api/jobs/:id` — Get job details  
- `PUT /api/jobs/:id` — Update job posting (employer only)  
- `DELETE /api/jobs/:id` — Soft-delete job posting (employer only)
 
## Assignments

- `POST /api/assignments` — Invite professional / create assignment  
- `GET /api/assignments/:id` — Get assignment details  
- `PUT /api/assignments/:id/accept` — Professional accepts assignment  
- `PUT /api/assignments/:id/reject` — Professional rejects assignment  
- `PUT /api/assignments/:id/start` — Mark assignment in_progress  
- `PUT /api/assignments/:id/complete` — Mark assignment completed  
- `PUT /api/assignments/:id/cancel` — Cancel assignment

## Matches

- `GET /api/jobs/:id/matches` — List professionals matched to job (uses Phase 2 search service)

---

## Notes

- All request bodies use camelCase DTOs. Services must map DTO fields to DB snake_case before repository calls.
- Pagination uses `page` and `limit` query params. Responses include `meta` (page, limit, total, pages).
- Use `protect` middleware on all endpoints that modify state. Role checks happen in services.
