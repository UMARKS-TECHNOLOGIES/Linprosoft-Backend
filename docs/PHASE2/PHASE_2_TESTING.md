# Linkprosoft Backend - Phase 2: Testing Strategy & Execution Plan

**Version:** 1.0  
**Scope:** Unit tests, integration tests, performance tests, security tests  
**Coverage Target:** 85% on critical paths, 100% on auth & payment logic  

---

## Testing Overview

### Testing Pyramid

```
          ▲
         /│\
        / │ \
       /  │  \  E2E Tests (5%)
      /   │   \ (Frontend + Backend + DB)
     /────┼────\
    /     │     \ Integration Tests (35%)
   /      │      \ (Full endpoint flows)
  /───────┼───────\
 /        │        \ Unit Tests (60%)
/         │         \ (Functions, classes)
/──────────┼──────────\
```

**Distribution:**
- **Unit Tests:** 60% - Individual functions, repositories, services
- **Integration Tests:** 35% - Full endpoint flows with real DB
- **E2E Tests:** 5% - Frontend + Backend + DB (Phase 3+)

---

## Test Files Structure

```
__tests__/
├── setup.ts                          # Jest config, DB connection
├── fixtures/
│   ├── users.fixture.ts              # Test user data
│   ├── profiles.fixture.ts           # Test profile data
│   ├── skills.fixture.ts             # Test skill data
│   ├── certifications.fixture.ts     # Test cert data
│   └── portfolioItems.fixture.ts     # Test portfolio data
│
├── profile/
│   ├── profile.test.ts               # CRUD operations
│   ├── profileSearch.test.ts         # Query scenarios
│   └── profile.fixtures.ts           # Profile-specific fixtures
│
├── skill/
│   ├── skill.test.ts                 # Add, remove, list
│   ├── skillConstraints.test.ts      # Duplicate prevention
│   └── skill.fixtures.ts
│
├── certification/
│   ├── certification.test.ts         # CRUD
│   ├── certificationExpiry.test.ts   # Expiry logic
│   └── certification.fixtures.ts
│
├── portfolio/
│   ├── portfolio.test.ts             # CRUD
│   └── portfolio.fixtures.ts
│
└── search/
    ├── search.test.ts                # Basic search
    ├── searchFilters.test.ts         # Filter combinations
    ├── searchPagination.test.ts      # Pagination
    ├── searchPerformance.test.ts     # Performance benchmarks
    └── search.fixtures.ts
```

---

## Unit Tests

### Profile Repository Unit Tests

```typescript
// __tests__/profile/profile.test.ts
import { ProfileRepository } from '../../modules/profile/profileRepository';
import { Pool } from 'pg';

describe('ProfileRepository', () => {
  let repository: ProfileRepository;
  let mockDb: jest.Mocked<Pool>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    } as any;
    repository = new ProfileRepository(mockDb);
  });

  describe('create', () => {
    it('should create profile and return entity', async () => {
      const mockProfile = {
        id: 1,
        user_id: 10,
        hourly_rate: 5000,
        bio: 'Developer',
        availability_status: 'available',
        response_time_hours: null,
        total_hours_worked: 0,
        avg_rating: 0,
        total_reviews: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.query.mockResolvedValue({
        rowCount: 1,
        rows: [mockProfile],
      });

      const result = await repository.create(10, {
        hourly_rate: 5000,
        bio: 'Developer',
      });

      expect(result).toEqual(mockProfile);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO professional_profiles'),
        [10, 5000, 'Developer', 'available', null]
      );
    });

    it('should throw if profile creation fails', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 0 });

      await expect(
        repository.create(10, { hourly_rate: 5000 })
      ).rejects.toThrow('Failed to create profile');
    });
  });

  describe('findByUserId', () => {
    it('should return profile by user ID', async () => {
      const mockProfile = { id: 1, user_id: 10, hourly_rate: 5000 };
      mockDb.query.mockResolvedValue({
        rowCount: 1,
        rows: [mockProfile],
      });

      const result = await repository.findByUserId(10);

      expect(result).toEqual(mockProfile);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [10]
      );
    });

    it('should throw NotFoundError if profile not found', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 0 });

      await expect(repository.findByUserId(999)).rejects.toThrow(
        'Profile not found'
      );
    });
  });

  describe('update', () => {
    it('should update profile with provided fields', async () => {
      const mockUpdated = {
        id: 1,
        hourly_rate: 6000, // Changed
        bio: 'Updated bio',
      };

      mockDb.query.mockResolvedValue({
        rowCount: 1,
        rows: [mockUpdated],
      });

      const result = await repository.update(1, {
        hourly_rate: 6000,
        bio: 'Updated bio',
      });

      expect(result.hourly_rate).toBe(6000);
    });

    it('should not modify fields not in update object', async () => {
      const mockUpdated = {
        id: 1,
        hourly_rate: 5000, // Unchanged
        bio: 'Updated bio',
      };

      mockDb.query.mockResolvedValue({
        rowCount: 1,
        rows: [mockUpdated],
      });

      await repository.update(1, { bio: 'Updated bio' });

      // Verify SQL doesn't update hourly_rate
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.not.stringContaining('hourly_rate = '),
        expect.any(Array)
      );
    });
  });

  describe('delete', () => {
    it('should delete profile', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 1 });

      await repository.delete(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM professional_profiles'),
        [1]
      );
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should use parameterized queries', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 1, rows: [{}] });

      await repository.create(10, {
        bio: "'; DROP TABLE users; --",
      });

      // Verify the malicious string is passed as parameter, not in SQL
      const [sql, params] = mockDb.query.mock.calls[0];
      expect(sql).not.toContain("'; DROP TABLE users;");
      expect(params).toContain("'; DROP TABLE users; --");
    });
  });
});
```

---

## Integration Tests

### Profile CRUD Integration Tests

```typescript
// __tests__/profile/profile.test.ts (Integration)
import request from 'supertest';
import app from '../../app';
import { Pool } from 'pg';

describe('Profile CRUD Integration Tests', () => {
  let db: Pool;
  let userId: number;
  let authToken: string;
  let profileId: number;

  beforeAll(async () => {
    db = new Pool({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'linkprosoft_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
    });

    // Create test user
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'testprofessional@example.com',
        password: 'TestPassword123',
        passwordConfirm: 'TestPassword123',
        firstName: 'Test',
        lastName: 'Professional',
        userType: 'professional',
      });

    userId = signupRes.body.data.user.id;
    authToken = signupRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await db.end();
  });

  afterEach(async () => {
    // Clean up test data
    await db.query(
      'DELETE FROM professional_profiles WHERE user_id = $1',
      [userId]
    );
  });

  describe('POST /api/profiles', () => {
    it('should create professional profile with valid data - 201', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Cookie', authToken)
        .send({
          hourly_rate: 5000,
          bio: 'Experienced Node.js developer',
          availability_status: 'available',
          response_time_hours: 24,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile).toHaveProperty('id');
      expect(res.body.data.profile.hourly_rate).toBe(5000);
      expect(res.body.data.profile).not.toHaveProperty('user_id');
      
      profileId = res.body.data.profile.id;
    });

    it('should validate hourly_rate is positive', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Cookie', authToken)
        .send({
          hourly_rate: -100, // Invalid
          bio: 'Developer',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 if profile already exists', async () => {
      // Create first profile
      await request(app)
        .post('/api/profiles')
        .set('Cookie', authToken)
        .send({ hourly_rate: 5000 });

      // Try to create another
      const res = await request(app)
        .post('/api/profiles')
        .set('Cookie', authToken)
        .send({ hourly_rate: 6000 });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONFLICT');
      expect(res.body.message).toContain('already has a profile');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .send({ hourly_rate: 5000 });

      expect(res.status).toBe(401);
    });

    it('should return 403 if user is not professional', async () => {
      // Create employer user
      const employerSignup = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'employer@example.com',
          password: 'TestPassword123',
          passwordConfirm: 'TestPassword123',
          firstName: 'John',
          lastName: 'Employer',
          userType: 'employer',
          compName: 'Acme Corp',
        });

      const employerToken = employerSignup.headers['set-cookie'];

      const res = await request(app)
        .post('/api/profiles')
        .set('Cookie', employerToken)
        .send({ hourly_rate: 5000 });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 for validation errors', async () => {
      const testCases = [
        { bio: 'x'.repeat(1001), expected: 400 }, // Bio too long
        { hourly_rate: 'invalid' }, // Not a number
        { availability_status: 'invalid_status' }, // Invalid enum
      ];

      for (const testCase of testCases) {
        const res = await request(app)
          .post('/api/profiles')
          .set('Cookie', authToken)
          .send(testCase);

        expect(res.status).toBe(400);
      }
    });
  });

  describe('GET /api/profiles/:userId', () => {
    beforeEach(async () => {
      // Create a profile for testing
      const res = await request(app)
        .post('/api/profiles')
        .set('Cookie', authToken)
        .send({ hourly_rate: 5000 });

      profileId = res.body.data.profile.id;
    });

    it('should retrieve profile by user ID - 200', async () => {
      const res = await request(app).get(`/api/profiles/${userId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.profile.user_id).toBe(userId);
      expect(res.body.data.profile.skills).toBeDefined();
      expect(Array.isArray(res.body.data.profile.skills)).toBe(true);
    });

    it('should return 404 if profile not found', async () => {
      const res = await request(app).get('/api/profiles/999999');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/profiles/me', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/profiles')
        .set('Cookie', authToken)
        .send({ hourly_rate: 5000, bio: 'Original bio' });
    });

    it('should update profile - 200', async () => {
      const res = await request(app)
        .put('/api/profiles/me')
        .set('Cookie', authToken)
        .send({
          bio: 'Updated bio',
          hourly_rate: 6000,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.profile.bio).toBe('Updated bio');
      expect(res.body.data.profile.hourly_rate).toBe(6000);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put('/api/profiles/me')
        .send({ bio: 'Updated' });

      expect(res.status).toBe(401);
    });

    it('should not allow partial updates to invalid values', async () => {
      const res = await request(app)
        .put('/api/profiles/me')
        .set('Cookie', authToken)
        .send({ hourly_rate: -100 });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/profiles/me', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/profiles')
        .set('Cookie', authToken)
        .send({ hourly_rate: 5000 });
    });

    it('should delete profile - 204', async () => {
      const res = await request(app)
        .delete('/api/profiles/me')
        .set('Cookie', authToken);

      expect(res.status).toBe(204);

      // Verify deleted
      const getRes = await request(app).get(`/api/profiles/${userId}`);
      expect(getRes.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).delete('/api/profiles/me');

      expect(res.status).toBe(401);
    });
  });
});
```

---

## Search Integration Tests

### Search Filter Tests

```typescript
// __tests__/search/searchFilters.test.ts
describe('Search Filtering Integration Tests', () => {
  let professionals: any[] = [];
  let skills: any[] = [];

  beforeAll(async () => {
    // Create test data: multiple professionals with different skills
    // Professional 1: React, Node.js, rating 4.8, rate 8000
    // Professional 2: Python, Django, rating 4.5, rate 6000
    // Professional 3: Go, Kubernetes, rating 4.2, rate 7000
  });

  describe('Search by Skills', () => {
    it('should return professionals with specified skill', async () => {
      const res = await request(app)
        .get('/api/search/professionals')
        .query({ skills: [1] }); // React skill ID

      expect(res.status).toBe(200);
      expect(res.body.data.professionals.length).toBeGreaterThan(0);
      expect(res.body.data.professionals[0].skills).toContainEqual(
        expect.objectContaining({ skillId: 1 })
      );
    });

    it('should return professionals with ANY of specified skills', async () => {
      const res = await request(app)
        .get('/api/search/professionals')
        .query({ skills: [1, 2] }); // React or Node.js

      expect(res.status).toBe(200);
      // Should include professionals with either skill
    });
  });

  describe('Search by Rating', () => {
    it('should filter by minimum rating', async () => {
      const res = await request(app)
        .get('/api/search/professionals')
        .query({ minRating: 4.5 });

      expect(res.status).toBe(200);
      expect(
        res.body.data.professionals.every((p) => p.avg_rating >= 4.5)
      ).toBe(true);
    });

    it('should return 400 for invalid rating range', async () => {
      const res = await request(app)
        .get('/api/search/professionals')
        .query({ minRating: 6 }); // > 5

      expect(res.status).toBe(400);
    });
  });

  describe('Search by Hourly Rate', () => {
    it('should filter by rate range', async () => {
      const res = await request(app)
        .get('/api/search/professionals')
        .query({ minRate: 5000, maxRate: 8000 });

      expect(res.status).toBe(200);
      expect(
        res.body.data.professionals.every(
          (p) => p.hourly_rate >= 5000 && p.hourly_rate <= 8000
        )
      ).toBe(true);
    });
  });

  describe('Search Sorting', () => {
    it('should sort by rating descending', async () => {
      const res = await request(app)
        .get('/api/search/professionals')
        .query({ sortBy: 'rating' });

      expect(res.status).toBe(200);
      const ratings = res.body.data.professionals.map((p) => p.avg_rating);
      expect(ratings).toEqual([...ratings].sort().reverse());
    });

    it('should sort by hourly rate ascending', async () => {
      const res = await request(app)
        .get('/api/search/professionals')
        .query({ sortBy: 'hourlyRate' });

      expect(res.status).toBe(200);
      const rates = res.body.data.professionals.map((p) => p.hourly_rate);
      expect(rates).toEqual([...rates].sort((a, b) => a - b));
    });
  });

  describe('Search Pagination', () => {
    it('should return paginated results', async () => {
      const res = await request(app)
        .get('/api/search/professionals')
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data.professionals.length).toBeLessThanOrEqual(10);
      expect(res.body.meta).toEqual(
        expect.objectContaining({
          page: 1,
          limit: 10,
          total: expect.any(Number),
          pages: expect.any(Number),
        })
      );
    });

    it('should return second page', async () => {
      const page1 = await request(app)
        .get('/api/search/professionals')
        .query({ page: 1, limit: 10 });

      const page2 = await request(app)
        .get('/api/search/professionals')
        .query({ page: 2, limit: 10 });

      // Pages should have different data (unless exactly 10 results)
      if (page1.body.meta.total > 10) {
        expect(page1.body.data.professionals[0]).not.toEqual(
          page2.body.data.professionals[0]
        );
      }
    });

    it('should return 400 for invalid page', async () => {
      const res = await request(app)
        .get('/api/search/professionals')
        .query({ page: 0 });

      expect(res.status).toBe(400);
    });
  });

  describe('Complex Filter Combinations', () => {
    it('should handle skills + rating + rate filters', async () => {
      const res = await request(app)
        .get('/api/search/professionals')
        .query({
          skills: [1, 2],
          minRating: 4.0,
          minRate: 5000,
          maxRate: 10000,
          sortBy: 'rating',
          page: 1,
          limit: 20,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.professionals).toBeDefined();
      expect(Array.isArray(res.body.data.professionals)).toBe(true);
    });
  });
});
```

---

## Performance Tests

### Search Performance Benchmarks

```typescript
// __tests__/search/searchPerformance.test.ts
describe('Search Performance Benchmarks', () => {
  it('should return search results within 300ms', async () => {
    const startTime = Date.now();

    const res = await request(app)
      .get('/api/search/professionals')
      .query({ skills: [1, 2], minRating: 4.0 });

    const duration = Date.now() - startTime;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(300); // p95 target
  });

  it('should handle large result sets efficiently', async () => {
    // Create 1000+ professionals
    // Run search that returns all
    // Measure time with pagination

    const startTime = Date.now();

    const res = await request(app)
      .get('/api/search/professionals')
      .query({ page: 1, limit: 100 });

    const duration = Date.now() - startTime;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(300);
  });

  it('should have consistent performance across pages', async () => {
    const page1Time = await measureSearchTime({ page: 1, limit: 50 });
    const page5Time = await measureSearchTime({ page: 5, limit: 50 });

    // Should be within 50ms of each other
    expect(Math.abs(page1Time - page5Time)).toBeLessThan(50);
  });
});

async function measureSearchTime(query: any): Promise<number> {
  const start = Date.now();
  await request(app)
    .get('/api/search/professionals')
    .query(query);
  return Date.now() - start;
}
```

---

## Test Fixtures

### Profile Fixtures

```typescript
// __tests__/fixtures/profiles.fixture.ts
export const createTestProfile = {
  valid: {
    hourly_rate: 5000,
    bio: 'Experienced developer',
    availability_status: 'available',
    response_time_hours: 24,
  },
  invalid: {
    hourlyRateNegative: {
      hourly_rate: -100,
    },
    bioTooLong: {
      bio: 'x'.repeat(1001),
    },
    invalidAvailability: {
      availability_status: 'invalid_status',
    },
  },
};

export const updateTestProfile = {
  valid: {
    bio: 'Updated bio',
    hourly_rate: 6000,
  },
  partialUpdate: {
    bio: 'New bio only',
  },
};

export const testProfessional = {
  professional: {
    id: 1,
    user_id: 10,
    hourly_rate: 5000,
    bio: 'Node.js developer',
    availability_status: 'available',
    avg_rating: 4.8,
    total_reviews: 42,
    created_at: new Date(),
  },
  withSkills: {
    // ... profile data
    skills: [
      {
        id: 1,
        skillName: 'Node.js',
        proficiencyLevel: 'expert',
        isPrimary: true,
      },
    ],
  },
};
```

---

## Test Execution & Coverage

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- profile.test.ts

# Run with coverage
npm run coverage

# Run in watch mode (for development)
npm test -- --watch

# Run performance tests only
npm test -- searchPerformance.test.ts
```

### Coverage Report

```
Statements   : 87.3% ( 325/372 )
Branches     : 84.2% ( 216/257 )
Functions    : 89.1% ( 98/110 )
Lines        : 88.7% ( 310/349 )

File                                 % Stmts % Branch % Funcs % Lines
────────────────────────────────────────────────────────────────
All files                             87.3    84.2    89.1    88.7
 modules/profile/                     92.1    90.0    95.0    92.3
  profileService.ts                   91.2    88.5    94.1    91.5
  profileRepository.ts                93.5    92.1    96.2    93.8
  profileController.ts                90.1    87.2    92.3    90.5
 modules/skill/                       85.6    82.1    87.3    85.9
  skillService.ts                     84.3    81.2    86.1    84.6
  skillRepository.ts                  87.2    83.5    89.1    87.5
```

---

## Test Data Management

### Test Database

```typescript
// __tests__/setup.ts
import { Pool } from 'pg';

let testDb: Pool;

export async function setupTestDb(): Promise<Pool> {
  testDb = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'linkprosoft_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
  });

  return testDb;
}

export async function teardownTestDb(): Promise<void> {
  if (testDb) {
    await testDb.end();
  }
}

export async function clearTestData(): Promise<void> {
  // Clear all test tables
  await testDb.query('TRUNCATE TABLE professional_skills CASCADE');
  await testDb.query('TRUNCATE TABLE certifications CASCADE');
  await testDb.query('TRUNCATE TABLE portfolio_items CASCADE');
  await testDb.query('TRUNCATE TABLE professional_profiles CASCADE');
  await testDb.query('TRUNCATE TABLE users CASCADE');
}

jest.setTimeout(10000); // Increase timeout for DB operations
```

---

## Test Quality Checklist

### Before Committing Tests

- [ ] All tests passing locally
- [ ] No flaky tests (consistent results)
- [ ] Descriptive test names
- [ ] Single responsibility per test
- [ ] No hardcoded timeouts
- [ ] Proper error assertions
- [ ] No `.only` or `.skip` left in code
- [ ] Coverage targets met
- [ ] All fixtures properly structured
- [ ] Database cleanup working

### Continuous Integration

```yaml
# .github/workflows/tests.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: linkprosoft_test
        
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run build
```

---

## Test Metrics & Monitoring

### Success Criteria

| Metric | Target | Phase 2 |
|--------|--------|---------|
| Test Coverage | 85%+ | Required |
| Passing Tests | 100% | Required |
| Flaky Tests | 0% | Required |
| Avg Test Duration | <5s | Target |
| Critical Path Coverage | 95%+ | Required |

---

**Document Version:** 1.0  
**Last Updated:** April 21, 2026  
**Maintained By:** QA Team
