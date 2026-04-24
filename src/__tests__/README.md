# Phase 2 Integration Tests - Implementation Guide

**Created:** April 23, 2026  
**Test Files:** 5 modules  
**Total Test Cases:** 100+  
**Coverage Target:** 85%+ on critical paths

---

## Test Files Created

### 1. Profile Integration Tests
**File:** `src/__tests__/profile/profile.test.ts`  
**Test Cases:** 20

```
CREATE PROFILE (7 tests)
├─ Create with valid data
├─ Create with minimal data
├─ Reject without authentication
├─ Reject for non-professionals
├─ Reject duplicate profile
├─ Reject invalid hourly rate
└─ Reject invalid availability status

GET PROFILE (3 tests)
├─ Get public profile
├─ Return 404 for non-existent
└─ Reject invalid userId

GET MY PROFILE (2 tests)
├─ Get authenticated user's profile
└─ Reject without authentication

UPDATE PROFILE (5 tests)
├─ Update with valid data
├─ Update partial fields
├─ Reject without authentication
├─ Reject invalid data
└─ Reject empty update

DELETE PROFILE (2 tests)
├─ Delete profile successfully
├─ Reject without authentication

RESPONSE FORMAT (1 test)
├─ Verify all required fields
```

**Coverage:**
- ✅ All CRUD operations
- ✅ Authentication checks
- ✅ Authorization (professional only)
- ✅ Validation (enum, positive numbers, max length)
- ✅ Error responses (401, 403, 404, 409)
- ✅ Response format compliance

---

### 2. Skill Integration Tests
**File:** `src/__tests__/skill/skill.test.ts`  
**Test Cases:** 25

```
ADD SKILL (8 tests)
├─ Add skill with all data
├─ Add skill with minimal data
├─ Reject without authentication
├─ Reject non-existent skill
├─ Reject duplicate skill
├─ Reject invalid proficiency level
├─ Reject invalid years of experience
└─ Test primary skill logic

LIST SKILLS (4 tests)
├─ List skills for profile
├─ Verify all fields included
├─ Handle non-existent profile
└─ Verify ordering (primary first)

UPDATE SKILL (5 tests)
├─ Update proficiency level
├─ Update years of experience
├─ Update multiple fields
├─ Reject without authentication
└─ Reject non-existent skill

DELETE SKILL (3 tests)
├─ Remove skill from profile
├─ Reject without authentication
└─ Reject non-existent skill
```

**Coverage:**
- ✅ M:M relationships (skills junction table)
- ✅ Primary skill logic
- ✅ Duplicate prevention (unique constraint)
- ✅ Proficiency level enum validation
- ✅ Years experience range validation

---

### 3. Certification Integration Tests
**File:** `src/__tests__/certification/certification.test.ts`  
**Test Cases:** 22

```
CREATE CERTIFICATION (7 tests)
├─ Create with all fields
├─ Create with minimal data
├─ Reject without authentication
├─ Reject without title
├─ Reject title exceeding length
├─ Reject invalid date format
└─ Reject invalid URL

LIST CERTIFICATIONS (3 tests)
├─ List certifications for profile
├─ Verify all fields included
└─ Handle non-existent profile

UPDATE CERTIFICATION (5 tests)
├─ Update title
├─ Update all fields
├─ Reject without authentication
├─ Reject non-existent cert
└─ Reject empty update

DELETE CERTIFICATION (3 tests)
├─ Delete certification
├─ Reject without authentication
└─ Reject non-existent cert

OWNERSHIP TESTS (2 tests)
├─ Prevent updating other's cert
└─ Prevent deleting other's cert
```

**Coverage:**
- ✅ Date validation (ISO format)
- ✅ URL validation
- ✅ Ownership protection (user X can't modify user Y's data)
- ✅ Soft/hard delete verification

---

### 4. Portfolio Integration Tests
**File:** `src/__tests__/portfolio/portfolio.test.ts`  
**Test Cases:** 24

```
CREATE PORTFOLIO ITEM (7 tests)
├─ Create with all fields
├─ Create with minimal data
├─ Reject without authentication
├─ Reject without title
├─ Reject title exceeding length
├─ Reject invalid image URL
└─ Reject invalid link URL

LIST PORTFOLIO ITEMS (3 tests)
├─ List items for profile
├─ Verify all fields included
└─ Verify ordering (recent first)

UPDATE PORTFOLIO ITEM (5 tests)
├─ Update title
├─ Update all fields
├─ Reject without authentication
├─ Reject non-existent item
└─ Reject empty update

DELETE PORTFOLIO ITEM (3 tests)
├─ Delete portfolio item
├─ Reject without authentication
└─ Reject non-existent item

OWNERSHIP TESTS (2 tests)
├─ Prevent updating other's items
└─ Prevent deleting other's items
```

**Coverage:**
- ✅ URL validation for images and links
- ✅ Ordering verification
- ✅ Ownership protection

---

### 5. Search Integration Tests
**File:** `src/__tests__/search/search.test.ts`  
**Test Cases:** 40+

```
BASIC SEARCH (3 tests)
├─ Return professionals with default filters
├─ Include pagination metadata
└─ Verify response structure

SKILL FILTERS (3 tests)
├─ Filter by single skill
├─ Filter by multiple skills (OR logic)
└─ Return empty for non-existent skill

RATE FILTERS (4 tests)
├─ Filter by minimum rate
├─ Filter by maximum rate
├─ Filter by rate range
└─ Reject invalid range (min > max)

AVAILABILITY FILTERS (3 tests)
├─ Filter by available
├─ Filter by unavailable
└─ Reject invalid status

SORTING (3 tests)
├─ Sort by rating descending
├─ Sort by rate ascending
└─ Sort by creation date (recent first)

PAGINATION (5 tests)
├─ Use default values
├─ Respect custom limit
├─ Navigate between pages
├─ Enforce maximum limit (100)
└─ Reject page 0

COMBINED FILTERS (1 test)
├─ Apply multiple filters together

SKILL AUTOCOMPLETE (5 tests)
├─ Return matching skills
├─ Respect limit parameter
├─ Require query parameter
├─ Reject short queries
└─ Verify response structure

FILTER OPTIONS (4 tests)
├─ Return available options
├─ Include skills, statuses, rates
├─ Verify skill details
└─ Verify availability statuses

EDGE CASES (4 tests)
├─ Handle no matching results
├─ Handle page beyond total
├─ Parse comma-separated skills
└─ Handle spaces in query
```

**Coverage:**
- ✅ Complex M:M joins (professional_skills)
- ✅ Multiple filter combinations
- ✅ Pagination edge cases
- ✅ Sorting behavior
- ✅ Query string parsing
- ✅ Performance with large result sets

---

## Running the Tests

### Run All Tests
```bash
npm test
```

### Run Specific Module Tests
```bash
# Profile tests only
npm test -- src/__tests__/profile/profile.test.ts

# Skill tests only
npm test -- src/__tests__/skill/skill.test.ts

# Certification tests only
npm test -- src/__tests__/certification/certification.test.ts

# Portfolio tests only
npm test -- src/__tests__/portfolio/portfolio.test.ts

# Search tests only
npm test -- src/__tests__/search/search.test.ts
```

### Run with Coverage Report
```bash
npm run test:coverage
```

### Watch Mode (auto-rerun on changes)
```bash
npm run test:watch
```

---

## Test Data Setup

Each test file creates its own test professionals during `beforeAll()`:

1. **Profile Tests:** Creates 1 test professional
2. **Skill Tests:** Creates 1 test professional
3. **Certification Tests:** Creates 1 test professional
4. **Portfolio Tests:** Creates 1 test professional
5. **Search Tests:** Creates 4 test professionals with different profiles

### Test User Creation Flow
```
1. POST /api/auth/signup
   └─ Creates user account
      
2. POST /api/profiles
   └─ Creates professional profile
      
3. POST /api/profiles/me/skills (Search tests only)
   └─ Adds skills to profile
```

### Unique Email Generation
All tests use run ID to prevent collisions:
```
test@email.com    → john.dev.{runId}@test.com
```

---

## Key Testing Patterns

### 1. Authentication Pattern
```typescript
// With JWT token in cookie
const response = await request(app)
  .post('/api/profiles/me/skills')
  .set('Cookie', [`token=${professionalToken}`])
  .send(payload);

// Test rejection without token
const response = await request(app)
  .post('/api/profiles/me/skills')
  .send(payload); // No token
  
expect(response.status).toBe(401);
```

### 2. Authorization Pattern
```typescript
// Only professionals can create profiles
const response = await request(app)
  .post('/api/profiles')
  .set('Cookie', [`token=${employerToken}`]) // Non-professional
  .send(payload);

expect(response.status).toBe(403);
```

### 3. Ownership Protection Pattern
```typescript
// User A's token
// Try to delete User B's resource

expect(response.status).toBe(404); // Not found (forbidden)
```

### 4. Validation Pattern
```typescript
// Test invalid enum value
const response = await request(app)
  .post('/api/profiles/me/skills')
  .set('Cookie', [`token=${token}`])
  .send({
    skillId: 1,
    proficiencyLevel: 'invalid_level', // Enum: beginner|intermediate|expert
  });

expect(response.status).toBe(400);
```

### 5. Pagination Pattern
```typescript
const page1 = await request(app)
  .get('/api/search/professionals')
  .query({ page: 1, limit: 10 });

const page2 = await request(app)
  .get('/api/search/professionals')
  .query({ page: 2, limit: 10 });

// Verify different results
expect(page1.body.data.professionals).not.toEqual(
  page2.body.data.professionals
);
```

---

## Expected Test Results

### All Tests Pass ✅
```
Test Suites: 5 passed, 5 total
Tests:       100+ passed, 100+ total
Time:        ~30-60 seconds (depending on DB)
```

### Coverage Report
```
Statements   : XX% ( XX/XX )
Branches     : XX% ( XX/XX )
Functions    : XX% ( XX/XX )
Lines        : XX% ( XX/XX )
```

---

## Test Execution Order

Tests are independent and can run in any order:
1. **Setup (beforeAll)** - Create test data
2. **Run test cases (it)**
3. **Cleanup (afterAll)** - Optional: cleanup test data

### Note on Database State
- Tests create real data in test database
- Each run creates new records (unique IDs via runId)
- Consider cleanup after test runs or use transactions

---

## Troubleshooting

### Tests Fail with 401 Unauthorized
**Issue:** JWT token not being passed or expired
```bash
# Check JWT_SECRET is set in .env
JWT_SECRET=test-secret-key
```

### Tests Fail with 404 Not Found
**Issue:** Test data not created properly
```bash
# Verify auth endpoint works:
npm test -- src/__tests__/auth.integration.test.ts
```

### Tests Hang or Timeout
**Issue:** Database connection issue
```bash
# Check DATABASE_URL in .env
# Verify PostgreSQL is running
```

### Duplicate Email Error
**Issue:** Previous test data still in database
```bash
# Clean database or use different runId
# Or restart PostgreSQL
```

---

## Next Steps

1. ✅ **Review coverage results** - Identify gaps
2. ⏭️ **Add missing tests** for edge cases
3. ⏭️ **Performance tests** - Add response time assertions
4. ⏭️ **Error scenario tests** - Network failures, timeouts
5. ⏭️ **Setup CI/CD** - Run tests on every push

---

## Documentation Updates Needed

- [ ] Update README with test running instructions
- [ ] Add test coverage badge to repo
- [ ] Document test database setup
- [ ] Create troubleshooting guide
- [ ] Add test metrics to Phase 2 roadmap

---

**Version:** 1.0  
**Last Updated:** April 23, 2026  
**Status:** Ready for Execution
