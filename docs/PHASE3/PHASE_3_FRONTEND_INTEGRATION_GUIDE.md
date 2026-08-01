# Phase 3 Frontend Integration Guide

This document is the frontend-facing contract for the Phase 3 jobs and assignments APIs. It is intended to be unambiguous and implementation-aware, so the frontend team can build against the backend without guessing.

> Source of truth: this guide reflects the current backend wiring in the repository, not the older draft notes alone.

---

## 1. Base URL and environment

Use the backend base URL below when calling Phase 3 endpoints:

- Local development: http://localhost:5020
- Production: https://linprosoft-backend.onrender.com

All endpoints below are relative to the chosen base URL and are prefixed with /api.

---

## 2. Authentication

All Phase 3 routes below require authentication.

### Accepted auth methods

1. HttpOnly cookie: accessToken (preferred)
2. Legacy cookie: token
3. Authorization header: Bearer <token>

### Frontend note

If you are using Axios or Fetch in a browser environment, make sure cookies are sent:

```ts
import axios from 'axios';

axios.defaults.withCredentials = true;
```

```ts
fetch('/api/jobs', {
  method: 'GET',
  credentials: 'include',
});
```

If the token is stored in memory instead of cookies, send it as:

```ts
headers: {
  Authorization: `Bearer ${token}`,
}
```

---

## 3. Shared response format

All successful responses follow this envelope:

```json
{
  "success": true,
  "message": "Success message",
  "data": { "...": "..." },
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

Creation endpoints return HTTP 201.

### Error response shape

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human readable message",
  "statusCode": 400,
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

### Validation errors

Validation failures return HTTP 400 and include field-level details:

```json
{
  "success": false,
  "error": "validation_error",
  "message": "Validation failed",
  "errors": [
    { "field": "title", "message": "Required" }
  ],
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

### Pagination shape

List endpoints return paginated data in the following shape:

```json
{
  "success": true,
  "message": "Jobs retrieved",
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 0
  },
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

---

## 4. Payload conventions

### Request body naming

Frontend clients should send camelCase fields, for example:

```json
{
  "title": "React Developer",
  "skillId": 12,
  "budget": 150000,
  "currency": "NGN",
  "durationDays": 14,
  "location": "Remote",
  "visibility": "public"
}
```

The backend maps camelCase input to snake_case internally before writing to the database.

### Response field naming

Successful responses use camelCase DTO-style fields such as:

- employerId
- skillId
- durationDays
- createdAt
- updatedAt

---

## 5. Jobs module

Base path: /api/jobs

### 5.1 Create job

Method: POST /api/jobs

Auth: Required. Employer role expected.

Request body:

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

Accepted fields:

- title: required string
- description: required string
- skillId: optional positive integer
- budget: optional positive number
- currency: optional 3-letter string
- durationDays: optional positive integer
- location: optional string
- visibility: optional `public` or `private`

Success response (201):

```json
{
  "success": true,
  "message": "Job created",
  "data": {
    "id": 123,
    "employerId": 45,
    "title": "React Developer - 2 week contract",
    "status": "draft",
    "createdAt": "2026-04-27T12:00:00.000Z"
  },
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

### 5.2 List jobs

Method: GET /api/jobs

Auth: Required.

Query parameters:

- skillId: optional positive integer
- location: optional string (partial match)
- status: optional string
- page: optional positive integer, default 1
- limit: optional positive integer, default 20, max 100

Example:

```http
GET /api/jobs?skillId=12&location=Remote&page=1&limit=20
```

Success response:

```json
{
  "success": true,
  "message": "Jobs retrieved",
  "data": {
    "items": [
      {
        "id": 123,
        "employerId": 45,
        "title": "React Developer",
        "description": "Build UI components",
        "skillId": 12,
        "budget": 150000,
        "currency": "NGN",
        "durationDays": 14,
        "location": "Remote",
        "status": "draft",
        "visibility": "public",
        "createdAt": "2026-04-27T12:00:00.000Z",
        "updatedAt": "2026-04-27T12:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

### 5.3 Get job details

Method: GET /api/jobs/:id

Auth: Required.

Example:

```http
GET /api/jobs/123
```

### 5.3b Get jobs created by the logged-in employer

Method: GET /api/jobs/me

Auth: Required. Intended for employer dashboard screens.

This endpoint returns only the jobs created by the authenticated employer, scoped to that employer’s account.

Query parameters:

- skillId: optional positive integer
- location: optional string (partial match)
- status: optional string
- page: optional positive integer, default 1
- limit: optional positive integer, default 20, max 100

Example:

```http
GET /api/jobs/me?page=1&limit=20
```

Success response:

```json
{
  "success": true,
  "message": "Employer jobs retrieved",
  "data": {
    "items": [
      {
        "id": 123,
        "employerId": 45,
        "title": "React Developer",
        "description": "Build UI components",
        "skillId": 12,
        "budget": 150000,
        "currency": "NGN",
        "durationDays": 14,
        "location": "Remote",
        "status": "draft",
        "visibility": "public",
        "createdAt": "2026-04-27T12:00:00.000Z",
        "updatedAt": "2026-04-27T12:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

Success response:

```json
{
  "success": true,
  "message": "Job details retrieved",
  "data": {
    "id": 123,
    "employerId": 45,
    "title": "React Developer",
    "description": "Build UI components",
    "skillId": 12,
    "budget": 150000,
    "currency": "NGN",
    "durationDays": 14,
    "location": "Remote",
    "status": "draft",
    "visibility": "public",
    "createdAt": "2026-04-27T12:00:00.000Z",
    "updatedAt": "2026-04-27T12:00:00.000Z"
  },
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

### 5.4 Update job

Method: PUT /api/jobs/:id

Auth: Required. Only the employer who created the job may update it.

Request body: partial update is allowed. Any subset of the create fields may be sent.

Example:

```json
{
  "title": "React Developer - updated",
  "status": "posted"
}
```

Success response:

```json
{
  "success": true,
  "message": "Job updated",
  "data": {
    "id": 123,
    "employerId": 45,
    "title": "React Developer - updated",
    "status": "posted"
  },
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

### 5.5 Delete job

Method: DELETE /api/jobs/:id

Auth: Required. Only the employer who created the job may delete it.

Success response:

```json
{
  "success": true,
  "message": "Job deleted",
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

### 5.6 Match job to professionals

Method: GET /api/jobs/:id/matches

Auth: Required.

This endpoint returns professional profiles that match the job by skill.

Success response shape:

```json
{
  "success": true,
  "message": "Job Matched",
  "data": [
    {
      "id": 7,
      "userId": 15,
      "avgRating": 4.8
    }
  ],
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

---

## 6. Assignments module

Base path: /api/assignments

### 6.1 Create assignment

Method: POST /api/assignments

Auth: Required. Employer role expected.

Request body:

```json
{
  "jobId": 123,
  "professionalId": 7,
  "acceptedBudget": 150000
}
```

Notes:

- jobId is required.
- professionalId is optional in validation but should be supplied by the UI when the employer selects a professional.
- acceptedBudget is optional.

Success response (201):

```json
{
  "success": true,
  "message": "Assignment created",
  "data": {
    "id": 500,
    "jobId": 123,
    "professionalId": 7,
    "employerId": 45,
    "status": "invited",
    "acceptedBudget": 150000
  },
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

### 6.2 Accept assignment

The current backend service contains an assignment acceptance flow, but the route for `/api/assignments/:id/accept` is not currently exposed in the router. Do not build the UI against that route until the backend route is added.

### 6.3 Satisfaction approval and dispute

The current implementation exposes these routes:

- PATCH /api/assignments/:id/approve-satisfaction
- PATCH /api/assignments/:id/dispute-satisfaction

Auth: Required. Employer role expected.

#### Approve satisfaction

Request body:

```json
{}
```

Success response:

```json
{
  "success": true,
  "message": "Assignment satisfaction approved",
  "data": {
    "id": 500,
    "status": "completed"
  },
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

#### Dispute satisfaction

Request body:

```json
{
  "reason": "Work did not meet the agreed scope",
  "notes": "The deliverable was incomplete"
}
```

Success response:

```json
{
  "success": true,
  "message": "Assignment satisfaction disputed",
  "data": {
    "assignment": {
      "id": 500,
      "status": "completed"
    },
    "dispute": {
      "id": 10,
      "reason": "Work did not meet the agreed scope"
    }
  },
  "timestamp": "2026-04-27T12:00:00.000Z"
}
```

### 6.4 Assignment list/get/update/delete routes

Routes for GET /api/assignments, GET /api/assignments/:id, PUT /api/assignments/:id, and DELETE /api/assignments/:id exist, but the current controller implementations return placeholder responses. Treat these as not ready for production UI work until the backend is completed.

---

## 7. Recommended frontend flow

### Employer flow

1. Create a job with POST /api/jobs
2. List jobs with GET /api/jobs
3. Invite a professional with POST /api/assignments
4. Review matches with GET /api/jobs/:id/matches
5. Approve or dispute satisfaction with the patch endpoints above

### Professional flow

1. Browse jobs with GET /api/jobs
2. Wait for an assignment invitation from the employer
3. Accept the assignment once the backend route is exposed
4. Track assignment status from the assignment detail endpoints once implemented

---

## 8. Frontend implementation example

```ts
import axios from 'axios';

axios.defaults.withCredentials = true;

export async function createJob(payload: {
  title: string;
  description: string;
  skillId?: number;
  budget?: number;
  currency?: string;
  durationDays?: number;
  location?: string;
  visibility?: 'public' | 'private';
}) {
  const response = await axios.post('/api/jobs', payload);
  return response.data;
}

export async function listJobs(params?: {
  skillId?: number;
  location?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const response = await axios.get('/api/jobs', { params });
  return response.data;
}

export async function listMyJobs(params?: {
  skillId?: number;
  location?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const response = await axios.get('/api/jobs/me', { params });
  return response.data;
}
```

---

## 9. Important caveats for the UI team

- Do not assume that every Phase 3 draft endpoint is already fully implemented.
- The current backend strongly supports job creation/listing/detail/update/delete and assignment creation plus satisfaction approval/dispute.
- The acceptance/rejection/start/complete/cancel assignment workflow described in older Phase 3 docs is not yet fully exposed in the router and should be treated as pending backend work.
- Always handle 401, 403, 400, and 404 responses explicitly in the UI.
