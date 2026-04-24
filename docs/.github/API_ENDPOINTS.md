# Linkprosoft Backend - Complete API Endpoints Specification

**Version:** 1.0  
**Date:** April 2026  
**Base URL:** `http://localhost:5020/api` (development)  

---

## Table of Contents

1. [Authentication Endpoints (Phase 1)](#authentication-endpoints-phase-1)
2. [User Management Endpoints (Phase 1)](#user-management-endpoints-phase-1)
3. [Professional Profile Endpoints (Phase 2)](#professional-profile-endpoints-phase-2)
4. [Skill Endpoints (Phase 2)](#skill-endpoints-phase-2)
5. [Job Posting Endpoints (Phase 3)](#job-posting-endpoints-phase-3)
6. [Job Assignment Endpoints (Phase 3)](#job-assignment-endpoints-phase-3)
7. [Search Endpoints (Phase 2)](#search-endpoints-phase-2)
8. [Payment Endpoints (Phase 4)](#payment-endpoints-phase-4)
9. [Review & Rating Endpoints (Phase 4)](#review--rating-endpoints-phase-4)
10. [Messaging Endpoints (Phase 2+)](#messaging-endpoints-phase-2)
11. [Response Formats & Error Codes](#response-formats--error-codes)

---

## Authentication Endpoints (Phase 1)

### 1. Register User

**Endpoint:** `POST /auth/register`

**Authentication:** None (Public)

**Description:** Create a new user account

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "userType": "professional",
  "compName": "ACME Corp",
  "phone": "+234 123 456 7890",
  "location": "Lagos, Nigeria"
}
```

**Request Validation:**
- `firstName` (required): string, min 2 chars
- `lastName` (required): string, min 2 chars
- `email` (required): valid email format, unique
- `password` (required): min 6 chars
- `userType` (required): enum [`professional`, `employer`]
- `compName` (optional): required if `userType === 'employer'`
- `phone` (optional): valid phone format
- `location` (optional): string

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "userType": "professional",
    "isVerified": false
  }
}
```

**Error Responses:**
- `400`: Validation error (invalid email, password too short, etc.)
- `409`: User already exists with this email
- `500`: Server error

**Notes:**
- Password hashed with bcrypt (rounds: 10)
- JWT token set in HTTP-only cookie `token`
- Cookie expires in 24 hours

---

### 2. Login User

**Endpoint:** `POST /auth/login`

**Authentication:** None (Public)

**Description:** Authenticate user and return JWT token

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Request Validation:**
- `email` (required): valid email format
- `password` (required): string

**Success Response (200):**
```json
{
  "success": true,
  "message": "User logged in successfully",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "userType": "professional"
  }
}
```

**Error Responses:**
- `400`: Missing email or password
- `401`: Invalid email or password
- `500`: Server error

**Notes:**
- JWT token set in HTTP-only cookie `token`
- Frontend should use `withCredentials: true`

---

### 3. Logout User

**Endpoint:** `POST /auth/logout`

**Authentication:** Optional (works with or without auth)

**Description:** Clear authentication token (destroy session)

**Request Body:** Empty

**Success Response (200):**
```json
{
  "success": true,
  "message": "User logged out successfully"
}
```

**Notes:**
- Clears `token` cookie
- Frontend should clear user state

---

### 4. Check Authentication

**Endpoint:** `GET /auth/check-auth`

**Authentication:** Required (JWT in cookie)

**Description:** Verify if user is authenticated and return current user info

**Request Headers:**
```
Cookie: token=<jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Authenticated",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "userType": "professional"
  }
}
```

**Error Responses:**
- `401`: No token provided or invalid token
- `401`: Token expired

**Notes:**
- Called by frontend on app load to restore user session
- Returns current user data without database query (from JWT payload)

---

## User Management Endpoints (Phase 1)

### 5. Get User Profile

**Endpoint:** `GET /users/:id`

**Authentication:** Required (JWT in cookie)

**Description:** Retrieve full user profile by ID

**URL Parameters:**
- `id` (required): User ID (integer)

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "userType": "professional",
    "phone": "+234 123 456 7890",
    "location": "Lagos, Nigeria",
    "profileImageUrl": "https://...",
    "bio": "Experienced full-stack developer",
    "isVerified": false,
    "createdAt": "2026-04-19T10:30:00Z",
    "updatedAt": "2026-04-19T10:30:00Z"
  }
}
```

**Error Responses:**
- `401`: Unauthorized (no token)
- `404`: User not found
- `500`: Server error

**Notes:**
- Does NOT return password hash
- Any authenticated user can view any user profile (public data)

---

### 6. Update User Profile

**Endpoint:** `PUT /users/:id`

**Authentication:** Required (JWT in cookie)

**Authorization:** User can only update own profile

**Description:** Update user profile information

**URL Parameters:**
- `id` (required): User ID

**Request Body (all optional):**
```json
{
  "firstName": "Jonathan",
  "lastName": "Doe",
  "phone": "+234 234 567 8901",
  "location": "Abuja, Nigeria",
  "profileImageUrl": "https://...",
  "bio": "Senior full-stack developer with 5+ years experience"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "firstName": "Jonathan",
    "lastName": "Doe",
    "email": "john@example.com",
    "userType": "professional",
    "phone": "+234 234 567 8901",
    "location": "Abuja, Nigeria",
    "profileImageUrl": "https://...",
    "bio": "Senior full-stack developer with 5+ years experience",
    "updatedAt": "2026-04-19T11:45:00Z"
  }
}
```

**Error Responses:**
- `400`: Validation error
- `401`: Unauthorized
- `403`: Cannot update other user's profile
- `404`: User not found
- `500`: Server error

**Notes:**
- Cannot change email via this endpoint (separate email-change flow)
- Cannot change userType via this endpoint
- Cannot change password via this endpoint

---

### 7. Change User Password

**Endpoint:** `PUT /users/:id/password`

**Authentication:** Required (JWT in cookie)

**Authorization:** User can only change own password

**Description:** Update user password

**URL Parameters:**
- `id` (required): User ID

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewSecurePassword123"
}
```

**Request Validation:**
- `currentPassword` (required): string
- `newPassword` (required): min 6 chars, different from current

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400`: Password validation error
- `401`: Current password incorrect
- `401`: Unauthorized
- `403`: Cannot change other user's password
- `404`: User not found

**Notes:**
- Requires verification of current password
- New password hashed before storage

---

### 8. Get Current User

**Endpoint:** `GET /users/me`

**Authentication:** Required (JWT in cookie)

**Description:** Get authenticated user's profile (shortcut for `/users/:id`)

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "userType": "professional",
    "phone": "+234 123 456 7890",
    "location": "Lagos, Nigeria",
    "createdAt": "2026-04-19T10:30:00Z"
  }
}
```

**Error Responses:**
- `401`: Unauthorized

---

## Professional Profile Endpoints (Phase 2)

### 9. Create Professional Profile

**Endpoint:** `POST /profiles`

**Authentication:** Required (JWT in cookie)

**Authorization:** Only `professional` users can create

**Description:** Create professional profile for currently logged-in user

**Request Body:**
```json
{
  "hourlyRate": 15000,
  "availabilityStatus": "available",
  "responseTimeHours": 2,
  "bio": "Full-stack developer specializing in React and Node.js"
}
```

**Request Validation:**
- `hourlyRate` (required): number > 0
- `availabilityStatus` (optional): enum [`available`, `unavailable`, `away`], default: `available`
- `responseTimeHours` (optional): number >= 0
- `bio` (optional): string, max 500 chars

**Success Response (201):**
```json
{
  "success": true,
  "message": "Professional profile created successfully",
  "profile": {
    "id": 1,
    "userId": 1,
    "hourlyRate": 15000,
    "availabilityStatus": "available",
    "totalRatings": 0,
    "avgRating": 0,
    "totalJobsCompleted": 0,
    "responseTimeHours": 2,
    "bio": "Full-stack developer specializing in React and Node.js",
    "createdAt": "2026-04-19T12:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Validation error or missing required fields
- `401`: Unauthorized
- `403`: Only professionals can create profile
- `409`: Profile already exists for this user
- `500`: Server error

---

### 10. Get Professional Profile

**Endpoint:** `GET /profiles/:userId`

**Authentication:** Optional (Public data)

**Description:** Retrieve professional profile by user ID

**URL Parameters:**
- `userId` (required): User ID

**Query Parameters:**
- `includeCertifications` (optional): boolean, default: false
- `includePortfolio` (optional): boolean, default: false

**Success Response (200):**
```json
{
  "success": true,
  "profile": {
    "id": 1,
    "userId": 1,
    "user": {
      "firstName": "John",
      "lastName": "Doe",
      "profileImageUrl": "https://...",
      "location": "Lagos, Nigeria"
    },
    "hourlyRate": 15000,
    "availabilityStatus": "available",
    "totalRatings": 25,
    "avgRating": 4.8,
    "totalJobsCompleted": 18,
    "responseTimeHours": 2,
    "bio": "Full-stack developer specializing in React and Node.js",
    "certifications": [],
    "portfolio": [],
    "skills": [],
    "createdAt": "2026-04-19T12:00:00Z",
    "updatedAt": "2026-04-19T12:00:00Z"
  }
}
```

**Error Responses:**
- `404`: User not found or user is not a professional
- `500`: Server error

---

### 11. Update Professional Profile

**Endpoint:** `PUT /profiles/:userId`

**Authentication:** Required (JWT in cookie)

**Authorization:** User can only update own profile

**Description:** Update professional profile

**URL Parameters:**
- `userId` (required): User ID

**Request Body (all optional):**
```json
{
  "hourlyRate": 20000,
  "availabilityStatus": "away",
  "responseTimeHours": 4,
  "bio": "Senior full-stack developer with 5+ years experience"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": {
    "id": 1,
    "userId": 1,
    "hourlyRate": 20000,
    "availabilityStatus": "away",
    "responseTimeHours": 4,
    "bio": "Senior full-stack developer with 5+ years experience",
    "updatedAt": "2026-04-19T13:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Validation error
- `401`: Unauthorized
- `403`: Cannot update other user's profile
- `404`: Profile not found
- `500`: Server error

---

### 12. Add Certification

**Endpoint:** `POST /profiles/:userId/certifications`

**Authentication:** Required

**Authorization:** User can only add to own profile

**Description:** Add certification to professional profile

**Request Body:**
```json
{
  "title": "AWS Certified Solutions Architect",
  "issuer": "Amazon Web Services",
  "issueDate": "2024-01-15",
  "expiryDate": "2026-01-15",
  "credentialUrl": "https://aws.amazon.com/verification/..."
}
```

**Request Validation:**
- `title` (required): string, max 255 chars
- `issuer` (optional): string
- `issueDate` (optional): ISO date string
- `expiryDate` (optional): ISO date string
- `credentialUrl` (optional): valid URL

**Success Response (201):**
```json
{
  "success": true,
  "message": "Certification added successfully",
  "certification": {
    "id": 1,
    "professionalId": 1,
    "title": "AWS Certified Solutions Architect",
    "issuer": "Amazon Web Services",
    "issueDate": "2024-01-15",
    "expiryDate": "2026-01-15",
    "credentialUrl": "https://...",
    "createdAt": "2026-04-19T13:15:00Z"
  }
}
```

**Error Responses:**
- `400`: Validation error
- `401`: Unauthorized
- `403`: Cannot add to other user's profile
- `404`: Professional profile not found

---

### 13. Delete Certification

**Endpoint:** `DELETE /profiles/:userId/certifications/:certId`

**Authentication:** Required

**Authorization:** User can only delete own certifications

**Description:** Remove certification from profile

**URL Parameters:**
- `userId` (required): User ID
- `certId` (required): Certification ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Certification deleted successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `403`: Cannot delete other user's certification
- `404`: Certification not found

---

### 14. Add Portfolio Item

**Endpoint:** `POST /profiles/:userId/portfolio`

**Authentication:** Required

**Authorization:** User can only add to own portfolio

**Description:** Add portfolio item (project showcase)

**Request Body:**
```json
{
  "title": "E-commerce Platform",
  "description": "Full-stack MERN application with payment integration",
  "imageUrl": "https://...",
  "linkUrl": "https://github.com/..."
}
```

**Request Validation:**
- `title` (required): string, max 255 chars
- `description` (optional): string, max 1000 chars
- `imageUrl` (optional): valid URL
- `linkUrl` (optional): valid URL

**Success Response (201):**
```json
{
  "success": true,
  "message": "Portfolio item added successfully",
  "portfolioItem": {
    "id": 1,
    "professionalId": 1,
    "title": "E-commerce Platform",
    "description": "Full-stack MERN application with payment integration",
    "imageUrl": "https://...",
    "linkUrl": "https://github.com/...",
    "createdAt": "2026-04-19T13:30:00Z"
  }
}
```

**Error Responses:**
- `400`: Validation error
- `401`: Unauthorized
- `403`: Cannot add to other user's portfolio
- `404`: Professional profile not found

---

## Skill Endpoints (Phase 2)

### 15. Get All Skills (Catalog)

**Endpoint:** `GET /skills`

**Authentication:** Optional

**Description:** Retrieve all available skills in the system

**Query Parameters:**
- `category` (optional): Filter by skill category
- `search` (optional): Search skills by name
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 20, max: 100

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "id": 1,
        "name": "React.js",
        "category": "Frontend",
        "description": "JavaScript library for building user interfaces"
      },
      {
        "id": 2,
        "name": "Node.js",
        "category": "Backend",
        "description": "JavaScript runtime for server-side development"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

**Error Responses:**
- `500`: Server error

---

### 16. Add Skill to Professional Profile

**Endpoint:** `POST /profiles/:userId/skills`

**Authentication:** Required

**Authorization:** User can only add to own profile

**Description:** Add skill to professional profile

**Request Body:**
```json
{
  "skillId": 1,
  "proficiencyLevel": "expert",
  "yearsOfExperience": 5,
  "isPrimary": true
}
```

**Request Validation:**
- `skillId` (required): integer, must exist
- `proficiencyLevel` (optional): enum [`beginner`, `intermediate`, `expert`], default: `intermediate`
- `yearsOfExperience` (optional): number >= 0
- `isPrimary` (optional): boolean, default: false

**Success Response (201):**
```json
{
  "success": true,
  "message": "Skill added successfully",
  "professionalSkill": {
    "id": 1,
    "professionalId": 1,
    "skillId": 1,
    "skillName": "React.js",
    "proficiencyLevel": "expert",
    "yearsOfExperience": 5,
    "isPrimary": true,
    "createdAt": "2026-04-19T13:45:00Z"
  }
}
```

**Error Responses:**
- `400`: Validation error
- `401`: Unauthorized
- `403`: Cannot add to other user's profile
- `404`: Skill not found or professional profile not found
- `409`: Skill already added to profile

---

### 17. Remove Skill from Professional Profile

**Endpoint:** `DELETE /profiles/:userId/skills/:skillId`

**Authentication:** Required

**Authorization:** User can only remove from own profile

**Description:** Remove skill from professional profile

**URL Parameters:**
- `userId` (required): User ID
- `skillId` (required): Skill ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Skill removed successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `403`: Cannot remove from other user's profile
- `404`: Skill not found in profile

---

### 18. Get Professional Skills

**Endpoint:** `GET /profiles/:userId/skills`

**Authentication:** Optional

**Description:** Get all skills for a professional

**URL Parameters:**
- `userId` (required): User ID

**Success Response (200):**
```json
{
  "success": true,
  "skills": [
    {
      "id": 1,
      "skillId": 1,
      "skillName": "React.js",
      "category": "Frontend",
      "proficiencyLevel": "expert",
      "yearsOfExperience": 5,
      "isPrimary": true
    },
    {
      "id": 2,
      "skillId": 2,
      "skillName": "Node.js",
      "category": "Backend",
      "proficiencyLevel": "expert",
      "yearsOfExperience": 4,
      "isPrimary": false
    }
  ]
}
```

**Error Responses:**
- `404`: Professional not found

---

## Job Posting Endpoints (Phase 3)

### 19. Create Job Posting

**Endpoint:** `POST /jobs`

**Authentication:** Required

**Authorization:** Only `employer` users can create

**Description:** Create a new job posting

**Request Body:**
```json
{
  "skillId": 1,
  "title": "Senior React Developer Needed",
  "description": "We're looking for an experienced React developer for a 3-month contract",
  "budget": 500000,
  "currency": "NGN",
  "durationDays": 90,
  "location": "Lagos, Nigeria",
  "visibility": "public"
}
```

**Request Validation:**
- `skillId` (required): integer, skill must exist
- `title` (required): string, max 255 chars
- `description` (required): string, min 20 chars, max 5000 chars
- `budget` (required): number > 0
- `currency` (optional): string, default: `NGN`
- `durationDays` (optional): integer > 0
- `location` (optional): string
- `visibility` (optional): enum [`public`, `private`], default: `public`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Job posting created successfully",
  "job": {
    "id": 1,
    "employerId": 5,
    "skillId": 1,
    "skillName": "React.js",
    "title": "Senior React Developer Needed",
    "description": "We're looking for an experienced React developer for a 3-month contract",
    "budget": 500000,
    "currency": "NGN",
    "durationDays": 90,
    "location": "Lagos, Nigeria",
    "status": "posted",
    "visibility": "public",
    "createdAt": "2026-04-19T14:00:00Z",
    "expiresAt": "2026-05-19T14:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Validation error
- `401`: Unauthorized
- `403`: Only employers can post jobs
- `404`: Skill not found

---

### 20. Get Job Posting

**Endpoint:** `GET /jobs/:jobId`

**Authentication:** Optional

**Description:** Retrieve job posting details

**URL Parameters:**
- `jobId` (required): Job ID

**Query Parameters:**
- `includeMatches` (optional): boolean, include matched professionals

**Success Response (200):**
```json
{
  "success": true,
  "job": {
    "id": 1,
    "employerId": 5,
    "employer": {
      "firstName": "Jane",
      "lastName": "Smith",
      "compName": "Tech Solutions Inc"
    },
    "skillId": 1,
    "skillName": "React.js",
    "title": "Senior React Developer Needed",
    "description": "We're looking for an experienced React developer for a 3-month contract",
    "budget": 500000,
    "currency": "NGN",
    "durationDays": 90,
    "location": "Lagos, Nigeria",
    "status": "posted",
    "visibility": "public",
    "createdAt": "2026-04-19T14:00:00Z",
    "expiresAt": "2026-05-19T14:00:00Z"
  }
}
```

**Error Responses:**
- `404`: Job not found

---

### 21. Get Jobs (with Filters)

**Endpoint:** `GET /jobs`

**Authentication:** Optional

**Description:** List job postings with filtering and pagination

**Query Parameters:**
- `skillId` (optional): Filter by skill
- `employerId` (optional): Filter by employer
- `status` (optional): enum [`posted`, `in_progress`, `completed`, `cancelled`]
- `location` (optional): Filter by location (partial match)
- `minBudget` (optional): Minimum budget
- `maxBudget` (optional): Maximum budget
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 20, max: 50
- `sortBy` (optional): enum [`createdAt`, `budget`, `expiresAt`], default: `createdAt`
- `sortOrder` (optional): enum [`asc`, `desc`], default: `desc`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": 1,
        "title": "Senior React Developer Needed",
        "skillName": "React.js",
        "budget": 500000,
        "location": "Lagos, Nigeria",
        "status": "posted",
        "createdAt": "2026-04-19T14:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

**Error Responses:**
- `400`: Invalid query parameters

---

### 22. Update Job Posting

**Endpoint:** `PUT /jobs/:jobId`

**Authentication:** Required

**Authorization:** Only job creator (employer) can update

**Description:** Update job posting details

**URL Parameters:**
- `jobId` (required): Job ID

**Request Body (all optional):**
```json
{
  "title": "Senior React Developer Needed - URGENT",
  "description": "Updated description",
  "budget": 750000,
  "status": "in_progress"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Job posting updated successfully",
  "job": {
    "id": 1,
    "title": "Senior React Developer Needed - URGENT",
    "budget": 750000,
    "status": "in_progress",
    "updatedAt": "2026-04-19T14:30:00Z"
  }
}
```

**Error Responses:**
- `400`: Validation error
- `401`: Unauthorized
- `403`: Cannot update other employer's job
- `404`: Job not found

---

### 23. Delete Job Posting

**Endpoint:** `DELETE /jobs/:jobId`

**Authentication:** Required

**Authorization:** Only job creator can delete

**Description:** Cancel/delete job posting

**URL Parameters:**
- `jobId` (required): Job ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Job posting deleted successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `403`: Cannot delete other employer's job
- `404`: Job not found

---

### 24. Get Matched Professionals for Job

**Endpoint:** `GET /jobs/:jobId/matches`

**Authentication:** Required

**Authorization:** Only job creator can view matches

**Description:** Get list of professionals matching the job's skill requirements

**URL Parameters:**
- `jobId` (required): Job ID

**Query Parameters:**
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 20

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "id": 1,
        "userId": 1,
        "firstName": "John",
        "lastName": "Doe",
        "location": "Lagos, Nigeria",
        "hourlyRate": 15000,
        "avgRating": 4.8,
        "totalJobsCompleted": 18,
        "responseTimeHours": 2,
        "matchScore": 0.95,
        "isAvailable": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1
    }
  }
}
```

**Error Responses:**
- `401`: Unauthorized
- `403`: Cannot view other employer's matches
- `404`: Job not found

---

## Job Assignment Endpoints (Phase 3)

### 25. Create Job Assignment (Invite Professional)

**Endpoint:** `POST /assignments`

**Authentication:** Required

**Authorization:** Only employer can invite professionals

**Description:** Invite professional to a job or create assignment

**Request Body:**
```json
{
  "jobId": 1,
  "professionalId": 10,
  "acceptedBudget": 500000
}
```

**Request Validation:**
- `jobId` (required): Job must exist
- `professionalId` (required): Professional must exist
- `acceptedBudget` (optional): Budget agreed upon, default: job budget

**Success Response (201):**
```json
{
  "success": true,
  "message": "Professional invited successfully",
  "assignment": {
    "id": 1,
    "jobId": 1,
    "professionalId": 10,
    "employerId": 5,
    "status": "invited",
    "acceptedBudget": 500000,
    "assignedAt": "2026-04-19T14:45:00Z",
    "createdAt": "2026-04-19T14:45:00Z"
  }
}
```

**Error Responses:**
- `400`: Validation error
- `401`: Unauthorized
- `403`: Only employer can invite
- `404`: Job or professional not found
- `409`: Assignment already exists

---

### 26. Accept Job Assignment

**Endpoint:** `PUT /assignments/:assignmentId/accept`

**Authentication:** Required

**Authorization:** Only assigned professional can accept

**Description:** Accept job assignment (professional agrees to work)

**URL Parameters:**
- `assignmentId` (required): Assignment ID

**Request Body:**
```json
{
  "startDate": "2026-04-20"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Assignment accepted successfully",
  "assignment": {
    "id": 1,
    "status": "accepted",
    "acceptedAt": "2026-04-19T15:00:00Z",
    "startedAt": "2026-04-20T00:00:00Z"
  }
}
```

**Error Responses:**
- `401`: Unauthorized
- `403`: Cannot accept other professional's assignment
- `404`: Assignment not found

---

### 27. Reject Job Assignment

**Endpoint:** `PUT /assignments/:assignmentId/reject`

**Authentication:** Required

**Authorization:** Only assigned professional can reject

**Description:** Reject job assignment

**URL Parameters:**
- `assignmentId` (required): Assignment ID

**Request Body:**
```json
{
  "reason": "Not available at this time"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Assignment rejected successfully",
  "assignment": {
    "id": 1,
    "status": "rejected"
  }
}
```

**Error Responses:**
- `401`: Unauthorized
- `403`: Cannot reject other professional's assignment
- `404`: Assignment not found

---

### 28. Complete Job Assignment

**Endpoint:** `PUT /assignments/:assignmentId/complete`

**Authentication:** Required

**Authorization:** Both professional and employer can complete

**Description:** Mark job assignment as complete

**URL Parameters:**
- `assignmentId` (required): Assignment ID

**Request Body:**
```json
{
  "completionNotes": "Work completed successfully"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Assignment marked as complete",
  "assignment": {
    "id": 1,
    "status": "completed",
    "completedAt": "2026-04-19T16:00:00Z"
  }
}
```

**Error Responses:**
- `401`: Unauthorized
- `404`: Assignment not found

---

### 29. Get User's Assignments

**Endpoint:** `GET /assignments`

**Authentication:** Required

**Description:** Get all assignments for current user (professional or employer)

**Query Parameters:**
- `role` (optional): enum [`professional`, `employer`], auto-detect from user type
- `status` (optional): Filter by status
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 20

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": 1,
        "jobId": 1,
        "jobTitle": "Senior React Developer Needed",
        "professionalId": 10,
        "professionalName": "John Doe",
        "employerId": 5,
        "employerName": "Jane Smith",
        "status": "accepted",
        "acceptedBudget": 500000,
        "assignedAt": "2026-04-19T14:45:00Z",
        "startedAt": "2026-04-20T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

**Error Responses:**
- `401`: Unauthorized

---

## Search Endpoints (Phase 2)

### 30. Search Professionals

**Endpoint:** `GET /search/professionals`

**Authentication:** Optional

**Description:** Search and filter professionals by skills, location, rating, etc.

**Query Parameters:**
- `skillId` (optional): Filter by skill ID
- `location` (optional): Filter by location (partial match)
- `minRate` (optional): Minimum hourly rate
- `maxRate` (optional): Maximum hourly rate
- `minRating` (optional): Minimum average rating (0-5)
- `availability` (optional): enum [`available`, `unavailable`, `away`]
- `sortBy` (optional): enum [`rating`, `rate`, `jobsCompleted`, `responseTime`], default: `rating`
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 20, max: 50

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "professionals": [
      {
        "id": 1,
        "userId": 1,
        "firstName": "John",
        "lastName": "Doe",
        "location": "Lagos, Nigeria",
        "profileImageUrl": "https://...",
        "bio": "Senior React developer",
        "hourlyRate": 15000,
        "avgRating": 4.8,
        "totalJobsCompleted": 18,
        "responseTimeHours": 2,
        "availabilityStatus": "available",
        "skills": [
          {
            "id": 1,
            "name": "React.js",
            "proficiencyLevel": "expert"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

**Error Responses:**
- `400`: Invalid query parameters

---

### 31. Search Jobs

**Endpoint:** `GET /search/jobs`

**Authentication:** Optional

**Description:** Search and filter job postings

**Query Parameters:**
- `skillId` (optional): Filter by skill
- `keyword` (optional): Search in title and description
- `location` (optional): Filter by location
- `minBudget` (optional): Minimum budget
- `maxBudget` (optional): Maximum budget
- `status` (optional): Filter by status
- `sortBy` (optional): enum [`createdAt`, `budget`, `expiresAt`], default: `createdAt`
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 20, max: 50

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": 1,
        "title": "Senior React Developer Needed",
        "description": "We're looking for an experienced React developer...",
        "skillName": "React.js",
        "budget": 500000,
        "currency": "NGN",
        "location": "Lagos, Nigeria",
        "status": "posted",
        "employer": {
          "firstName": "Jane",
          "lastName": "Smith"
        },
        "createdAt": "2026-04-19T14:00:00Z",
        "expiresAt": "2026-05-19T14:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

**Error Responses:**
- `400`: Invalid query parameters

---

### 32. Search Skills

**Endpoint:** `GET /search/skills`

**Authentication:** Optional

**Description:** Search skills by name or category

**Query Parameters:**
- `query` (optional): Search term (name, category)
- `category` (optional): Filter by category
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 20

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "id": 1,
        "name": "React.js",
        "category": "Frontend",
        "description": "JavaScript library for building user interfaces"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

**Error Responses:**
- `400`: Invalid query parameters

---

## Payment Endpoints (Phase 4)

### 33. Initiate Payment

**Endpoint:** `POST /payments/initiate`

**Authentication:** Required

**Authorization:** Only job creator (employer) can initiate payment

**Description:** Initiate payment for completed job assignment (redirects to Paystack)

**Request Body:**
```json
{
  "assignmentId": 1,
  "amount": 500000
}
```

**Request Validation:**
- `assignmentId` (required): Assignment must exist and be completed
- `amount` (required): Must match agreed budget

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment initiated",
  "paymentData": {
    "paymentId": "pay_1",
    "paystackAuthorizationUrl": "https://checkout.paystack.com/...",
    "reference": "ref_1234567890",
    "amount": 500000,
    "sellerCommission": 75000,
    "buyerCommission": 5000,
    "platformFee": 80000,
    "netAmount": 340000
  }
}
```

**Error Responses:**
- `400`: Validation error or invalid amount
- `401`: Unauthorized
- `403`: Cannot initiate payment
- `404`: Assignment not found

**Notes:**
- Frontend redirects to `paystackAuthorizationUrl`
- After payment, Paystack sends webhook to `/payments/webhook`

---

### 34. Verify Payment (Webhook)

**Endpoint:** `POST /payments/webhook`

**Authentication:** Required (Paystack signature verification)

**Description:** Webhook endpoint for Paystack payment confirmation

**Request Body (from Paystack):**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "ref_1234567890",
    "amount": 500000,
    "status": "success"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment verified and recorded"
}
```

**Error Responses:**
- `400`: Invalid signature or malformed data
- `404`: Payment reference not found
- `500`: Database error

**Notes:**
- Must verify Paystack signature
- Updates assignment status to `paid`
- Updates user account balances
- Sends notifications to both parties

---

### 35. Get Payment History

**Endpoint:** `GET /payments/history`

**Authentication:** Required

**Description:** Get payment history for current user

**Query Parameters:**
- `role` (optional): enum [`payer`, `payee`], default: both
- `status` (optional): Filter by payment status
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 20

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": 1,
        "assignmentId": 1,
        "jobTitle": "Senior React Developer Needed",
        "payerId": 5,
        "payerName": "Jane Smith",
        "payeeId": 1,
        "payeeName": "John Doe",
        "amount": 500000,
        "currency": "NGN",
        "sellerCommission": 75000,
        "buyerCommission": 5000,
        "platformFee": 80000,
        "netAmount": 340000,
        "status": "completed",
        "transactionReference": "ref_1234567890",
        "createdAt": "2026-04-19T17:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

**Error Responses:**
- `401`: Unauthorized

---

## Review & Rating Endpoints (Phase 4)

### 36. Create Review

**Endpoint:** `POST /reviews`

**Authentication:** Required

**Authorization:** Only job creator (employer) can review professional

**Description:** Submit review and rating for completed job

**Request Body:**
```json
{
  "assignmentId": 1,
  "rating": 5,
  "comment": "Excellent work! John delivered exactly what we needed on time.",
  "isAnonymous": false
}
```

**Request Validation:**
- `assignmentId` (required): Assignment must exist and be completed
- `rating` (required): integer, min: 1, max: 5
- `comment` (optional): string, max 1000 chars
- `isAnonymous` (optional): boolean, default: false

**Success Response (201):**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "review": {
    "id": 1,
    "assignmentId": 1,
    "reviewerId": 5,
    "reviewerName": "Jane Smith",
    "reviewedProfessionalId": 1,
    "rating": 5,
    "comment": "Excellent work! John delivered exactly what we needed on time.",
    "isAnonymous": false,
    "createdAt": "2026-04-19T18:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Validation error
- `401`: Unauthorized
- `404`: Assignment not found
- `409`: Review already exists for this assignment

---

### 37. Get Professional Reviews

**Endpoint:** `GET /reviews/professional/:professionalId`

**Authentication:** Optional

**Description:** Get all reviews for a professional

**URL Parameters:**
- `professionalId` (required): Professional (user) ID

**Query Parameters:**
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 10
- `sortBy` (optional): enum [`createdAt`, `rating`], default: `createdAt`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": 1,
        "reviewerId": 5,
        "reviewerName": "Jane Smith",
        "rating": 5,
        "comment": "Excellent work! John delivered exactly what we needed on time.",
        "isAnonymous": false,
        "createdAt": "2026-04-19T18:00:00Z"
      }
    ],
    "summary": {
      "totalReviews": 18,
      "averageRating": 4.8,
      "ratingDistribution": {
        "5": 15,
        "4": 2,
        "3": 1,
        "2": 0,
        "1": 0
      }
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 18,
      "totalPages": 2
    }
  }
}
```

**Error Responses:**
- `404`: Professional not found

---

## Messaging Endpoints (Phase 2+)

### 38. Send Message

**Endpoint:** `POST /messages`

**Authentication:** Required

**Description:** Send message to another user

**Request Body:**
```json
{
  "recipientId": 10,
  "content": "Hi John, I'm interested in your React skills. Do you have availability?"
}
```

**Request Validation:**
- `recipientId` (required): User must exist
- `content` (required): string, min: 1 char, max: 5000 chars

**Success Response (201):**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": 1,
    "senderId": 5,
    "recipientId": 10,
    "content": "Hi John, I'm interested in your React skills. Do you have availability?",
    "isRead": false,
    "createdAt": "2026-04-19T19:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Validation error
- `401`: Unauthorized
- `404`: Recipient not found

---

### 39. Get Conversation

**Endpoint:** `GET /messages/conversation/:userId`

**Authentication:** Required

**Description:** Get message conversation with another user

**URL Parameters:**
- `userId` (required): Other user's ID

**Query Parameters:**
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 50

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 1,
        "senderId": 5,
        "senderName": "Jane Smith",
        "recipientId": 10,
        "content": "Hi John, I'm interested in your React skills.",
        "isRead": true,
        "readAt": "2026-04-19T19:30:00Z",
        "createdAt": "2026-04-19T19:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 12,
      "totalPages": 1
    }
  }
}
```

**Error Responses:**
- `401`: Unauthorized
- `404`: User not found

---

### 40. Get User Inbox

**Endpoint:** `GET /messages/inbox`

**Authentication:** Required

**Description:** Get list of conversations (inbox)

**Query Parameters:**
- `unreadOnly` (optional): boolean, default: false
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 20

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": 1,
        "userId": 10,
        "userName": "John Doe",
        "profileImageUrl": "https://...",
        "lastMessage": "Thanks for the opportunity!",
        "lastMessageTime": "2026-04-19T20:00:00Z",
        "unreadCount": 2,
        "isRead": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

**Error Responses:**
- `401`: Unauthorized

---

### 41. Mark Message as Read

**Endpoint:** `PUT /messages/:messageId/read`

**Authentication:** Required

**Description:** Mark a message as read

**URL Parameters:**
- `messageId` (required): Message ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Message marked as read"
}
```

**Error Responses:**
- `401`: Unauthorized
- `404`: Message not found

---

### 42. Mark Conversation as Read

**Endpoint:** `PUT /messages/conversation/:userId/read-all`

**Authentication:** Required

**Description:** Mark all messages in conversation as read

**URL Parameters:**
- `userId` (required): Other user's ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "All messages marked as read"
}
```

**Error Responses:**
- `401`: Unauthorized
- `404`: Conversation not found

---

## Response Formats & Error Codes

### Standard Success Response Format

**201 Created / 200 OK:**
```json
{
  "success": true,
  "message": "Operation successful",
  "user": { ... },
  "data": { ... }
}
```

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error description"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| **200** | OK | GET request succeeded |
| **201** | Created | POST request created resource |
| **204** | No Content | DELETE request succeeded |
| **400** | Bad Request | Invalid input data |
| **401** | Unauthorized | No/invalid token |
| **403** | Forbidden | User lacks permission |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Resource already exists |
| **422** | Unprocessable Entity | Validation failed |
| **500** | Server Error | Internal server error |
| **503** | Service Unavailable | Database/service down |

### Common Error Messages

```json
{
  "success": false,
  "message": "Invalid email or password",
  "details": []
}
```

```json
{
  "success": false,
  "message": "Validation error",
  "details": [
    {
      "field": "email",
      "error": "Invalid email format"
    }
  ]
}
```

---

## Phase Implementation Timeline

| Phase | Duration | Endpoints |
|-------|----------|-----------|
| **Phase 1** | Weeks 1-3 | 1-8 (Auth + User) |
| **Phase 2** | Weeks 4-6 | 9-32 (Profiles + Skills + Search) |
| **Phase 3** | Weeks 7-9 | 19-29 (Jobs + Assignments) |
| **Phase 4** | Weeks 10-12 | 33-42 (Payments + Reviews + Messaging) |

---

**Total Endpoints:** 42  
**Phase 1 Endpoints:** 8  
**Phase 2 Endpoints:** 24  
**Phase 3 Endpoints:** 11  
**Phase 4 Endpoints:** 10  

---

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Owner:** Backend Team  

