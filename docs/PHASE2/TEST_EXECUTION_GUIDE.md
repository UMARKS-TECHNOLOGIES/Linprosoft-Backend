# Phase 2 Test Execution & Debugging Guide

## Overview

This guide explains how to use the test files and fixture files created for Phase 2, how to identify failures, and how to fix them.

---

## Test Files & Fixtures Structure

### 1. **Setup & Configuration** (`src/__tests__/setup.ts`)

**Purpose:** Manages test database lifecycle and provides utilities for test execution

**What it does:**
- Establishes connection to test database
- Runs setup hooks before all tests
- Cleans up after tests complete
- Provides a `query<T>()` helper function for direct database access
 
**Key Functions:**
```typescript
setupTestDb()        // Initializes test database connection
query<T>(sql, params) // Execute raw SQL queries in tests
clearTestData()      // Deletes all test data between test suites
teardownTestDb()     // Closes database connection
```

**When it runs:**
- Automatically runs `beforeAll()` before any test file executes
- Automatically runs `afterAll()` after all tests complete
- No manual invocation needed - Jest handles this via setupFiles config

---

## Fixture Files (Test Data)

Fixtures provide pre-defined test data for all scenarios (valid, invalid, edge cases).

### 1. **Users Fixture** (`src/__tests__/fixtures/users.fixture.ts`)

**Contains:** User data for authentication

```typescript
testUsers = {
  professional1: { email, password, firstName, lastName, userType: 'professional' },
  professional2: { ... },
  employer: { email, password, compName, userType: 'employer' }
}

invalidUsers = {
  missingEmail: { password, firstName, ... },
  weakPassword: { password: 'weak', ... },
  passwordMismatch: { password, passwordConfirm: 'different', ... },
  invalidEmail: { email: 'not-an-email', ... }
}
```

**How to use in tests:**
```typescript
import { testUsers, invalidUsers } from '../fixtures/users.fixture';

// Create valid test user
const signupRes = await request(app)
  .post('/api/auth/signup')
  .send(testUsers.professional1);

// Test with invalid data
const invalidRes = await request(app)
  .post('/api/auth/signup')
  .send(invalidUsers.weakPassword);
```

---

### 2. **Profiles Fixture** (`src/__tests__/fixtures/profiles.fixture.ts`)

**Contains:** Professional profile test data

**Sections:**
- **createProfileFixtures:** Scenarios for POST /api/profiles
  - `valid`: Complete valid profile data
  - `validMinimal`: Minimum required fields
  - `validAllFields`: All optional fields included
  - `invalid`: Missing required fields, invalid values

- **updateProfileFixtures:** Scenarios for PUT /api/profiles/me
  - `valid`: Valid full update
  - `partialUpdate`: Update single field
  - `invalid`: Invalid field values

- **testProfiles:** Pre-created profiles for GET tests
  - `basic`, `senior`, `junior`, `unavailable`: Different profile types

**How to use in tests:**
```typescript
import { createProfileFixtures, testProfiles } from '../fixtures/profiles.fixture';

// Test POST with valid data
const res = await request(app)
  .post('/api/profiles')
  .set('Cookie', authToken)
  .send(createProfileFixtures.valid);

// Test invalid profile creation
const invalidRes = await request(app)
  .post('/api/profiles')
  .set('Cookie', authToken)
  .send(createProfileFixtures.invalid);
```

---

### 3. **Skills Fixture** (`src/__tests__/fixtures/skills.fixture.ts`)

**Contains:** Skill and professional-skill relationship test data

**Sections:**
- **skillsFixture:** 5 pre-defined skills
  ```
  TypeScript, Node.js, React, PostgreSQL, Docker
  ```

- **addSkillFixtures:** Scenarios for POST /api/skills/me/skills
  - `valid`: Complete skill data with proficiency level
  - `validMinimal`: Required fields only
  - `validIntermediate`, `validBeginner`: Different proficiency levels
  - `invalid`: Invalid proficiency level

- **updateSkillFixtures:** Scenarios for PUT /api/skills/me/skills/:skillId
  - `valid`: Update all fields
  - `partialUpdate`: Update one field
  - `updateYears`: Modify years of experience
  - `updatePrimary`: Change primary skill status
  - `invalid`: Invalid values

- **getAllSkillsFixture:** Query parameters for GET /api/skills
  - Pagination limits and offsets
  - Sorting options

**How to use in tests:**
```typescript
import { skillsFixture, addSkillFixtures } from '../fixtures/skills.fixture';

// Create skill
const skill = skillsFixture[0]; // TypeScript

// Add skill to profile
const res = await request(app)
  .post('/api/skills/me/skills')
  .set('Cookie', authToken)
  .send(addSkillFixtures.valid);

// Test pagination for getAllSkills
const allSkillsRes = await request(app)
  .get('/api/skills')
  .query({ limit: 20, offset: 0 });
```

---

### 4. **Certifications Fixture** (`src/__tests__/fixtures/certifications.fixture.ts`)

**Contains:** Professional certification test data

**Sections:**
- **createCertificationFixtures:** Scenarios for POST /api/certifications/me
  - `valid`: Complete certification with expiry date
  - `validMinimal`: Required fields only
  - `validNoExpiry`: Certification without expiry
  - `validExpired`: Past expiry date
  - `invalid`: Invalid dates, missing fields

- **updateCertificationFixtures:** Scenarios for PUT /api/certifications/me/:certId
  - `valid`: Full update
  - `partialUpdate`: Update title only
  - `updateExpiry`: Extend expiry date
  - `updateCredential`: Update credential URL
  - `invalid`: Invalid date formats

- **testCertifications:** Pre-created certifications
  - `aws`, `kubernetes`, `docker`: Different cert types

**How to use in tests:**
```typescript
import { createCertificationFixtures } from '../fixtures/certifications.fixture';

// Create certification with valid dates
const res = await request(app)
  .post('/api/certifications/me')
  .set('Cookie', authToken)
  .send(createCertificationFixtures.validNoExpiry);

// Test expired certification handling
const expiredRes = await request(app)
  .post('/api/certifications/me')
  .set('Cookie', authToken)
  .send(createCertificationFixtures.validExpired);
```

---

### 5. **Portfolio Items Fixture** (`src/__tests__/fixtures/portfolioItems.fixture.ts`)

**Contains:** Portfolio project test data

**Sections:**
- **createPortfolioFixtures:** Scenarios for POST /api/portfolio/me
  - `valid`: Complete portfolio with image and link
  - `validMinimal`: Title and description only
  - `validNoImage`: Without image URL
  - `validNoLink`: Without external link
  - `validAllFields`: All optional fields included
  - `invalid`: Missing title, invalid URLs

- **updatePortfolioFixtures:** Scenarios for PUT /api/portfolio/me/:itemId
  - `valid`: Full update
  - `partialUpdate`: Update description
  - `updateDescription`: Change project description
  - `updateLinks`: Modify image/link URLs
  - `invalid`: Invalid values

- **testPortfolioItems:** Pre-created portfolio items
  - `webapp`, `api`, `library`, `mobile`: Different project types

**How to use in tests:**
```typescript
import { createPortfolioFixtures } from '../fixtures/portfolioItems.fixture';

// Create portfolio with all fields
const res = await request(app)
  .post('/api/portfolio/me')
  .set('Cookie', authToken)
  .send(createPortfolioFixtures.validAllFields);

// Test minimal portfolio creation
const minimalRes = await request(app)
  .post('/api/portfolio/me')
  .set('Cookie', authToken)
  .send(createPortfolioFixtures.validMinimal);
```

---

## Integration Test Files (5 Test Suites)

### 1. **Profile Integration Tests** (`src/__tests__/profile.integration.test.ts`)

**What it tests:** Profile CRUD operations - Create, Read, Update, Delete

**Test Groups:**

#### POST /api/profiles (Create Profile)
```typescript
✓ should create profile with valid data - 201
✓ should return 409 if profile already exists
✓ should return 401 if not authenticated
✓ should return 403 if user is not professional
✓ should validate hourly_rate is positive
✓ should validate bio character limit
✓ should handle all valid availability statuses
✓ should return 400 for validation errors
```

**How to read results:**
- ✓ = Test passed
- ✗ = Test failed - see error message below
- If hourly_rate validation fails: Check if validation schema allows negative numbers (should not)
- If 409 conflict fails: Check if duplicate profile logic is implemented

#### GET /api/profiles/:userId (Retrieve Profile)
```typescript
✓ should retrieve profile by user ID - 200
✓ should return 404 if profile not found
✓ should be public endpoint (no auth required)
✓ should not expose sensitive fields
```

**How to debug failures:**
- If 404 when profile exists: Check findByUserId() in profileRepository.ts
- If sensitive data exposed: Check DTO to ensure user_id, passwords not returned

#### GET /api/profiles/:userId/detailed (Detailed Profile)
```typescript
✓ should retrieve full profile with skills - 200
✓ should retrieve full profile with certifications - 200
✓ should retrieve full profile with portfolio - 200
✓ should return empty arrays when no related data exists
```

**How to debug failures:**
- If skills not returned: Check getDetailedProfile() method in profileService.ts
- If wrong data format: Check ProfessionalProfileFullDTO type definition
- If camelCase conversion fails: Check database row transformations

#### GET /api/profiles/me (Own Profile)
```typescript
✓ should retrieve authenticated user's profile - 200
✓ should return 401 if not authenticated
✓ should return 404 if user has no profile
```

#### PUT /api/profiles/me (Update Profile)
```typescript
✓ should update profile with valid data - 200
✓ should allow partial updates - 200
✓ should validate field updates
✓ should return 401 if not authenticated
✓ should update updated_at timestamp
✓ should not allow updates to immutable fields (user_id)
✓ should reject invalid hourly rates
✓ should enforce bio length limits
```

**How to debug PUT failures:**
- If validation fails: Check profileValidation.ts Zod schema
- If partial updates don't work: Ensure repository checks which fields are defined
- If updated_at not changing: Check database trigger or service logic

#### DELETE /api/profiles/me (Delete Profile)
```typescript
✓ should delete profile - 204
✓ should cascade delete related skills - verification
✓ should cascade delete related certifications - verification
✓ should return 401 if not authenticated
```

**How to verify cascade delete:**
- After delete, query database to ensure related records removed
- Check DELETE trigger in database schema

---

### 2. **Skill Integration Tests** (`src/__tests__/skill.integration.test.ts`)

**What it tests:** Skill operations - Add, List, Update, Remove, Pagination

**Test Groups:**

#### GET /api/skills (Get All Skills with Pagination)
```typescript
✓ should return all skills paginated - 200
✓ should respect limit parameter (1-100)
✓ should respect offset parameter
✓ should return total count
✓ should default to limit=20, offset=0
✓ should return empty array when no skills exist
✓ should be public endpoint (no auth)
✓ should validate limit/offset are positive integers
✓ should handle last page correctly
```

**Response format:**
```json
{
  "success": true,
  "data": {
    "skills": [
      { "id": 1, "name": "TypeScript", "category": "Language", ... },
      ...
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

**How to debug pagination failures:**
```bash
# Test: Limit too high should be rejected
GET /api/skills?limit=101
# Expected: 400 error

# Test: Negative offset
GET /api/skills?offset=-5
# Expected: 400 error

# Test: Last page calculation
# With 50 total skills, limit 20
# Page 3 (offset 40) should return 10 skills
GET /api/skills?limit=20&offset=40
# Expected: 10 results, totalPages: 3
```

#### GET /api/profiles/:userId/skills (Get User Skills)
```typescript
✓ should return user's skills with proficiency levels - 200
✓ should return empty array if user has no skills
✓ should include years_of_experience field
✓ should include is_primary field
✓ should be sortable by proficiency level
✓ should return 404 if profile not found
```

#### POST /api/skills/me/skills (Add Skill)
```typescript
✓ should add skill to profile - 201
✓ should return 409 if skill already added
✓ should validate proficiency level (beginner, intermediate, expert)
✓ should validate years_of_experience is non-negative
✓ should allow setting as primary skill
✓ should return 401 if not authenticated
✓ should validate skill_id exists in skills table
✓ should handle all proficiency levels
✓ should validate years_of_experience (0-60)
✓ should prevent duplicate skills
```

**Common failures:**
- **Duplicate prevention fails:** Check constraint logic - should query professional_skills table before inserting
- **Primary skill not working:** If setting isPrimary=true, check if other primaries are cleared
- **Invalid proficiency:** Check Zod schema validates enum values

#### PUT /api/skills/me/skills/:skillId (Update Skill)
```typescript
✓ should update proficiency level - 200
✓ should update years_of_experience - 200
✓ should update primary status - 200
✓ should allow partial updates
✓ should return 404 if skill not found on profile
✓ should validate new values
✓ should return 401 if not authenticated
```

#### DELETE /api/skills/me/skills/:skillId (Remove Skill)
```typescript
✓ should remove skill from profile - 204
✓ should return 404 if skill not on profile
✓ should return 401 if not authenticated
✓ should delete from professional_skills table
```

---

### 3. **Certification Integration Tests** (`src/__tests__/certification.integration.test.ts`)

**What it tests:** Certification CRUD with date validation

**Test Groups:**

#### POST /api/certifications/me (Create Certification)
```typescript
✓ should create certification with valid data - 201
✓ should validate issue_date format
✓ should validate expiry_date is after issue_date
✓ should allow null expiry_date (no expiration)
✓ should return 401 if not authenticated
✓ should return 400 for invalid dates
✓ should validate title length (3-200 chars)
✓ should validate issuer length (2-100 chars)
✓ should validate URL format for credential_url
```

**Date validation examples:**
```
✓ issue_date: 2024-01-15, expiry_date: 2026-01-15 → OK
✓ issue_date: 2024-01-15, expiry_date: null → OK
✗ issue_date: 2024-01-15, expiry_date: 2023-01-15 → 400 (expiry before issue)
✗ issue_date: "invalid-date", expiry_date: "2024-01-15" → 400
```

#### GET /api/certifications/:userId (List Certifications)
```typescript
✓ should return user's certifications - 200
✓ should sort by creation date descending
✓ should return empty array if none exist
✓ should include all fields (title, issuer, dates)
✓ should indicate if expired
✓ should be public endpoint
```

#### PUT /api/certifications/me/:certId (Update Certification)
```typescript
✓ should update certification fields - 200
✓ should allow partial updates
✓ should validate new dates (expiry > issue)
✓ should return 404 if not found
✓ should return 401 if not authenticated
```

#### DELETE /api/certifications/me/:certId (Delete)
```typescript
✓ should delete certification - 204
✓ should return 404 if not found
✓ should return 401 if not authenticated
```

---

### 4. **Portfolio Integration Tests** (`src/__tests__/portfolio.integration.test.ts`)

**What it tests:** Portfolio item CRUD with URL validation

**Test Groups:**

#### POST /api/portfolio/me (Create Portfolio Item)
```typescript
✓ should create portfolio with valid data - 201
✓ should validate title is provided and 3-100 chars
✓ should validate description length (10-500 chars)
✓ should allow null image_url
✓ should allow null link_url
✓ should validate image_url is valid URL
✓ should validate link_url is valid URL
✓ should handle special characters in title/description
✓ should return 401 if not authenticated
```

**URL validation examples:**
```
✓ https://github.com/user/repo → Valid GitHub URL
✓ https://youtube.com/watch?v=abc → Valid YouTube URL
✓ not-a-url → Invalid (400)
✓ ftp://invalid.com → Likely invalid (depends on schema)
```

#### GET /api/portfolio/:userId (List Portfolio)
```typescript
✓ should return user's portfolio items - 200
✓ should sort by creation date (newest first)
✓ should return empty array if none exist
✓ should include all fields
✓ should be public endpoint
```

#### PUT /api/portfolio/me/:itemId (Update Item)
```typescript
✓ should update portfolio item - 200
✓ should allow partial updates
✓ should validate fields
✓ should return 404 if not found
✓ should return 401 if not authenticated
```

#### DELETE /api/portfolio/me/:itemId (Delete)
```typescript
✓ should delete portfolio item - 204
✓ should return 404 if not found
✓ should return 401 if not authenticated
```

---

### 5. **Search Integration Tests** (`src/__tests__/search.integration.test.ts`)

**What it tests:** Search filtering, pagination, sorting, autocomplete

**Test Groups:**

#### GET /api/search/professionals (Basic Search)
```typescript
✓ should return professionals list - 200
✓ should include profile with skills
✓ should be public endpoint (no auth)
```

**Response includes:** id, name, rating, hourly_rate, availability_status, skills[]

#### Filter by Skills
```typescript
✓ should filter by single skill ID - 200
✓ should filter by multiple skill IDs (OR logic)
✓ should return empty if no match
✓ should validate skill IDs are integers
```

**Example:**
```bash
GET /api/search/professionals?skills=1,2,3
# Returns professionals with ANY of skills 1, 2, or 3
```

#### Filter by Rating
```typescript
✓ should filter by minimum rating (0-5 scale)
✓ should return 400 if rating > 5
✓ should return 400 if rating < 0
✓ should handle decimal ratings (4.5)
✓ should handle 0 rating
```

#### Filter by Hourly Rate
```typescript
✓ should filter by min rate - 200
✓ should filter by max rate - 200
✓ should filter by rate range - 200
✓ should return 400 for negative rates
✓ should allow 0 as valid minimum
```

#### Pagination
```typescript
✓ should return paginated results - default 20/page
✓ should respect limit parameter (1-100)
✓ should respect offset parameter
✓ should return total count
✓ should handle page beyond available data
✓ should calculate totalPages correctly
✓ should return empty on invalid page
```

#### Sorting
```typescript
✓ should sort by rating descending (default)
✓ should sort by hourly_rate ascending
✓ should sort by recent (creation date)
✓ should return 400 for invalid sortBy value
```

#### Complex Filters
```typescript
✓ should combine multiple filters
✓ should combine filters with pagination
✓ should combine filters with sorting
```

**Example complex query:**
```bash
GET /api/search/professionals?skills=1,2&minRate=5000&maxRate=10000&minRating=4.0&sortBy=rating&limit=10&offset=0
```

#### Skills Autocomplete
```typescript
✓ should return skills matching prefix - 200
✓ should be case-insensitive
✓ should return empty for no matches
✓ should limit results (max 10)
```

#### Filter Options
```typescript
✓ should return available filter options - 200
✓ should include skill options
✓ should include rating ranges
✓ should include rate ranges
✓ should include availability statuses
```

---

## How to Run Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# Profile tests
npm test -- profile.integration.test.ts

# Skill tests
npm test -- skill.integration.test.ts

# Certification tests
npm test -- certification.integration.test.ts

# Portfolio tests
npm test -- portfolio.integration.test.ts

# Search tests
npm test -- search.integration.test.ts
```

### Run with Coverage
```bash
npm run coverage
```

Output: `coverage/lcov-report/index.html` - Open in browser to see detailed coverage

### Watch Mode (Auto-rerun on file changes)
```bash
npm test -- --watch
```

### Run Single Test Case
```bash
npm test -- profile.integration.test.ts -t "should create profile with valid data"
```

### Show Test Output in Detail
```bash
npm test -- --verbose
```

---

## Understanding Test Output

### Successful Test Run
```
PASS  src/__tests__/profile.integration.test.ts
  Profile Integration Tests
    POST /api/profiles - Create Profile
      ✓ should create profile with valid data - 201 (125 ms)
      ✓ should return 409 if profile already exists (98 ms)
      ✓ should return 401 if not authenticated (45 ms)
    GET /api/profiles/:userId
      ✓ should retrieve profile by user ID - 200 (87 ms)
      ✓ should return 404 if profile not found (52 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        2.543 s
```

### Failed Test Run
```
FAIL  src/__tests__/profile.integration.test.ts
  Profile Integration Tests
    POST /api/profiles
      ✓ should create profile with valid data - 201
      ✗ should return 409 if profile already exists (123 ms)

  ● Profile Integration Tests › POST /api/profiles › should return 409 if profile already exists

    Expected status 409 but got 201
    
    Received:
    {
      "status": 201,
      "body": {
        "success": true,
        "data": { "profile": { ... } }
      }
    }
```

### Reading Error Messages

**Assertion Failed:**
```
Expected: 409 (Conflict)
Received: 201 (Created)
```
→ Duplicate profile check not working. Check repository.findByUserId() logic.

**Validation Error:**
```
Expected property 'hourly_rate' but got undefined
```
→ Response DTO missing fields. Check profileService.ts DTO transformation.

**Database Connection Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
→ PostgreSQL not running. Start database: `docker-compose up -d`

**Authentication Failed:**
```
Expected status 200 but got 401
```
→ Auth token not being passed. Check test setup: `.set('Cookie', authToken)`

---

## Common Failures & Fixes

### 1. Database Connection Failures

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Fix:**
```bash
# Check if PostgreSQL is running
docker-compose ps

# Start PostgreSQL if stopped
docker-compose up -d

# Verify connection
psql -h localhost -U postgres -d linkprosoftdb
```

---

### 2. Validation Failures (400 errors when shouldn't)

**Test:**
```typescript
it('should create profile with valid data', () => {
  const res = await request(app)
    .post('/api/profiles')
    .send(createProfileFixtures.valid);
  
  expect(res.status).toBe(201); // Getting 400 instead
});
```

**Debug steps:**
1. Check the fixture data in `profiles.fixture.ts`
2. Check validation schema in `profileValidation.ts`
3. Run query directly to see error: Add logging in profileController

**Fix example:**
```typescript
// In profileController.ts, add logging
const createProfile = catchAsync(async (req: AuthRequest, res: Response) => {
  console.log('Body received:', req.body); // Debug
  const validation = createProfileSchema.parse(req.body);
  // ...
});
```

---

### 3. Authentication Failures (401 when authenticated)

**Problem:** Tests passing auth token but still getting 401

**Debug:**
```typescript
// Check token is being passed
console.log('AuthToken:', authToken);

// Verify header format
const res = await request(app)
  .post('/api/profiles')
  .set('Cookie', authToken) // Must be 'Cookie' header
  .send(data);
```

**Fix:** Ensure authMiddleware reads from correct location:
```typescript
// In authMiddleware.ts
const token = req.cookies?.access_token || 
             (req.headers.cookie?.split('access_token=')[1]?.split(';')[0]);
```

---

### 4. Pagination Not Working

**Test fails:**
```typescript
it('should respect limit parameter', () => {
  const res = await request(app)
    .get('/api/skills?limit=5&offset=0');
  
  expect(res.body.data.skills.length).toBeLessThanOrEqual(5); // Failing
});
```

**Debug:**
```bash
# Test directly
curl "http://localhost:5020/api/skills?limit=5&offset=0" | jq '.data.pagination'

# Should show:
# {
#   "limit": 5,
#   "offset": 0,
#   "total": 50,
#   "totalPages": 10
# }
```

**Common issues:**
1. Query params not being parsed: Check `skillValidation.ts` has `limit` and `offset` schema
2. Repository not using LIMIT/OFFSET: Check `skillRepository.ts` SQL query
3. Pagination not returned: Check `skillController.ts` response format

---

### 5. Relationship Data Missing

**Test fails:**
```typescript
it('should return profile with skills', () => {
  const res = await request(app)
    .get(`/api/profiles/${userId}/detailed`);
  
  expect(res.body.data.profile.skills).toBeArray(); // Undefined
});
```

**Debug steps:**
1. Verify endpoint exists: `GET /api/profiles/:userId/detailed`
2. Check route added in `profileRoutes.ts`
3. Verify query joins all tables in `profileRepository.ts`
4. Check DTO includes all fields in `profileTypes.ts`

**Fix:** Ensure profileService.getDetailedProfile() does JOINs:
```typescript
// Should query:
// - professional_profiles
// - professional_skills JOIN skills
// - certifications
// - portfolio_items
// All joined to get complete profile
```

---

### 6. Cascade Delete Not Working

**Test fails:**
```typescript
it('should cascade delete related skills', async () => {
  // Delete profile
  await request(app).delete('/api/profiles/me').set('Cookie', authToken);
  
  // Verify skills deleted
  const skills = await db.query(
    'SELECT * FROM professional_skills WHERE professional_id = $1',
    [profileId]
  );
  
  expect(skills.rows.length).toBe(0); // Still has skills!
});
```

**Fix:** Check database CASCADE DELETE constraint:
```sql
-- In database schema for professional_skills table
FOREIGN KEY (professional_id) REFERENCES professional_profiles(id) ON DELETE CASCADE
```

If constraint missing, add it:
```sql
ALTER TABLE professional_skills 
DROP CONSTRAINT professional_skills_professional_id_fkey,
ADD CONSTRAINT professional_skills_professional_id_fkey 
FOREIGN KEY (professional_id) REFERENCES professional_profiles(id) ON DELETE CASCADE;
```

---

### 7. Duplicate Prevention Not Working

**Test fails:**
```typescript
it('should return 409 if skill already added', async () => {
  // Add skill first time
  await request(app)
    .post('/api/skills/me/skills')
    .set('Cookie', authToken)
    .send({ skill_id: 1, proficiency_level: 'intermediate' });
  
  // Try to add same skill again
  const res = await request(app)
    .post('/api/skills/me/skills')
    .set('Cookie', authToken)
    .send({ skill_id: 1, proficiency_level: 'expert' });
  
  expect(res.status).toBe(409); // Getting 201 instead!
});
```

**Fix in skillRepository:**
```typescript
async addSkill(professionalId: number, skillId: number, data: AddSkillData) {
  // Check if already exists
  const existing = await this.db.query(
    'SELECT id FROM professional_skills WHERE professional_id = $1 AND skill_id = $2',
    [professionalId, skillId]
  );
  
  if (existing.rows.length > 0) {
    throw new AppError('Skill already added to profile', 409, 'CONFLICT');
  }
  
  // Insert new skill
  // ...
}
```

---

## Test Data Requirements

### Minimum Test Data Needed

1. **At least 1 test user** (in fixture and database)
2. **5-10 skills** (TypeScript, Node.js, React, PostgreSQL, Docker, etc.)
3. **3-5 test professionals** (different proficiency levels, ratings)
4. **Some with skills already added** (for relationship tests)

### Seeding Test Data

If tests fail because fixtures don't exist in database:

```bash
# Option 1: Run fixture setup before tests
npm test -- --setupFilesAfterEnv ./src/__tests__/setup.ts

# Option 2: Manually seed in beforeAll()
beforeAll(async () => {
  // Create test skills
  await db.query(
    'INSERT INTO skills (name, category) VALUES ($1, $2)',
    ['TypeScript', 'Language']
  );
});
```

---

## Coverage Reports

### Generate Coverage
```bash
npm run coverage
```

### View Coverage Report
```bash
# Open in browser
start coverage/lcov-report/index.html

# Or open directly from VS Code
# File Explorer → coverage → lcov-report → index.html
```

### Coverage Metrics

**Good Coverage:**
- Lines: 85%+
- Functions: 80%+
- Branches: 75%+

**File-specific:**
- profileService.ts: 90%+ (critical)
- skillRepository.ts: 85%+ (data access)
- search filters: 80%+ (complex logic)

### Interpreting Coverage

**Green (covered):** Code was executed during tests
**Red (uncovered):** Code was NOT executed during tests
**Yellow (partial):** Some branches uncovered (e.g., error cases)

---

## Troubleshooting Checklist

When tests fail:

- [ ] Database is running (`docker-compose ps`)
- [ ] .env file exists with DATABASE_URL
- [ ] No TypeScript compilation errors (`npx tsc --noEmit`)
- [ ] Fixtures have correct data types
- [ ] Auth token is passed in Cookie header
- [ ] Request body matches schema expectations
- [ ] Endpoints exist and have correct routes
- [ ] Repository methods handle errors with throw/reject
- [ ] Response DTOs match expected format
- [ ] Database constraints exist (foreign keys, cascades)

---

## Next Steps

1. **Run all tests:** `npm test`
2. **Check coverage:** `npm run coverage`
3. **Fix failing tests:** Follow troubleshooting guide above
4. **Commit passing tests:** `git add src/__tests__/ && git commit -m "Add Phase 2 integration tests"`
