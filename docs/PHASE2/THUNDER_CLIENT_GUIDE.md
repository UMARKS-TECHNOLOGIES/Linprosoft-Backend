# Thunder Client - Phase 2 Testing Guide

## Overview

This guide explains how to test all Phase 2 professional profile endpoints using Thunder Client. Phase 2 includes profile management, skill tracking, certifications, portfolio items, and professional search functionality.

**Phase 2 Modules:**
1. **Profiles** - Professional profile CRUD operations
2. **Skills** - Skill catalog and profile skill management
3. **Certifications** - Professional certifications with date validation
4. **Portfolio** - Portfolio projects and achievements
5. **Search** - Advanced search with filters, pagination, and sorting

---

## Installation & Setup

### Step 1: Install Thunder Client Extension
```
VS Code Extensions → Search "Thunder Client" 
Publisher: Thunder Client
Install the extension
```

### Step 2: Import the Test Collection
```
1. Open Thunder Client panel (left sidebar)
2. Click "Collections" icon
3. Click "Import"
4. Select: Thunder-Client-Collection-Phase2.json
5. Collection "Linkprosoft Professional API - Phase 2" imported ✅
```

### Step 3: Set Environment Variables
```
Thunder Client → Collections → Select collection → Env
Add variables:
{
  "baseUrl": "http://localhost:5020",
  "userId": "1",
  "profileId": "1",
  "skillId": "1",
  "certificationId": "1",
  "portfolioItemId": "1",
  "token": "your-jwt-token"
}
```

### Step 4: Start Your Backend Server
```bash
cd linkprosoft_backend
npm install
npm run dev
# Server should start on http://localhost:5020
```

---

## Test Execution Strategy

### Recommended Order

**Phase 1: Setup (Run First)**
- Health Check - Verify server is running
- Signup Professional User - Create test account
- Signup Employer - Create employer account (for context)

**Phase 2: Profile Operations**
1. Create Professional Profile
2. Get My Profile
3. Get Profile by User ID
4. Get Detailed Profile (with relations)
5. Update Profile
6. Delete Profile

**Phase 3: Skills Operations**
1. Get All Skills (Catalog)
2. Add Skill to Profile
3. Get Profile Skills
4. Update Profile Skill
5. Remove Skill from Profile

**Phase 4: Certifications**
1. Create Certification
2. Get Certifications
3. Update Certification
4. Delete Certification

**Phase 5: Portfolio**
1. Create Portfolio Item
2. Get Portfolio Items
3. Update Portfolio Item
4. Delete Portfolio Item

**Phase 6: Search & Filters**
1. Get Filter Options
2. Search Professionals (Basic)
3. Search with Skill Filters
4. Search with Rating Filters
5. Search with Rate Filters
6. Search with Pagination
7. Search with Sorting
8. Skills Autocomplete

---

## Authentication

All authenticated endpoints require:
- **Header:** `Cookie: access_token=<JWT_TOKEN>`
- **JWT Token:** Returned from signup or login
- **Duration:** Valid for 7 days

### Getting Auth Token

1. Run "Signup Professional User" request
2. Copy the JWT token from response
3. Set environment variable: `token=<JWT_TOKEN>`
4. Use in Cookie header for authenticated endpoints

---

## Profile Endpoints

### 1. POST /api/profiles - Create Professional Profile

**Authentication:** Required (JWT token)  
**Status Code:** 201 Created

**Headers:**
```
Content-Type: application/json
Cookie: access_token={{token}}
```

**Request Body:**
```json
{
  "hourlyRate": 5000,
  "bio": "Experienced Node.js and React developer with 5+ years experience",
  "availabilityStatus": "available",
  "responseTimeHours": 24
}
```

**Optional Fields:**
```json
{
  "hourlyRate": 5000,              // 1 - 1,000,000
  "bio": "...",                     // 0 - 2000 chars
  "availabilityStatus": "available", // available | unavailable | away
  "responseTimeHours": 24           // 1 - 720 hours
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Professional profile created successfully",
  "data": {
    "profile": {
      "id": 1,
      "userId": 5,
      "hourlyRate": 5000,
      "bio": "Experienced developer...",
      "availabilityStatus": "available",
      "responseTimeHours": 24,
      "totalHoursWorked": 0,
      "avgRating": 0,
      "totalReviews": 0,
      "createdAt": "2026-04-23T10:00:00Z",
      "updatedAt": "2026-04-23T10:00:00Z"
    }
  },
  "timestamp": "2026-04-23T10:00:00.000Z"
}
```

**Error Responses:**
- **401 Unauthorized:** No token or expired token
- **403 Forbidden:** User is not professional type
- **409 Conflict:** Profile already exists for user
- **400 Bad Request:** Validation error

---

### 2. GET /api/profiles/me - Get My Profile

**Authentication:** Required (JWT token)  
**Status Code:** 200 OK

**Headers:**
```
Cookie: access_token={{token}}
```

**Query Parameters:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": 1,
      "userId": 5,
      "hourlyRate": 5000,
      "bio": "Experienced developer...",
      "availabilityStatus": "available",
      "responseTimeHours": 24,
      "totalHoursWorked": 100,
      "avgRating": 4.8,
      "totalReviews": 5,
      "createdAt": "2026-04-23T10:00:00Z",
      "updatedAt": "2026-04-23T10:00:00Z"
    }
  },
  "timestamp": "2026-04-23T10:00:00.000Z"
}
```

---

### 3. GET /api/profiles/:userId - Get Profile by User ID

**Authentication:** Not required (public)  
**Status Code:** 200 OK

**URL Parameter:**
```
:userId = positive integer
```

**Example URL:**
```
GET /api/profiles/5
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": 1,
      "userId": 5,
      "hourlyRate": 5000,
      "bio": "Experienced developer...",
      "availabilityStatus": "available",
      "responseTimeHours": 24,
      "totalHoursWorked": 100,
      "avgRating": 4.8,
      "totalReviews": 5,
      "createdAt": "2026-04-23T10:00:00Z",
      "updatedAt": "2026-04-23T10:00:00Z"
    }
  }
}
```

**Error Responses:**
- **404 Not Found:** User has no profile or user doesn't exist

---

### 4. GET /api/profiles/:userId/detailed - Get Detailed Profile with Relations

**Authentication:** Not required (public)  
**Status Code:** 200 OK

**URL Parameter:**
```
:userId = positive integer
```

**Example URL:**
```
GET /api/profiles/5/detailed
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": 1,
      "userId": 5,
      "hourlyRate": 5000,
      "bio": "Experienced developer...",
      "availabilityStatus": "available",
      "responseTimeHours": 24,
      "totalHoursWorked": 100,
      "avgRating": 4.8,
      "totalReviews": 5,
      "createdAt": "2026-04-23T10:00:00Z",
      "updatedAt": "2026-04-23T10:00:00Z",
      "skills": [
        {
          "skillId": 1,
          "name": "TypeScript",
          "category": "Language",
          "description": "Typed superset of JavaScript",
          "proficiencyLevel": "expert",
          "yearsOfExperience": 5,
          "isPrimary": true
        },
        {
          "skillId": 2,
          "name": "Node.js",
          "category": "Runtime",
          "proficiencyLevel": "expert",
          "yearsOfExperience": 5,
          "isPrimary": false
        }
      ],
      "certifications": [
        {
          "id": 1,
          "title": "AWS Solutions Architect",
          "issuer": "Amazon Web Services",
          "issueDate": "2024-01-15",
          "expiryDate": "2026-01-15",
          "credentialUrl": "https://aws.amazon.com/certification",
          "createdAt": "2026-04-23T10:00:00Z"
        }
      ],
      "portfolioItems": [
        {
          "id": 1,
          "title": "E-commerce Platform",
          "description": "Full-stack e-commerce built with Node.js and React",
          "imageUrl": "https://example.com/image.jpg",
          "linkUrl": "https://github.com/user/ecommerce",
          "createdAt": "2026-04-23T10:00:00Z"
        }
      ]
    }
  }
}
```

---

### 5. PUT /api/profiles/me - Update My Profile

**Authentication:** Required (JWT token)  
**Status Code:** 200 OK

**Headers:**
```
Content-Type: application/json
Cookie: access_token={{token}}
```

**Request Body (Partial Updates Allowed):**
```json
{
  "hourlyRate": 6000,
  "bio": "Updated bio",
  "availabilityStatus": "away",
  "responseTimeHours": 12
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "profile": {
      "id": 1,
      "userId": 5,
      "hourlyRate": 6000,
      "bio": "Updated bio",
      "availabilityStatus": "away",
      "responseTimeHours": 12,
      "totalHoursWorked": 100,
      "avgRating": 4.8,
      "totalReviews": 5,
      "createdAt": "2026-04-23T10:00:00Z",
      "updatedAt": "2026-04-23T10:05:00Z"
    }
  }
}
```

**Error Responses:**
- **401 Unauthorized:** No token
- **404 Not Found:** Profile doesn't exist
- **400 Bad Request:** Validation error or empty body

---

### 6. DELETE /api/profiles/me - Delete My Profile

**Authentication:** Required (JWT token)  
**Status Code:** 204 No Content

**Headers:**
```
Cookie: access_token={{token}}
```

**Success Response (204):**
```
No content body
```

**Cascade Delete:** Also deletes:
- All skills linked to this profile
- All certifications
- All portfolio items
- All reviews/ratings

---

## Skill Endpoints

### 1. GET /api/skills - Get All Skills (Catalog)

**Authentication:** Not required (public)  
**Status Code:** 200 OK

**Query Parameters:**
```
limit:  1-100 (default: 20)
offset: ≥0 (default: 0)
```

**Example URLs:**
```
GET /api/skills
GET /api/skills?limit=20&offset=0
GET /api/skills?limit=50&offset=20
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "id": 1,
        "name": "TypeScript",
        "category": "Language",
        "description": "Typed superset of JavaScript",
        "createdAt": "2026-04-20T10:00:00Z"
      },
      {
        "id": 2,
        "name": "Node.js",
        "category": "Runtime",
        "description": "JavaScript runtime built on Chrome's V8",
        "createdAt": "2026-04-20T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "limit": 20,
      "offset": 0,
      "totalPages": 3
    }
  }
}
```

**Test Cases:**
```
✓ No parameters (default pagination)
✓ With limit=10
✓ With offset=20
✓ Last page handling
✓ Invalid limit (> 100) → 400
✓ Negative offset → 400
```

---

### 2. POST /api/skills/me/skills - Add Skill to Profile

**Authentication:** Required (JWT token)  
**Status Code:** 201 Created

**Headers:**
```
Content-Type: application/json
Cookie: access_token={{token}}
```

**Request Body:**
```json
{
  "skillId": 1,
  "proficiencyLevel": "expert",
  "yearsOfExperience": 5,
  "isPrimary": true
}
```

**Field Details:**
```
skillId: required (1-∞)
proficiencyLevel: optional - "beginner" | "intermediate" | "expert" (default: "intermediate")
yearsOfExperience: optional (0-80, default: 0)
isPrimary: optional (default: false)
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Skill added to profile successfully",
  "data": {
    "skill": {
      "id": 1,
      "skillId": 1,
      "professionalId": 5,
      "proficiencyLevel": "expert",
      "yearsOfExperience": 5,
      "isPrimary": true,
      "createdAt": "2026-04-23T10:00:00Z"
    }
  }
}
```

**Error Responses:**
- **401 Unauthorized:** No token
- **409 Conflict:** Skill already on profile
- **404 Not Found:** Skill doesn't exist in catalog
- **400 Bad Request:** Invalid proficiency level

---

### 3. GET /api/skills/:userId/skills - Get Profile Skills

**Authentication:** Not required (public)  
**Status Code:** 200 OK

**URL Parameter:**
```
:userId = positive integer
```

**Example URL:**
```
GET /api/skills/5/skills
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "skillId": 1,
        "name": "TypeScript",
        "category": "Language",
        "proficiencyLevel": "expert",
        "yearsOfExperience": 5,
        "isPrimary": true
      },
      {
        "skillId": 2,
        "name": "Node.js",
        "category": "Runtime",
        "proficiencyLevel": "intermediate",
        "yearsOfExperience": 3,
        "isPrimary": false
      }
    ]
  }
}
```

---

### 4. PUT /api/skills/me/skills/:skillId - Update Profile Skill

**Authentication:** Required (JWT token)  
**Status Code:** 200 OK

**Headers:**
```
Content-Type: application/json
Cookie: access_token={{token}}
```

**URL Parameter:**
```
:skillId = positive integer (skill's ID on profile)
```

**Request Body (Partial Updates Allowed):**
```json
{
  "proficiencyLevel": "expert",
  "yearsOfExperience": 6,
  "isPrimary": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Skill updated successfully",
  "data": {
    "skill": {
      "id": 1,
      "skillId": 1,
      "proficiencyLevel": "expert",
      "yearsOfExperience": 6,
      "isPrimary": true
    }
  }
}
```

---

### 5. DELETE /api/skills/me/skills/:skillId - Remove Skill from Profile

**Authentication:** Required (JWT token)  
**Status Code:** 204 No Content

**Headers:**
```
Cookie: access_token={{token}}
```

**URL Parameter:**
```
:skillId = positive integer
```

**Success Response (204):**
```
No content body
```

---

### 6. GET /api/skills (Alternative) - List All Available Skills

Same as endpoint 1, but useful for skill selection dropdowns in frontend.

---

## Certification Endpoints

### 1. POST /api/certifications/me - Create Certification

**Authentication:** Required (JWT token)  
**Status Code:** 201 Created

**Headers:**
```
Content-Type: application/json
Cookie: access_token={{token}}
```

**Request Body:**
```json
{
  "title": "AWS Solutions Architect Associate",
  "issuer": "Amazon Web Services",
  "issueDate": "2024-01-15",
  "expiryDate": "2026-01-15",
  "credentialUrl": "https://aws.amazon.com/verification"
}
```

**Field Details:**
```
title: required (1-255 chars)
issuer: optional (0-255 chars)
issueDate: optional (format: YYYY-MM-DD)
expiryDate: optional (format: YYYY-MM-DD, must be ≥ issueDate)
credentialUrl: optional (must be valid URL, max 1000 chars)
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Certification added successfully",
  "data": {
    "certification": {
      "id": 1,
      "professionalId": 5,
      "title": "AWS Solutions Architect",
      "issuer": "Amazon Web Services",
      "issueDate": "2024-01-15",
      "expiryDate": "2026-01-15",
      "credentialUrl": "https://aws.amazon.com/verification",
      "createdAt": "2026-04-23T10:00:00Z"
    }
  }
}
```

**Error Responses:**
- **401 Unauthorized:** No token
- **400 Bad Request:** Invalid dates, expiryDate < issueDate

---

### 2. GET /api/certifications/:userId - Get User Certifications

**Authentication:** Not required (public)  
**Status Code:** 200 OK

**URL Parameter:**
```
:userId = positive integer
```

**Example URL:**
```
GET /api/certifications/5
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "certifications": [
      {
        "id": 1,
        "title": "AWS Solutions Architect",
        "issuer": "Amazon Web Services",
        "issueDate": "2024-01-15",
        "expiryDate": "2026-01-15",
        "credentialUrl": "https://aws.amazon.com/verification",
        "isExpired": false,
        "createdAt": "2026-04-23T10:00:00Z"
      }
    ]
  }
}
```

---

### 3. PUT /api/certifications/me/:certificationId - Update Certification

**Authentication:** Required (JWT token)  
**Status Code:** 200 OK

**Headers:**
```
Content-Type: application/json
Cookie: access_token={{token}}
```

**URL Parameter:**
```
:certificationId = positive integer
```

**Request Body (Partial Updates Allowed):**
```json
{
  "title": "AWS Solutions Architect Professional",
  "expiryDate": "2027-01-15"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Certification updated successfully",
  "data": {
    "certification": {
      "id": 1,
      "title": "AWS Solutions Architect Professional",
      "issuer": "Amazon Web Services",
      "issueDate": "2024-01-15",
      "expiryDate": "2027-01-15",
      "credentialUrl": "https://aws.amazon.com/verification",
      "createdAt": "2026-04-23T10:00:00Z"
    }
  }
}
```

---

### 4. DELETE /api/certifications/me/:certificationId - Delete Certification

**Authentication:** Required (JWT token)  
**Status Code:** 204 No Content

**Headers:**
```
Cookie: access_token={{token}}
```

**URL Parameter:**
```
:certificationId = positive integer
```

**Success Response (204):**
```
No content body
```

---

## Portfolio Endpoints

### 1. POST /api/portfolio/me - Create Portfolio Item

**Authentication:** Required (JWT token)  
**Status Code:** 201 Created

**Headers:**
```
Content-Type: application/json
Cookie: access_token={{token}}
```

**Request Body:**
```json
{
  "title": "E-commerce Platform",
  "description": "Full-stack e-commerce application built with Node.js and React. Features include user authentication, product catalog, shopping cart, and payment integration.",
  "imageUrl": "https://example.com/portfolio/ecommerce.jpg",
  "linkUrl": "https://github.com/user/ecommerce-platform"
}
```

**Field Details:**
```
title: required (1-255 chars)
description: optional (0-5000 chars)
imageUrl: optional (must be valid URL, max 1000 chars)
linkUrl: optional (must be valid URL, max 1000 chars)
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Portfolio item created successfully",
  "data": {
    "portfolioItem": {
      "id": 1,
      "professionalId": 5,
      "title": "E-commerce Platform",
      "description": "Full-stack e-commerce application...",
      "imageUrl": "https://example.com/portfolio/ecommerce.jpg",
      "linkUrl": "https://github.com/user/ecommerce-platform",
      "createdAt": "2026-04-23T10:00:00Z"
    }
  }
}
```

---

### 2. GET /api/portfolio/:userId - Get User Portfolio

**Authentication:** Not required (public)  
**Status Code:** 200 OK

**URL Parameter:**
```
:userId = positive integer
```

**Example URL:**
```
GET /api/portfolio/5
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "portfolioItems": [
      {
        "id": 1,
        "title": "E-commerce Platform",
        "description": "Full-stack e-commerce application...",
        "imageUrl": "https://example.com/portfolio/ecommerce.jpg",
        "linkUrl": "https://github.com/user/ecommerce-platform",
        "createdAt": "2026-04-23T10:00:00Z"
      },
      {
        "id": 2,
        "title": "Mobile App",
        "description": "React Native mobile application...",
        "imageUrl": "https://example.com/portfolio/mobile.jpg",
        "linkUrl": "https://github.com/user/mobile-app",
        "createdAt": "2026-04-22T10:00:00Z"
      }
    ]
  }
}
```

---

### 3. PUT /api/portfolio/me/:portfolioItemId - Update Portfolio Item

**Authentication:** Required (JWT token)  
**Status Code:** 200 OK

**Headers:**
```
Content-Type: application/json
Cookie: access_token={{token}}
```

**URL Parameter:**
```
:portfolioItemId = positive integer
```

**Request Body (Partial Updates Allowed):**
```json
{
  "description": "Updated description...",
  "imageUrl": "https://example.com/new-image.jpg"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Portfolio item updated successfully",
  "data": {
    "portfolioItem": {
      "id": 1,
      "title": "E-commerce Platform",
      "description": "Updated description...",
      "imageUrl": "https://example.com/new-image.jpg",
      "linkUrl": "https://github.com/user/ecommerce-platform"
    }
  }
}
```

---

### 4. DELETE /api/portfolio/me/:portfolioItemId - Delete Portfolio Item

**Authentication:** Required (JWT token)  
**Status Code:** 204 No Content

**Headers:**
```
Cookie: access_token={{token}}
```

**URL Parameter:**
```
:portfolioItemId = positive integer
```

**Success Response (204):**
```
No content body
```

---

## Search Endpoints

### 1. GET /api/search/filters - Get Available Filters

**Authentication:** Not required (public)  
**Status Code:** 200 OK

**Query Parameters:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "filters": {
      "skills": [
        {
          "id": 1,
          "name": "TypeScript",
          "category": "Language"
        },
        {
          "id": 2,
          "name": "Node.js",
          "category": "Runtime"
        }
      ],
      "availabilityStatuses": ["available", "unavailable", "away"],
      "ratingRange": {
        "min": 0,
        "max": 5
      },
      "rateRange": {
        "min": 1000,
        "max": 100000
      }
    }
  }
}
```

---

### 2. GET /api/search/professionals - Search Professionals

**Authentication:** Not required (public)  
**Status Code:** 200 OK

**Query Parameters:**
```
skills: comma-separated IDs or array (e.g., "1,2,3")
minRating: 0-5
maxRating: 0-5
minRate: ≥ 0
maxRate: ≥ 0
availabilityStatus: "available" | "unavailable" | "away"
sortBy: "rating_desc" | "rate_asc" | "recent_desc" (default: "rating_desc")
page: ≥ 1 (default: 1)
limit: 1-100 (default: 20)
```

**Example URLs:**
```
GET /api/search/professionals
GET /api/search/professionals?minRating=4&maxRating=5
GET /api/search/professionals?minRate=5000&maxRate=10000
GET /api/search/professionals?skills=1,2,3
GET /api/search/professionals?availabilityStatus=available
GET /api/search/professionals?sortBy=rating_desc&page=1&limit=20
GET /api/search/professionals?skills=1&minRate=5000&maxRate=10000&sortBy=rating_desc&limit=10
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "professionals": [
      {
        "id": 5,
        "firstName": "John",
        "lastName": "Doe",
        "hourlyRate": 5000,
        "bio": "Experienced developer...",
        "availabilityStatus": "available",
        "avgRating": 4.8,
        "totalReviews": 5,
        "totalHoursWorked": 100,
        "skills": [
          {
            "id": 1,
            "name": "TypeScript",
            "category": "Language",
            "proficiencyLevel": "expert"
          }
        ]
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

**Test Cases:**
```
✓ No filters (basic search)
✓ Filter by single skill
✓ Filter by multiple skills
✓ Filter by rating range
✓ Filter by hourly rate range
✓ Filter by availability status
✓ Sort by rating descending
✓ Sort by rate ascending
✓ Sort by recent
✓ Pagination - page 1
✓ Pagination - page 2
✓ Combined filters with pagination
✓ Invalid rating > 5 → 400
✓ minRate > maxRate → 400
```

---

### 3. GET /api/search/skills - Skills Autocomplete

**Authentication:** Not required (public)  
**Status Code:** 200 OK

**Query Parameters:**
```
q: required (1-100 chars, search query)
limit: optional (1-50, default: 10)
```

**Example URLs:**
```
GET /api/search/skills?q=type
GET /api/search/skills?q=javascript&limit=5
GET /api/search/skills?q=react&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "id": 1,
        "name": "TypeScript",
        "category": "Language"
      },
      {
        "id": 12,
        "name": "Styled Components",
        "category": "CSS-in-JS"
      }
    ]
  }
}
```

**Test Cases:**
```
✓ Search prefix match (case-insensitive)
✓ Limit results to 5
✓ Return 0 results for no match
✓ Missing query parameter → 400
✓ Query too short (< 1 char) → 400
✓ Query too long (> 100 chars) → 400
```

---

## Common Testing Scenarios

### Scenario 1: Complete Profile Setup

```
1. Signup Professional User
   ↓
2. Create Professional Profile
   ↓
3. Add Skill to Profile (TypeScript, Expert)
   ↓
4. Add Skill to Profile (Node.js, Intermediate)
   ↓
5. Create Certification (AWS)
   ↓
6. Create Portfolio Item (E-commerce)
   ↓
7. Get Detailed Profile (verify all relations)
```

### Scenario 2: Search Discovery

```
1. Get Filter Options
   ↓
2. Search Professionals (basic)
   ↓
3. Filter by Skill (TypeScript)
   ↓
4. Filter by Rating (≥4.5)
   ↓
5. Filter by Rate (5000-8000)
   ↓
6. Autocomplete Skill Search
```

### Scenario 3: Profile Updates

```
1. Create Profile
   ↓
2. Update Hourly Rate
   ↓
3. Update Bio
   ↓
4. Update Skills (proficiency)
   ↓
5. Get Updated Profile (verify changes)
```

---

## Error Handling Guide

### 400 Bad Request - Validation Error

**Common Causes:**
- Invalid data types
- Missing required fields
- Out-of-range values
- Invalid enum values
- Malformed URLs

**Debug Steps:**
1. Check request body matches schema
2. Verify parameter types (string vs number)
3. Check date format (YYYY-MM-DD)
4. Verify enum values

### 401 Unauthorized

**Causes:**
- Missing or expired JWT token
- Invalid token

**Fix:**
1. Verify cookie header: `Cookie: access_token={{token}}`
2. Run signup to get new token
3. Update environment variable: `token={{new_token}}`

### 403 Forbidden

**Causes:**
- User type not professional (trying to create profile as employer)
- Trying to modify another user's data

**Fix:**
1. Use professional signup for profile operations
2. Only modify `/me` endpoints with authenticated user

### 404 Not Found

**Causes:**
- Resource doesn't exist
- Wrong user ID
- Skill/certification/portfolio item not found

**Fix:**
1. Verify resource was created
2. Check correct user ID used
3. Use returned IDs from creation responses

### 409 Conflict

**Causes:**
- Profile already exists
- Skill already added to profile

**Fix:**
1. For duplicate profile: Delete existing first
2. For duplicate skill: Check existing skills before adding

---

## Best Practices

1. **Test Order:** Follow recommended order (don't skip setup steps)
2. **Save IDs:** Copy resource IDs from responses for subsequent requests
3. **Update Environment:** Keep token and IDs in environment variables
4. **Check Timestamps:** Verify `createdAt` and `updatedAt` fields
5. **Pagination:** Test with different limit/offset values
6. **Filter Combinations:** Test multiple filters together
7. **Error Cases:** Test invalid inputs, missing required fields
8. **Clean Up:** Delete test resources after testing

---

## Troubleshooting

### "Cannot connect to server"
- Verify backend running: `npm run dev`
- Check port 5020 is not blocked
- Verify BASE_URL in environment

### "401 Unauthorized"
- Signup fresh user
- Update token in environment
- Verify cookie header format

### "Validation error"
- Check request body format
- Verify field types and ranges
- Check date formats (YYYY-MM-DD)

### "404 Not Found"
- Verify resource was created
- Check correct IDs used
- Verify correct user context

