# Phase 2 Thunder Client - Quick Reference

## Files Created

### 1. **THUNDER_CLIENT_GUIDE.md**
Comprehensive guide covering:
- Installation & setup instructions
- All 19 endpoints with detailed documentation
- Request/response examples for each
- Query parameters and path parameters
- Error handling and debugging
- Common testing scenarios
- Best practices

**Location:** `docs/PHASE2/THUNDER_CLIENT_GUIDE.md`

### 2. **Thunder-Client-Collection-Phase2.json**
Pre-built test collection for Thunder Client:
- 30+ ready-to-use API test requests
- Organized by module (Profiles, Skills, Certifications, Portfolio, Search)
- Automatic token/ID extraction for sequential testing
- Sample request bodies and expected responses

**Location:** `docs/PHASE2/Thunder-Client-Collection-Phase2.json`

---

## Quick Start (5 minutes)

### Step 1: Import Collection
```
1. Open VS Code
2. Install Thunder Client extension (search in Extensions)
3. Click Thunder Client icon (left sidebar)
4. Click "Collections" tab
5. Click "Import" button
6. Select: Thunder-Client-Collection-Phase2.json
```

### Step 2: Set Environment
```
Collections → Right-click collection → Environment
Add these variables:
{
  "token": "",
  "userId": "",
  "profileId": "",
  "skillId": ""
}
```

### Step 3: Run Tests in Order
```
1. Run "Signup Professional User" → Gets token automatically
2. Run "Create Profile"
3. Run "Get Skills Catalog"
4. Add more skills, certifications, portfolio items
5. Test search endpoints
```

---

## Endpoint Summary

### Profiles (6 endpoints)
- ✅ POST /api/profiles → Create profile (auth required)
- ✅ GET /api/profiles/me → Get my profile (auth required)
- ✅ GET /api/profiles/{userId} → Get any profile (public)
- ✅ GET /api/profiles/{userId}/detailed → Get profile with relations (public)
- ✅ PUT /api/profiles/me → Update profile (auth required)
- ✅ DELETE /api/profiles/me → Delete profile (auth required)

### Skills (6 endpoints)
- ✅ GET /api/skills → Get skill catalog with pagination (public)
- ✅ POST /api/skills/me/skills → Add skill to profile (auth required)
- ✅ GET /api/skills/{userId}/skills → Get profile skills (public)
- ✅ PUT /api/skills/me/skills/{skillId} → Update skill (auth required)
- ✅ DELETE /api/skills/me/skills/{skillId} → Remove skill (auth required)

### Certifications (4 endpoints)
- ✅ POST /api/certifications/me/certifications → Create cert (auth required)
- ✅ GET /api/certifications/{userId}/certifications → List certs (public)
- ✅ PUT /api/certifications/me/certifications/{certId} → Update cert (auth required)
- ✅ DELETE /api/certifications/me/certifications/{certId} → Delete cert (auth required)

### Portfolio (4 endpoints)
- ✅ POST /api/portfolio/me/portfolio → Create item (auth required)
- ✅ GET /api/portfolio/{userId}/portfolio → List items (public)
- ✅ PUT /api/portfolio/me/portfolio/{itemId} → Update item (auth required)
- ✅ DELETE /api/portfolio/me/portfolio/{itemId} → Delete item (auth required)

### Search (3 endpoints)
- ✅ GET /api/search/filters → Get filter options (public)
- ✅ GET /api/search/professionals → Search professionals with filters (public)
- ✅ GET /api/search/skills → Skills autocomplete (public)

---

## Common Testing Patterns

### Pattern 1: Complete Profile Creation
```
1. Signup Professional
2. Create Profile
   - hourlyRate: 5000
   - bio: "Developer"
   - availabilityStatus: "available"
3. Get All Skills
4. Add Skills (TypeScript, Node.js, React)
5. Create Certification
6. Create Portfolio Item
7. Get Detailed Profile (verify all relations)
```

### Pattern 2: Search Discovery
```
1. Get Filters (understand available options)
2. Search Basic (no filters)
3. Filter by Skills (e.g., TypeScript)
4. Filter by Rating (e.g., ≥4.5)
5. Filter by Rate (e.g., 5000-8000)
6. Combine multiple filters
7. Test pagination (page 1, page 2)
8. Test sorting (rating, rate, recent)
9. Skills autocomplete (e.g., type-)
```

### Pattern 3: Update Workflow
```
1. Create Profile
2. Update hourly rate
3. Update bio
4. Add skill
5. Update skill proficiency
6. Create certification
7. Update certification dates
8. Get detailed profile (verify all updates)
```

---

## Request/Response Quick Reference

### Profile Creation Request
```json
POST /api/profiles
{
  "hourlyRate": 5000,
  "bio": "Experienced developer",
  "availabilityStatus": "available",
  "responseTimeHours": 24
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": 1,
      "hourlyRate": 5000,
      "bio": "Experienced developer",
      ...
    }
  }
}
```

### Search Professionals Request
```
GET /api/search/professionals?
  skills=1,2,3&
  minRating=4&
  maxRating=5&
  minRate=5000&
  maxRate=10000&
  sortBy=rating_desc&
  page=1&
  limit=20
```

Response (200):
```json
{
  "success": true,
  "data": {
    "professionals": [
      {
        "id": 5,
        "firstName": "John",
        "hourlyRate": 5000,
        "avgRating": 4.8,
        "skills": [...]
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

---

## Authentication

### Get Token
1. Run "Signup Professional User" request
2. Token automatically extracted and set in environment

### Use Token
All authenticated endpoints automatically include:
```
Cookie: access_token={{token}}
```

### Token Expiry
- Valid for: 7 days
- When expired: Run signup again to get new token

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot connect` | Server not running | `npm run dev` in backend folder |
| `401 Unauthorized` | No/expired token | Run "Signup" request |
| `400 Bad Request` | Invalid data | Check request body format |
| `404 Not Found` | Resource not found | Verify resource was created |
| `409 Conflict` | Duplicate (e.g., profile exists) | Delete existing resource first |

---

## Testing Checklist

### Setup Phase
- [ ] Backend running on :5020
- [ ] Thunder Client installed
- [ ] Collection imported
- [ ] Environment variables set

### Profile Phase
- [ ] Create profile ✅
- [ ] Get my profile ✅
- [ ] Get profile by ID ✅
- [ ] Get detailed profile ✅
- [ ] Update profile ✅
- [ ] Delete profile ✅

### Skills Phase
- [ ] Get all skills ✅
- [ ] Add skill to profile ✅
- [ ] Get profile skills ✅
- [ ] Update skill ✅
- [ ] Remove skill ✅

### Certifications Phase
- [ ] Create certification ✅
- [ ] List certifications ✅
- [ ] Update certification ✅
- [ ] Delete certification ✅

### Portfolio Phase
- [ ] Create portfolio item ✅
- [ ] List portfolio items ✅
- [ ] Update portfolio item ✅
- [ ] Delete portfolio item ✅

### Search Phase
- [ ] Get available filters ✅
- [ ] Search (no filters) ✅
- [ ] Filter by skills ✅
- [ ] Filter by rating ✅
- [ ] Filter by rate ✅
- [ ] Test pagination ✅
- [ ] Test sorting ✅
- [ ] Skill autocomplete ✅

---

## Advanced Features

### Pagination
```
Limit results: ?limit=10
Skip results: ?offset=20
Get page 2: ?page=2&limit=20
```

### Sorting
```
By rating (desc): ?sortBy=rating_desc
By rate (asc): ?sortBy=rate_asc
By recent: ?sortBy=recent_desc
```

### Filters
```
Skills: ?skills=1,2,3 (comma-separated IDs)
Rating: ?minRating=4&maxRating=5
Rate: ?minRate=5000&maxRate=10000
Availability: ?availabilityStatus=available
```

### Complex Queries
```
GET /api/search/professionals?
  skills=1,2&
  minRate=5000&
  maxRate=10000&
  minRating=4&
  sortBy=rating_desc&
  page=1&
  limit=10
```

---

## Notes

- All endpoints validated with Zod schemas
- Parameterized queries prevent SQL injection
- Cascade delete removes related records
- Duplicate detection on profile/skills
- Public endpoints require no authentication
- Response format standardized with ApiResponseHandler

---

## Next Steps

1. **Read THUNDER_CLIENT_GUIDE.md** for detailed endpoint documentation
2. **Import Thunder-Client-Collection-Phase2.json** into Thunder Client
3. **Follow testing patterns** to validate all endpoints
4. **Run integration tests** (`npm test`) after manual testing
5. **Check coverage** (`npm run coverage`) to ensure quality
