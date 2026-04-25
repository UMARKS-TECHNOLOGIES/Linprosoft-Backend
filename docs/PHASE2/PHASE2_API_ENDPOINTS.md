# Phase 2 API Endpoints

Frontend integration contract for Linkprosoft Phase 2.

This document covers the current Phase 2 backend surface area that builds on Phase 1 auth:

- professional profiles
- profile skills
- certifications
- portfolio items
- professional search

This file is intended to be the source of truth for frontend integration at the current Phase 2 state of the backend as of April 25, 2026.

## Prerequisite

Phase 2 uses the same authentication model documented in [AUTH_API_ENDPOINTS.md](../PHASE1/AUTH_API_ENDPOINTS.md).

Important:

- All authenticated browser requests must use `credentials: 'include'` or `withCredentials: true`.
- A valid Phase 1 auth session is required for all `POST`, `PUT`, and `DELETE` Phase 2 endpoints.
- Most write endpoints also require that the authenticated user already has a professional profile.

## Base URLs

```text
Backend API base: http://localhost:5020
Phase 2 routes:    /api/profiles
                   /api/skills
                   /api/search
```

Mounted route groups:

- profiles: `/api/profiles`
- skills: `/api/skills`
- certifications: mounted under `/api/profiles`
- portfolio: mounted under `/api/profiles`
- search: `/api/search`

## Standard Response Shapes

### Success response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

### Error response

```json
{
  "success": false,
  "error": "validation_error",
  "message": "At least one field is required for update",
  "statusCode": 400,
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

### Delete response

Delete endpoints return:

- status `204 No Content`
- empty body

### Validation behavior

Phase 2 validation errors are returned as a single `message` string.

Do not assume:

- `errors[]`
- field-level validation objects

### Comprehensive Validation Error Examples

Common validation messages you may encounter:

**Field validation:**
- `"hourlyRate must be a positive number"`
- `"hourlyRate cannot exceed 1000000"`
- `"bio cannot exceed 2000 characters"`
- `"responseTimeHours must be an integer between 1 and 720"`
- `"availabilityStatus must be one of: available, unavailable, away"`

**Logical validation:**
- `"At least one field is required for update"`
- `"minRate cannot be greater than maxRate"`
- `"minRating cannot be greater than maxRating"`
- `"expiryDate must be after issueDate"`

**State validation:**
- `"Empty request body is not allowed"`
- `"Invalid JSON in request body"`

**Relation validation:**
- `"This skill is already added to your profile"`
- `"The skill does not exist in the catalog"`
- `"Invalid skill ID format"`

---

## Common Types

### Public user summary

```json
{
  "id": 123,
  "firstName": "John",
  "lastName": "Doe",
  "location": "Lagos"
}
```

### Professional profile

```json
{
  "id": 45,
  "userId": 123,
  "hourlyRate": 8000,
  "bio": "Senior React developer",
  "availabilityStatus": "available",
  "responseTimeHours": 4,
  "totalHoursWorked": 0,
  "avgRating": 0,
  "totalReviews": 0,
  "createdAt": "2026-04-25T12:00:00.000Z",
  "updatedAt": "2026-04-25T12:00:00.000Z"
}
```

### Profile skill

```json
{
  "skillId": 3,
  "name": "React",
  "category": "Frontend",
  "description": "React library",
  "proficiencyLevel": "expert",
  "yearsOfExperience": 7,
  "isPrimary": true
}
```

### Certification

```json
{
  "id": 10,
  "professionalId": 45,
  "title": "AWS Certified Developer",
  "issuer": "Amazon Web Services",
  "issueDate": "2025-01-10T00:00:00.000Z",
  "expiryDate": "2028-01-10T00:00:00.000Z",
  "credentialUrl": "https://example.com/cert/123",
  "createdAt": "2026-04-25T12:00:00.000Z"
}
```

### Portfolio item

```json
{
  "id": 20,
  "professionalId": 45,
  "title": "E-commerce Platform",
  "description": "Full-stack commerce application",
  "imageUrl": "https://example.com/project.png",
  "linkUrl": "https://example.com/project",
  "createdAt": "2026-04-25T12:00:00.000Z"
}
```

### Catalog skill

```json
{
  "id": 3,
  "name": "React",
  "category": "Frontend",
  "description": "React library"
}
```

---

## Profiles

Base path: `/api/profiles`

### POST `/api/profiles`

Create the authenticated user's professional profile.

Auth required: Yes

Additional rules:

- Only users with `userType = professional` can create a profile
- Each user can have at most one profile; creating a second profile returns `409 Conflict`
- This is a prerequisite for all other Phase 2 write operations (skills, certifications, portfolio)

### Request body

All fields are optional on create.

```json
{
  "hourlyRate": 8000,
  "bio": "Senior React developer with product experience",
  "availabilityStatus": "available",
  "responseTimeHours": 4
}
```

### Accepted fields

| Field | Type | Required | Rules |
|---|---|---|---|
| `hourlyRate` | number | No | Positive, max `1000000` |
| `bio` | string | No | Trimmed, max `2000` chars |
| `availabilityStatus` | enum | No | `available`, `unavailable`, `away` |
| `responseTimeHours` | number | No | Integer, min `1`, max `720` |

### Success response

Status: `201 Created`

```json
{
  "success": true,
  "message": "Professional profile created successfully",
  "data": {
    "profile": {
      "id": 45,
      "userId": 123,
      "hourlyRate": 8000,
      "bio": "Senior React developer with product experience",
      "availabilityStatus": "available",
      "responseTimeHours": 4,
      "totalHoursWorked": 0,
      "avgRating": 0,
      "totalReviews": 0,
      "createdAt": "2026-04-25T12:00:00.000Z",
      "updatedAt": "2026-04-25T12:00:00.000Z"
    }
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

### Expected errors

- `401` not authenticated
- `403` authenticated user is not a professional
- `404` user not found
- `409` profile already exists
- `400` validation failure

---

### GET `/api/profiles/me`

Fetch the authenticated user's own profile.

Auth required: Yes

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "profile": {
      "id": 45,
      "userId": 123,
      "hourlyRate": 8000,
      "bio": "Senior React developer",
      "availabilityStatus": "available",
      "responseTimeHours": 4,
      "totalHoursWorked": 0,
      "avgRating": 0,
      "totalReviews": 0,
      "createdAt": "2026-04-25T12:00:00.000Z",
      "updatedAt": "2026-04-25T12:00:00.000Z"
    }
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

### Expected errors

- `401` not authenticated
- `404` profile not found

---

### PUT `/api/profiles/me`

Update the authenticated user's profile.

Auth required: Yes

### Request body

Partial updates are supported, but the request body cannot be empty.

```json
{
  "bio": "Updated bio",
  "availabilityStatus": "away"
}
```

### Expected errors

- `401` not authenticated
- `404` profile not found
- `400` validation failure

Common validation message:

- `At least one field is required for update`

---

### DELETE `/api/profiles/me`

Delete the authenticated user's professional profile.

Auth required: Yes

Status on success: `204 No Content`

Expected errors:

- `401` not authenticated
- `404` profile not found

---

### GET `/api/profiles/:userId`

Fetch a public profile summary for a given user id.

Auth required: No

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "profile": {
      "id": 45,
      "userId": 123,
      "hourlyRate": 8000,
      "bio": "Senior React developer",
      "availabilityStatus": "available",
      "responseTimeHours": 4,
      "totalHoursWorked": 0,
      "avgRating": 0,
      "totalReviews": 0,
      "createdAt": "2026-04-25T12:00:00.000Z",
      "updatedAt": "2026-04-25T12:00:00.000Z",
      "user": {
        "id": 123,
        "firstName": "John",
        "lastName": "Doe",
        "location": "Lagos"
      }
    }
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

Notes:

- Email is not included.
- Password is not included.

### Expected errors

- `400` invalid `userId`
- `404` profile not found

---

### GET `/api/profiles/:userId/detailed`

Fetch a detailed public profile that includes profile basics plus skills, certifications, and portfolio items.

Auth required: No

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "message": "Detailed profile fetched successfully",
  "data": {
    "profile": {
      "id": 45,
      "userId": 123,
      "hourlyRate": 8000,
      "bio": "Senior React developer",
      "availabilityStatus": "available",
      "responseTimeHours": 4,
      "totalHoursWorked": 0,
      "avgRating": 0,
      "totalReviews": 0,
      "createdAt": "2026-04-25T12:00:00.000Z",
      "updatedAt": "2026-04-25T12:00:00.000Z",
      "user": {
        "id": 123,
        "firstName": "John",
        "lastName": "Doe",
        "location": "Lagos"
      },
      "skills": [
        {
          "skillId": 3,
          "name": "React",
          "category": "Frontend",
          "description": "React library",
          "proficiencyLevel": "expert",
          "yearsOfExperience": 7,
          "isPrimary": true
        }
      ],
      "certifications": [
        {
          "id": 10,
          "title": "AWS Certified Developer",
          "issuer": "Amazon Web Services",
          "issueDate": "2025-01-10T00:00:00.000Z",
          "expiryDate": "2028-01-10T00:00:00.000Z",
          "credentialUrl": "https://example.com/cert/123",
          "createdAt": "2026-04-25T12:00:00.000Z"
        }
      ],
      "portfolioItems": [
        {
          "id": 20,
          "title": "E-commerce Platform",
          "description": "Full-stack commerce application",
          "imageUrl": "https://example.com/project.png",
          "linkUrl": "https://example.com/project",
          "createdAt": "2026-04-25T12:00:00.000Z"
        }
      ]
    }
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

Notes:

- `skills`, `certifications`, and `portfolioItems` are empty arrays when no related records exist.

### Expected errors

- `400` invalid `userId`
- `404` profile not found

---

## Skills

Base path: `/api/skills`

### GET `/api/skills`

Fetch the global skill catalog.

Auth required: No

### Query params

| Param | Type | Required | Rules |
|---|---|---|---|
| `limit` | number | No | Integer, min `1`, max `100`, default `20` |
| `offset` | number | No | Integer, min `0`, default `0` |

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "message": "Skills fetched successfully",
  "data": {
    "skills": [
      {
        "id": 3,
        "name": "React",
        "category": "Frontend",
        "description": "React library"
      }
    ],
    "pagination": {
      "total": 120,
      "limit": 20,
      "offset": 0,
      "totalPages": 6
    }
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

### Expected errors

- `400` invalid pagination params

---

### GET `/api/skills/:userId/skills`

Fetch the skills attached to a user's professional profile.

Auth required: No

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "message": "Skills fetched successfully",
  "data": {
    "skills": [
      {
        "skillId": 3,
        "name": "React",
        "category": "Frontend",
        "description": "React library",
        "proficiencyLevel": "expert",
        "yearsOfExperience": 7,
        "isPrimary": true
      }
    ]
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

Notes:

- returns `[]` if the user has a profile but no skills
- returns `404` if the user does not have a profile

---

### POST `/api/skills/me/skills`

Add a catalog skill to the authenticated user's profile.

Auth required: Yes

Requires existing profile: Yes

### Request body

```json
{
  "skillId": 3,
  "proficiencyLevel": "expert",
  "yearsOfExperience": 7,
  "isPrimary": true
}
```

### Accepted fields

| Field | Type | Required | Rules |
|---|---|---|---|
| `skillId` | number | Yes | Positive integer |
| `proficiencyLevel` | enum | No | `beginner`, `intermediate`, `expert`; defaults to `beginner` if not provided |
| `yearsOfExperience` | number | No | Integer, min `0`, max `80`; can be `0` |
| `isPrimary` | boolean | No | Optional; only one skill per profile can be primary |

### Important edge case

If `isPrimary` is set to `true` and the profile already has a primary skill:
- The backend automatically clears the previous primary designation
- Both the new and old skill records remain on the profile (old skill loses primary status)
- No conflict error is returned; the operation succeeds silently

### Success response

Status: `201 Created`

```json
{
  "success": true,
  "message": "Skill added successfully",
  "data": {
    "skill": {
      "skillId": 3,
      "name": "React",
      "category": "Frontend",
      "description": "React library",
      "proficiencyLevel": "expert",
      "yearsOfExperience": 7,
      "isPrimary": true
    }
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

Notes:

- if `isPrimary` is `true`, the backend clears any existing primary skill for that profile first

### Expected errors

- `401` not authenticated
- `404` profile not found
- `404` skill not found
- `409` skill already added to profile
- `400` validation failure

---

### PUT `/api/skills/me/skills/:skillId`

Update one linked profile skill.

Auth required: Yes

Requires existing profile: Yes

### Request body

Partial updates are supported, but the request body cannot be empty.

```json
{
  "proficiencyLevel": "intermediate",
  "yearsOfExperience": 5
}
```

### Expected errors

- `401` not authenticated
- `404` profile not found
- `404` skill not found on profile
- `400` validation failure

Common validation message:

- `At least one field is required for update`

---

### DELETE `/api/skills/me/skills/:skillId`

Remove a skill from the authenticated user's profile.

Auth required: Yes

Requires existing profile: Yes

Status on success: `204 No Content`

Expected errors:

- `401` not authenticated
- `404` profile not found
- `404` skill not found on profile

---

## Certifications

Certifications are mounted under `/api/profiles`, not a standalone `/api/certifications` base path.

### GET `/api/profiles/:userId/certifications`

Fetch certifications for a user's professional profile.

Auth required: No

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "message": "Certifications fetched successfully",
  "data": {
    "certifications": [
      {
        "id": 10,
        "professionalId": 45,
        "title": "AWS Certified Developer",
        "issuer": "Amazon Web Services",
        "issueDate": "2025-01-10T00:00:00.000Z",
        "expiryDate": "2028-01-10T00:00:00.000Z",
        "credentialUrl": "https://example.com/cert/123",
        "createdAt": "2026-04-25T12:00:00.000Z"
      }
    ]
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

Notes:

- returns `[]` if the user has a profile but no certifications
- returns `404` if the user does not have a profile

---

### POST `/api/profiles/me/certifications`

Create a certification for the authenticated user's profile.

Auth required: Yes

Requires existing profile: Yes

### Request body

```json
{
  "title": "AWS Certified Developer",
  "issuer": "Amazon Web Services",
  "issueDate": "2025-01-10",
  "expiryDate": "2028-01-10",
  "credentialUrl": "https://example.com/cert/123"
}
```

### Accepted fields

| Field | Type | Required | Rules |
|---|---|---|---|
| `title` | string | Yes | Trimmed, min `1`, max `255` |
| `issuer` | string | No | Trimmed, max `255` |
| `issueDate` | string | No | Must be valid `YYYY-MM-DD` date string |
| `expiryDate` | string | No | Must be valid `YYYY-MM-DD` date string |
| `credentialUrl` | string | No | Valid URL, max `1000` |

### Success response

Status: `201 Created`

```json
{
  "success": true,
  "message": "Certification added successfully",
  "data": {
    "certification": {
      "id": 10,
      "professionalId": 45,
      "title": "AWS Certified Developer",
      "issuer": "Amazon Web Services",
      "issueDate": "2025-01-10T00:00:00.000Z",
      "expiryDate": "2028-01-10T00:00:00.000Z",
      "credentialUrl": "https://example.com/cert/123",
      "createdAt": "2026-04-25T12:00:00.000Z"
    }
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

### Expected errors

- `401` not authenticated
- `404` profile not found
- `400` validation failure

---

### PUT `/api/profiles/me/certifications/:certificationId`

Update one certification owned by the authenticated user's profile.

Auth required: Yes

Requires existing profile: Yes

### Request body

Partial updates are supported, but the request body cannot be empty.

```json
{
  "expiryDate": "2029-01-10"
}
```

### Expected errors

- `401` not authenticated
- `404` profile not found
- `404` certification not found
- `400` validation failure

Common validation message:

- `At least one field is required for update`

---

### DELETE `/api/profiles/me/certifications/:certificationId`

Delete one certification owned by the authenticated user's profile.

Auth required: Yes

Requires existing profile: Yes

Status on success: `204 No Content`

Expected errors:

- `401` not authenticated
- `404` profile not found
- `404` certification not found

---

## Portfolio

Portfolio endpoints are also mounted under `/api/profiles`.

### GET `/api/profiles/:userId/portfolio`

Fetch portfolio items for a user's professional profile.

Auth required: No

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "message": "Portfolio items fetched successfully",
  "data": {
    "portfolioItems": [
      {
        "id": 20,
        "professionalId": 45,
        "title": "E-commerce Platform",
        "description": "Full-stack commerce application",
        "imageUrl": "https://example.com/project.png",
        "linkUrl": "https://example.com/project",
        "createdAt": "2026-04-25T12:00:00.000Z"
      }
    ]
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

Notes:

- returns `[]` if the user has a profile but no portfolio items
- returns `404` if the user does not have a profile

---

### POST `/api/profiles/me/portfolio`

Create a portfolio item for the authenticated user's profile.

Auth required: Yes

Requires existing profile: Yes

### Request body

```json
{
  "title": "E-commerce Platform",
  "description": "Full-stack commerce application",
  "imageUrl": "https://example.com/project.png",
  "linkUrl": "https://example.com/project"
}
```

### Accepted fields

| Field | Type | Required | Rules |
|---|---|---|---|
| `title` | string | Yes | Trimmed, min `1`, max `255` |
| `description` | string | No | Trimmed, max `5000` |
| `imageUrl` | string | No | Valid URL, max `1000` |
| `linkUrl` | string | No | Valid URL, max `1000` |

### Success response

Status: `201 Created`

```json
{
  "success": true,
  "message": "Portfolio item created successfully",
  "data": {
    "portfolioItem": {
      "id": 20,
      "professionalId": 45,
      "title": "E-commerce Platform",
      "description": "Full-stack commerce application",
      "imageUrl": "https://example.com/project.png",
      "linkUrl": "https://example.com/project",
      "createdAt": "2026-04-25T12:00:00.000Z"
    }
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

### Expected errors

- `401` not authenticated
- `404` profile not found
- `400` validation failure

---

### PUT `/api/profiles/me/portfolio/:portfolioItemId`

Update one portfolio item owned by the authenticated user's profile.

Auth required: Yes

Requires existing profile: Yes

### Request body

Partial updates are supported, but the request body cannot be empty.

```json
{
  "description": "Updated description",
  "linkUrl": "https://example.com/new-link"
}
```

### Expected errors

- `401` not authenticated
- `404` profile not found
- `404` portfolio item not found
- `400` validation failure

Common validation message:

- `At least one field is required for update`

---

### DELETE `/api/profiles/me/portfolio/:portfolioItemId`

Delete one portfolio item owned by the authenticated user's profile.

Auth required: Yes

Requires existing profile: Yes

Status on success: `204 No Content`

Expected errors:

- `401` not authenticated
- `404` profile not found
- `404` portfolio item not found

---

## Search

Base path: `/api/search`

Search endpoints are public.

### GET `/api/search/professionals`

Search professional profiles using filters, sorting, and pagination.

Auth required: No

### Query params

| Param | Type | Required | Rules |
|---|---|---|---|
| `skills` | array or comma string | No | Skill IDs. Accepts repeated params or comma-separated string |
| `minRating` | number | No | Min `0`, max `5` |
| `maxRating` | number | No | Min `0`, max `5` |
| `minRate` | number | No | Min `0` |
| `maxRate` | number | No | Min `0` |
| `availabilityStatus` | enum | No | `available`, `unavailable`, `away` |
| `sortBy` | enum | No | `rating_desc`, `rate_asc`, `recent_desc` |
| `page` | number | No | Integer, min `1`, default `1` |
| `limit` | number | No | Integer, min `1`, max `100`, default `20` |

### Valid `skills` formats

Repeated query params:

```text
/api/search/professionals?skills=1&skills=3
```

Comma-separated:

```text
/api/search/professionals?skills=1,3
```

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "message": "Search results fetched successfully",
  "data": {
    "professionals": [
      {
        "id": 45,
        "userId": 123,
        "hourlyRate": 8000,
        "bio": "Senior React developer",
        "availabilityStatus": "available",
        "responseTimeHours": 4,
        "totalHoursWorked": 0,
        "avgRating": 0,
        "totalReviews": 0,
        "createdAt": "2026-04-25T12:00:00.000Z",
        "updatedAt": "2026-04-25T12:00:00.000Z",
        "user": {
          "id": 123,
          "firstName": "John",
          "lastName": "Doe",
          "location": "Lagos"
        },
        "skills": [
          {
            "id": 3,
            "name": "React",
            "category": "Frontend",
            "description": "React library"
          }
        ]
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

Important:

- `meta` is inside `data`, not at the top level
- empty result sets return `professionals: []`
- if total is `0`, `pages` is `0`

### Expected errors

- `400` invalid query params

Common validation messages:

- `minRate cannot be greater than maxRate`
- `minRating cannot be greater than maxRating`

---

### GET `/api/search/filters`

Fetch filter metadata needed to build the search UI.

Auth required: No

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "message": "Search filters fetched successfully",
  "data": {
    "filters": {
      "skills": [
        {
          "id": 3,
          "name": "React",
          "category": "Frontend",
          "description": "React library"
        }
      ],
      "availabilityStatuses": [
        "available",
        "unavailable",
        "away"
      ],
      "minHourlyRate": 3000,
      "maxHourlyRate": 15000
    }
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

Important:

- current path is `/api/search/filters`
- current response key is `data.filters`

---

### GET `/api/search/skills`

Autocomplete skill names for search or profile-building UIs.

Auth required: No

### Query params

| Param | Type | Required | Rules |
|---|---|---|---|
| `q` | string | Yes | Trimmed, min `1`, max `100` |
| `limit` | number | No | Integer, min `1`, max `50`, default `10` |

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "message": "Skills fetched successfully",
  "data": {
    "skills": [
      {
        "id": 3,
        "name": "React",
        "category": "Frontend",
        "description": "React library"
      }
    ]
  },
  "timestamp": "2026-04-25T12:00:00.000Z"
}
```

Important:

- current response key is `data.skills`
- not `data.suggestions`

### Expected errors

- `400` missing or invalid `q`
- `400` invalid `limit`

---

## Frontend Integration Notes

### Typical Onboarding Flow

1. **User authenticates** with Phase 1 endpoints (see [AUTH_API_ENDPOINTS.md](../PHASE1/AUTH_API_ENDPOINTS.md))
2. **Bootstrap check**: Frontend calls `GET /api/profiles/me`
3. **Decision point**:
   - If `200 OK`: User already has a professional profile → Show dashboard
   - If `404`: User has no profile yet → Trigger Phase 2 onboarding flow
4. **Onboarding flow** (if needed):
   - Step 1: Create profile (`POST /api/profiles`)
   - Step 2: Add skills (`POST /api/skills/me/skills`) - optional but recommended
   - Step 3: Add certifications (`POST /api/profiles/me/certifications`) - optional
   - Step 4: Add portfolio items (`POST /api/profiles/me/portfolio`) - optional
5. **Post-onboarding**: Enable all Phase 2 features
   - View own profile
   - Edit profile/skills/certifications/portfolio
   - Search for other professionals
   - Be discoverable in search results

### Suggested Bootstrap Pattern

```javascript
// On app load
const bootstrap = async () => {
  try {
    // 1. Verify auth status
    await api.get("/api/auth/verify");
    
    // 2. Check if user has professional profile
    try {
      const profileResponse = await api.get("/api/profiles/me");
      const profile = profileResponse.data.data.profile;
      
      // User is onboarded for Phase 2
      setUserState({ 
        isAuthenticated: true, 
        isOnboarded: true, 
        profile 
      });
      navigateTo("/dashboard");
    } catch (error) {
      if (error.response?.status === 404) {
        // User is authenticated but not onboarded
        setUserState({ 
          isAuthenticated: true, 
          isOnboarded: false 
        });
        navigateTo("/onboarding");
      } else {
        throw error;
      }
    }
  } catch (error) {
    // Not authenticated
    setUserState({ isAuthenticated: false });
    navigateTo("/login");
  }
};
```

### Axios Setup (Complete with Interceptors)

```javascript
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,  // CRITICAL: Required for cookie-based auth
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: Add request logging in development
if (import.meta.env.DEV) {
  api.interceptors.request.use(config => {
    console.debug(`${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });
}

// Handle response errors globally
api.interceptors.response.use(
  response => response,
  error => {
    // Automatically clear session on 401
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      // Optionally redirect to login
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### TypeScript Types (Optional but Recommended)

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

interface ProfessionalProfile {
  id: number;
  userId: number;
  hourlyRate: number;
  bio: string;
  availabilityStatus: 'available' | 'unavailable' | 'away';
  responseTimeHours: number;
  totalHoursWorked: number;
  avgRating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
}

interface ProfileSkill {
  skillId: number;
  name: string;
  category: string;
  description: string;
  proficiencyLevel: 'beginner' | 'intermediate' | 'expert';
  yearsOfExperience: number;
  isPrimary: boolean;
}

// Usage
const response: ApiResponse<{ profile: ProfessionalProfile }> = 
  await api.get('/api/profiles/me');
```

### Example Requests

#### Create profile (with partial fields)

```javascript
try {
  const response = await api.post("/api/profiles", {
    hourlyRate: 8000,
    bio: "Senior React developer with 5+ years experience",
    availabilityStatus: "available",
    responseTimeHours: 4,
  });
  
  const profile = response.data.data.profile;
  console.log(`Profile created with ID: ${profile.id}`);
} catch (error) {
  if (error.response?.status === 403) {
    // User is not a professional account
    console.error("Only professional accounts can create profiles");
  } else if (error.response?.status === 409) {
    // Profile already exists
    console.error("Profile already exists for this user");
  }
}
```

#### Add a skill with primary flag

```javascript
try {
  const response = await api.post("/api/skills/me/skills", {
    skillId: 3,
    proficiencyLevel: "expert",
    yearsOfExperience: 7,
    isPrimary: true,  // Will clear any existing primary skill
  });
  
  console.log("Skill added", response.data.data.skill);
} catch (error) {
  if (error.response?.status === 404 && error.response?.data?.message?.includes("skill")) {
    console.error("Skill not found in catalog");
  } else if (error.response?.status === 409) {
    console.error("Skill already added to profile");
  }
}
```

#### Create certification

```javascript
await api.post("/api/profiles/me/certifications", {
  title: "AWS Certified Solutions Architect",
  issuer: "Amazon Web Services",
  issueDate: "2025-01-10",
  expiryDate: "2028-01-10",
  credentialUrl: "https://aws.amazon.com/verification/..."
});
```

#### Create portfolio item

```javascript
await api.post("/api/profiles/me/portfolio", {
  title: "E-commerce Platform",
  description: "Full-stack commerce application built with React and Node.js",
  imageUrl: "https://example.com/project-thumbnail.png",
  linkUrl: "https://example.com/project"
});
```

#### Search professionals with filters

```javascript
const results = await api.get("/api/search/professionals", {
  params: {
    skills: [1, 3],  // Axios converts this to repeated params
    minRate: 5000,
    maxRate: 50000,
    availabilityStatus: "available",
    sortBy: "rating_desc",  // rating_desc | rate_asc | recent_desc
    page: 1,
    limit: 20,
  },
});

// Access paginated results
const { professionals, meta } = results.data.data;
console.log(`Found ${meta.total} results, showing page ${meta.page} of ${meta.pages}`);
```

#### Get skill catalog with pagination

```javascript
const response = await api.get("/api/skills", {
  params: {
    limit: 50,
    offset: 100,  // Skip first 100 items
  }
});

const { skills, pagination } = response.data.data;
console.log(`Showing ${skills.length} of ${pagination.total} total skills`);
```

---

## Frontend Error Handling Guidance

### HTTP Status Code Reference

| Code | Meaning | Common Causes | Frontend Action |
|------|---------|---------------|----------------|
| `400` | Bad Request | Validation failure, malformed JSON, invalid params | Show error message to user, highlight form fields |
| `401` | Unauthorized | Missing/invalid auth token, session expired | Redirect to login, clear session |
| `403` | Forbidden | User lacks permission (e.g., not a professional) | Show permission error, suggest account type change |
| `404` | Not Found | Resource doesn't exist, profile not created | Trigger onboarding flow (for profile), or show 404 message |
| `409` | Conflict | Duplicate resource, conflicting state | Show conflict message (e.g., "Skill already added") |
| `500` | Server Error | Backend error | Show generic error, log for debugging |

### Concrete Examples

- `GET /api/profiles/me` returning `404` → User has not created a professional profile yet; trigger onboarding
- `POST /api/profiles` returning `403` → Current account is not a professional account; show error
- `POST /api/skills/me/skills` returning `409` → This skill is already linked; show error and suggest removing it first
- `POST /api/profiles` returning `409` → Profile already exists; show error and link to edit endpoint
- `POST /api/skills/me/skills` returning `404` (skill) → Skill ID doesn't exist in catalog; refresh skill list
- `PUT /api/profiles/me/certifications/:certId` returning `404` (certification) → Certification was deleted; refresh list

### Robust Error Handler

```javascript
class ApiError extends Error {
  constructor(message, statusCode, data) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
  }
}

function handleApiError(error) {
  if (!error.response) {
    // Network error
    return new ApiError(
      "Network error. Please check your connection.",
      0,
      null
    );
  }

  const { status, data } = error.response;
  const message = data?.message || "An error occurred";

  // Handle specific cases
  if (status === 401) {
    // Clear auth state and redirect
    clearAuthSession();
    redirectToLogin();
  } else if (status === 403) {
    // User lacks permission
    console.warn("Access denied:", message);
  } else if (status === 404) {
    // Determine what was not found
    if (data?.message?.includes("profile")) {
      // Profile doesn't exist - this is expected for new users
    } else if (data?.message?.includes("skill")) {
      // Skill not found - refresh skill catalog
    }
  } else if (status === 409) {
    // Conflict - likely duplicate
    console.warn("Conflict:", message);
  }

  return new ApiError(message, status, data);
}

// Usage in component
try {
  await api.post("/api/profiles", profileData);
} catch (error) {
  const apiError = handleApiError(error);
  setErrorMessage(apiError.message);
}
```

### Axios Interceptor for Auth

```javascript
api.interceptors.response.use(
  response => response,
  error => {
    // Automatically handle 401 (expired session)
    if (error.response?.status === 401) {
      // Clear auth state
      localStorage.removeItem('auth_token');
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## State Management & Frontend Patterns

### Recommended Caching Strategy

For optimal performance, cache these endpoints:

| Endpoint | Cache Duration | Invalidation Trigger |
|----------|---------------|-----------------------|
| `GET /api/skills` | 1 hour | Never, unless admin adds skills |
| `GET /api/search/filters` | 1 hour | Profile update, skill addition |
| `GET /api/search/skills` (autocomplete) | 30 minutes | User input change |
| `GET /api/profiles/:userId` | 10 minutes | Refresh button click |
| `GET /api/profiles/me` | 5 minutes | After PUT, DELETE operations |
| `GET /api/profiles/:userId/detailed` | 5 minutes | After skill/cert/portfolio changes |

### Handling Concurrent Requests

Avoid race conditions when updating related data:

```javascript
// BAD: Multiple requests may interfere
await Promise.all([
  api.put("/api/profiles/me", { bio: "New bio" }),
  api.post("/api/skills/me/skills", { skillId: 3 })
]);

// GOOD: Sequential for dependent operations
const profileUpdate = await api.put("/api/profiles/me", { bio: "New bio" });
if (profileUpdate.status === 200) {
  await api.post("/api/skills/me/skills", { skillId: 3 });
}
```

### Optimistic UI Updates

For better UX, update UI before receiving server confirmation:

```javascript
const addSkill = async (skillId) => {
  // Optimistically add to local state
  setSkills(prev => [...prev, { skillId, name: "Loading..." }]);
  
  try {
    const response = await api.post("/api/skills/me/skills", {
      skillId,
      proficiencyLevel: "beginner"
    });
    
    // Update with actual server data
    setSkills(prev => 
      prev.map(s => s.skillId === skillId ? response.data.data.skill : s)
    );
  } catch (error) {
    // Revert on error
    setSkills(prev => prev.filter(s => s.skillId !== skillId));
    setError(error.response?.data?.message);
  }
};
```

## Environment Variables

### Backend

```env
JWT_SECRET=your_secret_key_here
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend

```env
VITE_API_BASE_URL=http://localhost:5020
```

## Security & CORS Notes

### Important Security Considerations

1. **Credentials**: Always include `withCredentials: true` in axios config
   - Enables cookie-based session persistence
   - Required for write operations

2. **CORS**: Backend should allow requests from `http://localhost:5173` in development
   - In production, set `FRONTEND_URL` to your actual frontend domain

3. **Sensitive Data**: 
   - User passwords are never returned by any endpoint
   - Email is only included in authenticated user's own profile
   - Never log tokens to console in production

4. **Session Management**:
   - Sessions are managed via secure HTTP-only cookies
   - Clients cannot modify cookies directly (security feature)
   - Session expiration follows Phase 1 auth model

### Rate Limiting

The Phase 2 API does not currently have rate limiting. However, be mindful of:
- Autocomplete endpoints: debounce requests to `/api/search/skills`
- Search endpoints: consider pagination to limit result sets
- Bulk operations: add delays between multiple requests

---

## Phase 2 Contract Summary

### What the Frontend Can Safely Rely On

✅ **Guaranteed stable**:
- Mounted paths and endpoint names in this document
- Cookie-authenticated write requests (via `credentials: 'include'`)
- Standardized response shape: `{ success, message, data, timestamp }`
- Error responses include `statusCode` field
- `204 No Content` status for successful DELETE operations (empty body)
- `data.meta` is nested **inside** `data` for search responses, not at top level
- Certifications and portfolio endpoints mounted under `/api/profiles`, not standalone
- Search filter endpoint path is `/api/search/filters` (not `/api/search/filter-options`)
- Search skill autocomplete returns results in `data.skills` (not `data.suggestions`)
- Primary skill behavior: setting `isPrimary: true` auto-clears previous primary
- Enum values are lowercase: `available`, `beginner`, `expert`, etc.

### What the Frontend Should NOT Rely On

❌ **Not guaranteed stable**:
- Field-level validation error arrays (validation returns single `message` string)
- Stale test route names:
  - `/api/certifications/*` (use `/api/profiles/*/certifications` instead)
  - `/api/portfolio/*` (use `/api/profiles/*/portfolio` instead)
  - `/api/search/filter-options` (use `/api/search/filters` instead)
- Top-level `meta` outside `data` object
- Additional response fields beyond documented structure
- Specific error message wording (may change; check `statusCode` instead)

### Onboarding Decision Tree

```
On app load:
  ↓
Call /api/auth/verify
  ↓
Is authenticated?
  ├─ NO → Show login
  └─ YES
      ↓
      Call /api/profiles/me
        ↓
      Has profile?
        ├─ YES → Show dashboard with Phase 2 features enabled
        └─ NO
            ↓
            Show Phase 2 onboarding flow:
            1. Create profile (POST /api/profiles)
            2. Add skills (POST /api/skills/me/skills)
            3. Add certifications (optional)
            4. Add portfolio items (optional)
            5. Redirect to discovery/profile view
```

### Response Time Expectations

- Simple CRUD operations: < 200ms
- Search with filters: 200-500ms
- Detailed profile fetch: 100-300ms
- Bulk operations (e.g., fetching profile + skills + certifications): < 1000ms combined

*Note: Times may vary based on database load and network latency.*

