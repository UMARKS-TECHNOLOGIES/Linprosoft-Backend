# Phase 2 Integration Guide

This guide provides frontend engineers with the necessary details to integrate with the **Phase 2** backend modules: **Profile, Skills, Certification, Portfolio, and Search**.  
All endpoints are prefixed with `/api` and use JSON for request/response bodies. Authentication is primarily via HTTP‑only cookies (`accessToken` or `token`); the `Authorization: Bearer <token>` header is also accepted for non‑browser clients.

---

## Base URL

```
https://linprosoft-backend.onrender.com   // or http://localhost:5000 in development
```

All routes listed below are relative to this base URL.

---

## Authentication

- **Protected routes** require a valid JWT. The middleware looks for:
  1. Cookie `accessToken` (preferred) or legacy `token`.
  2. `Authorization: Bearer <token>` header.
- On successful login (`POST /api/auth/login`) the server sets an `accessToken` cookie (HttpOnly, Secure, SameSite=Strict).
- Protected endpoints return `401` if no/invalid token is provided.
- Some routes (e.g., public profile reads) do **not** require authentication.

---

## Common Response Format

All successful responses follow:

```json
{
  "success": true,
  "message": "Success message",
  "data": { /* payload */ },
  "timestamp": "ISO 8601 timestamp"
}
```

- **Creation** endpoints (`POST`) return HTTP 201 with the same shape.
- **Deletion** endpoints (`DELETE`) may return `204 No Content` (no body).
- **Pagination** endpoints return a paginated envelope:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "items": [...],
    "total": 123,
    "page": 1,
    "limit": 20,
    "totalPages": 7
  },
  "timestamp": "..."
}
```

Error responses (validation, authentication, server errors) follow:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human readable message",
  "statusCode": 4xx/5xx,
  "timestamp": "..."
}
```

Validation errors (400) include an `errors` array with field‑specific messages.

---

## Rate Limiting

- **General**: 100 requests / 15 min per IP (applies to all routes).
- **Auth‑related** (login, OTP, etc.): stricter limits defined in `authRoutes.ts`.
- **Search**: 50 requests / 15 min per IP.
- **Profile / Skill / Certification / Portfolio**: 30 requests / 15 min per IP.

Exceeding limits returns `429 Too Many Requests`.

---

# Module: Profile

Handles a professional’s core profile (bio, hourly rate, availability, etc.).

**Base path**: `/api/profiles`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/` | **Required** | Create the logged‑in user’s profile. |
| `GET` | `/me` | **Required** | Retrieve the logged‑in user’s own profile. |
| `PUT` | `/me` | **Required** | Update the logged‑in user’s profile (partial‑update semantics). |
| `DELETE` | `/me` | **Required** | Delete the logged‑in user’s profile. |
| `GET` | `/:userId` | Optional | Public profile summary for any user. |
| `GET` | `/:userId/detailed` | Optional | Public profile with related Phase‑2 data (skills, certifications, portfolio). |

### Request Bodies

#### Create Profile (`POST /`)
```json
{
  "hourlyRate": 75,            // number (0‑1,000,000), optional
  "bio": "Full‑stack developer…", // string ≤2000 chars, optional
  "availabilityStatus": "available", // "available"\|"unavailable"\|"away", optional
  "responseTimeHours": 24      // integer 1‑720, optional
}
```
At least one field must be supplied (validated by `updateProfileSchema` semantics for updates; for create all fields optional).

#### Update Profile (`PUT /me`)
Same shape as create; **at least one field** must be present.

### Path Parameters

- `userId`: positive integer (the target professional’s ID).

### Success Responses

- `POST /` → `201 Created`  
  `{ success:true, message:"Professional profile created successfully", data:{ profile: <ProfileObject> }, timestamp:… }`
- `GET /me` / `GET /:userId` / `GET /:userId/detailed` → `200 OK` with `data:{ profile: … }`
- `PUT /me` → `200 OK` with updated profile.
- `DELETE /me` → `204 No Content`.

---

# Module: Skill

Manages the link between a professional and skills from the global skill catalogue.

**Base path**: `/api/skills`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | Optional | List paginated catalogue of all skills (supports `limit`, `offset`). |
| `GET` | `/:userId/skills` | Optional | Get a specific user’s skill list (with proficiency, years, primary flag). |
| `POST` | `/me/skills` | **Required** | Add a skill to the logged‑in user’s profile. |
| `PUT` | `/me/skills/:skillId` | **Required** | Update proficiency / years / primary flag for a user‑skill. |
| `DELETE` | `/me/skills/:skillId` | **Required** | Remove a skill from the logged‑in user’s profile. |

### Query Parameters (GET /)
- `limit`: 1‑100 (default 20)
- `offset`: ≥0 (default 0)

### Request Bodies

#### Add Skill (`POST /me/skills`)
```json
{
  "skillId": 42,                         // required, positive int
  "proficiencyLevel": "intermediate",    // "beginner"\|"intermediate"\|"expert", optional
  "yearsOfExperience": 3,                // 0‑80, optional
  "isPrimary": true                      // optional, default false
}
```

#### Update Skill (`PUT /me/skills/:skillId`)
```json
{
  "proficiencyLevel": "expert",
  "yearsOfExperience": 5,
  "isPrimary": false
}
```
*At least one field must be present.*

### Path Parameters
- `userId`: positive integer (target user).
- `skillId`: positive integer (skill catalogue ID).

### Success Responses
- `GET /` → `200` with `{ skills: […] , pagination … }` (wrapped in standard success envelope).
- `GET /:userId/skills` → `200` with `{ skills: […] }`.
- `POST /me/skills` → `201 Created` with `{ userSkill: … }`.
- `PUT /me/skills/:skillId` → `200 OK` with updated user‑skill object.
- `DELETE /me/skills/:skillId` → `204 No Content`.

---

# Module: Certification

Manages certifications attached to a professional’s profile.

**Base path**: `/api/profiles` (certification routes are mounted under this path)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/:userId/certifications` | Optional | List a user’s certifications. |
| `POST` | `/me/certifications` | **Required** | Create a new certification for the logged‑in user. |
| `PUT` | `/me/certifications/:certificationId` | **Required** | Update an existing certification. |
| `DELETE` | `/me/certifications/:certificationId` | **Required** | Delete a certification. |

### Request Bodies

#### Create Certification (`POST /me/certifications`)
```json
{
  "title": "AWS Certified Solutions Architect",   // required, 1‑255 chars
  "issuer": "Amazon Web Services",               // optional, ≤255
  "issueDate": "2023-06-15",                     // optional, ISO date string
  "expiryDate": "2026-06-15",                    // optional, ISO date string
  "credentialUrl": "https://www.credly.com/…"   // optional, valid URL, ≤1000 chars
}
```

#### Update Certification (`PUT /me/certifications/:certificationId`)
Same fields as create, **partial** allowed but at least one field must be present.

### Path Parameters
- `userId`: positive integer (target user).
- `certificationId`: positive integer (certification ID).

### Success Responses
- `GET /:userId/certifications` → `200` with `{ certifications: […] }`.
- `POST /me/certifications` → `201 Created` with `{ certification: … }`.
- `PUT /me/certifications/:certificationId` → `200 OK` with updated certification.
- `DELETE /me/certifications/:certificationId` → `204 No Content`.

---

# Module: Portfolio

Manages portfolio items (projects, case studies, media) for a professional.

**Base path**: `/api/profiles` (portfolio routes are mounted under this path)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/:userId/portfolio` | Optional | List a user’s portfolio items. |
| `POST` | `/me/portfolio` | **Required** | Add a new portfolio item for the logged‑in user. |
| `PUT` | `/me/portfolio/:portfolioItemId` | **Required** | Update an existing portfolio item. |
| `DELETE` | `/me/portfolio/:portfolioItemId` | **Required** | Delete a portfolio item. |

### Request Bodies

#### Create Portfolio Item (`POST /me/portfolio`)
```json
{
  "title": "Project X – UI Redesign",          // required, 1‑255 chars
  "description": "Redesigned the user interface…", // optional, ≤5000 chars
  "imageUrl": "https://example.com/img.png",   // optional, valid URL, ≤1000
  "linkUrl": "https://example.com/project"     // optional, valid URL, ≤1000
}
```

#### Update Portfolio Item (`PUT /me/portfolio/:portfolioItemId`)
Same fields as create; **at least one** field must be present.

### Path Parameters
- `userId`: positive integer (target user).
- `portfolioItemId`: positive integer (portfolio item ID).

### Success Responses
- `GET /:userId/portfolio` → `200` with `{ portfolioItems: […] }`.
- `POST /me/portfolio` → `201 Created` with `{ portfolioItem: … }`.
- `PUT /me/portfolio/:portfolioItemId` → `200 OK` with updated item.
- `DELETE /me/portfolio/:portfolioItemId` → `204 No Content`.

---

# Module: Search

Provides search and discovery capabilities across professionals, filters, and skill autocomplete.

**Base path**: `/api/search`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/professionals` | Optional | Search professionals with filters (skills, rating, rate, availability, sorting, pagination). |
| `GET` | `/filters` | Optional | Returns static filter options (e.g., availability statuses, rating ranges). |
| `GET` | `/skills` | Optional | Autocomplete skill names based on query `q`. |

### Query Parameters

#### Search Professionals (`GET /search/professionals`)
| Parameter | Type | Description |
|-----------|------|-------------|
| `skills` | number[] or comma‑separated | List of skill IDs to filter by (optional). |
| `minRating` | number (0‑5) | Minimum average rating (optional). |
| `maxRating` | number (0‑5) | Maximum average rating (optional). |
| `minRate` | number ≥0 | Minimum hourly rate (optional). |
| `maxRate` | number ≥0 | Maximum hourly rate (optional). |
| `availabilityStatus` | `"available"\|"unavailable"\|"away"` | Filter by availability (optional). |
| `sortBy` | `"rating_desc"\|"rate_asc"\|"recent_desc"` | Default `rating_desc`. |
| `page` | integer ≥1 | Page number (default 1). |
| `limit` | integer 1‑100 | Items per page (default 20). |

*Validation ensures `minRate ≤ maxRate` and `minRating ≤ maxRating`.*

#### Skill Autocomplete (`GET /search/skills`)
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string (1‑100 chars) | Search term (required). |
| `limit` | integer 1‑50 (default 10) | Max results to return. |

### Success Responses
- `GET /professionals` → `200` with paginated envelope containing `items: [ProfessionalSummary…]`.
- `GET /filters` → `200` with `{ availabilityStatuses: […], ratingRanges: […], … }`.
- `GET /skills` → `200` with `{ skills: [{ id, name }, …] }`.

---

## Error Handling Overview

| Status | Meaning | Typical Response |
|--------|---------|------------------|
| 400 | Validation error (missing/invalid fields) | `{"success":false,"error":"validation_error","message":"…","errors":[{"field":"hourlyRate","message":"must be a positive number"},…],"timestamp":…}` |
| 401 | Unauthenticated | `{"success":false,"error":"authentication_error","message":"Please login to access this resource","statusCode":401,"timestamp":…}` |
| 403 | Forbidden (insufficient role) | `{"success":false,"error":"authorization_error","message":"Not authorized. Required role: professional or employer","statusCode":403,"timestamp":…}` |
| 404 | Resource not found | `{"success":false,"error":"not_found","message":"Profile not found","statusCode":404,"timestamp":…}` |
| 429 | Rate limit exceeded | `{"success":false,"error":"rate_limit_error","message":"Too many requests, please try again later","statusCode":429,"timestamp":…}` |
| 500 | Unexpected server error | `{"success":false,"error":"internal_server_error","message":"An unexpected error occurred","statusCode":500,"timestamp":…}` (stack trace included in development). |

All error shapes adhere to `ApiErrorResponse` or `ApiValidationErrorResponse` as defined in `src/types/apiTypes.ts`.

---

## Tips & Gotchas

1. **Authentication** – Store the `accessToken` cookie automatically sent by the backend after login. For mobile or non‑browser clients, extract the token from the `Set‑Cookie` header or use the `Authorization` header on subsequent requests.
2. **ID Types** – All IDs (`userId`, `skillId`, `certificationId`, `portfolioItemId`) are **positive integers** sent as numbers in JSON (not strings).
3. **Empty Updates** – Update endpoints (`PUT /me`, `/me/skills/:skillId`, etc.) require **at least one field**; an empty body results in a 400 validation error.
4. **Pagination** – When paginating, always check `totalPages` to know when to stop requesting further pages.
5. **Date Strings** – Dates for `issueDate`, `expiryDate` must be ISO 8601 `YYYY‑MM‑DD` strings.
6. **URL Validation** – Fields like `credentialUrl`, `imageUrl`, `linkUrl` must be valid absolute URLs; relative URLs are rejected.
7. **Error Propagation** – If a downstream service (e.g., database) fails, you will receive a 500 with `error: "internal_server_error"`; retry logic should be idempotent where safe.
8. **Testing** – Use the provided Postman collection (located in `postman/` folder) or the automated test suite (`npm test`) to verify endpoints.

---

**End of Guide**  
For any questions, refer to the source code under `src/modules/` or reach out to the backend team.