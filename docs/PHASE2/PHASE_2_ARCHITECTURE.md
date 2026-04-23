# Linkprosoft Backend - Phase 2: Architecture Design

**Version:** 1.0  
**Scope:** Professional Profile Management, Skills, Certifications, Portfolio, Discovery  
**Build on:** Phase 1 Foundation (Auth + User Management)  

---

## Executive Summary

Phase 2 extends the Phase 1 MVP foundation with professional profile management, skills system, and discovery features. This architecture maintains modular design patterns while introducing complex relationships between professionals, skills, certifications, and portfolio items.

---

## System Architecture Overview

### Macro-Level Components

```
┌─────────────────────────────────────────────────────────┐
│                  CLIENT LAYER                           │
│           (React Frontend @ :5173)                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  Profile Management UI                          │   │
│  │  - Edit profile (hourly rate, bio, availability)│   │
│  │  - Add/remove skills (with proficiency)         │   │
│  │  - Manage certifications                        │   │
│  │  - Add portfolio items                          │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Discovery/Search UI                            │   │
│  │  - Search professionals by skills               │   │
│  │  - Filter by location, rating, rate             │   │
│  │  - View professional profiles                   │   │
│  └─────────────────────────────────────────────────┘   │
└────────┬──────────────────────────────────────────────┘
         │ HTTP(S) + JWT Cookies
         │ JSON REST API
         ▼
┌─────────────────────────────────────────────────────────┐
│                 API GATEWAY LAYER                       │
│          (Express @ :5020)                              │
├─────────────────────────────────────────────────────────┤
│  ├─ CORS Middleware (allow :5173)                      │
│  ├─ Request Logger                                     │
│  ├─ Error Handler                                      │
│  ├─ Auth Middleware (JWT verification)                │
│  ├─ Validation Middleware (Zod schemas)               │
│  └─ Rate Limiter (Phase 2.5+)                         │
└────────┬──────────────────────────────────────────────┘
         │
    ┌────┴────────────────────────────────────────────┐
    │                                                 │
    ▼                                    ▼
┌──────────────────┐        ┌────────────────────────┐
│   Auth Routes    │        │  Phase 2 NEW Routes    │
│  /api/auth/*     │        │  /api/profiles/*       │
│                  │        │  /api/skills/*         │
│  (Phase 1)       │        │  /api/certifications/* │
│  - signup        │        │  /api/portfolio/*      │
│  - login         │        │  /api/search/*         │
│  - verify        │        │  /api/me/*             │
│  - logout        │        │                        │
└──────┬───────────┘        └────────┬───────────────┘
       │                            │
       └────────────┬───────────────┘
                    │
        BUSINESS LOGIC LAYER
     (Services + Repositories)
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌──────────────┐  ┌────────────┐  ┌────────────┐
│ ProfileServ. │  │SkillServ. │  │ SearchServ.│
├──────────────┤  ├────────────┤  ├────────────┤
│- create()    │  │- addSkill()│  │- filter()  │
│- get()       │  │- remove() │  │- paginate()│
│- update()    │  │- list()   │  │- sort()    │
│- delete()    │  └────────────┘  └────────────┘
└──────┬───────┘
       │
    DATA ACCESS LAYER
  (Repositories)
       │
    ┌──┴──────────────────────────────────┐
    │                                     │
    ▼                                     ▼
┌──────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                         │
│               (PostgreSQL 13+)                           │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌────────────────┐ ┌───────────────┐  │
│ │users         │ │prof_profiles   │ │skills         │  │
│ │(Phase 1)     │ │(Phase 2 NEW)   │ │(Phase 2 NEW)  │  │
│ │- id(PK)      │ │- id(PK)        │ │- id(PK)       │  │
│ │- email       │ │- user_id(FK)   │ │- name(UNIQUE) │  │
│ │- password    │ │- hourly_rate   │ │- category     │  │
│ │- user_type   │ │- bio           │ │- description  │  │
│ └──────────────┘ │- availability  │ └───────────────┘  │
│                  │- avg_rating    │                    │
│                  │- total_reviews │                    │
│                  └────────────────┘                    │
│ ┌──────────────────┐ ┌─────────────────┐              │
│ │prof_skills       │ │certifications   │              │
│ │(Phase 2 NEW)     │ │(Phase 2 NEW)    │              │
│ │- id(PK)          │ │- id(PK)         │              │
│ │- prof_id(FK)     │ │- prof_id(FK)    │              │
│ │- skill_id(FK)    │ │- title          │              │
│ │- proficiency     │ │- issuer         │              │
│ │- years_exp       │ │- issue_date     │              │
│ │- is_primary      │ │- expiry_date    │              │
│ └──────────────────┘ │- credential_url │              │
│                      └─────────────────┘              │
│ ┌─────────────────────────────────────┐              │
│ │portfolio_items (Phase 2 NEW)        │              │
│ │- id(PK)                             │              │
│ │- prof_id(FK)                        │              │
│ │- title                              │              │
│ │- description                        │              │
│ │- url                                │              │
│ │- image_url                          │              │
│ │- start_date                         │              │
│ │- end_date                           │              │
│ └─────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────┘
```

---

## Data Model & Relationships

### Entity Relationship Diagram

```
┌─────────────────────────────────┐
│          USERS (Phase 1)        │
├─────────────────────────────────┤
│ id (PK)                         │
│ email (UNIQUE)                  │
│ password (hashed)               │
│ first_name                      │
│ last_name                       │
│ user_type (professional|         │
│           employer)             │
│ comp_name                       │
│ created_at                      │
└────────────┬────────────────────┘
             │ 1:1
             │ (One user → one profile)
             │
             ▼
┌─────────────────────────────────────────┐
│   PROFESSIONAL_PROFILES (Phase 2)       │
├─────────────────────────────────────────┤
│ id (PK)                                 │
│ user_id (FK→users, UNIQUE, NOT NULL)   │
│ hourly_rate (DECIMAL)                  │
│ bio (TEXT, 1000 chars max)             │
│ availability_status (available|         │
│                      unavailable|away) │
│ response_time_hours (INT)              │
│ total_hours_worked (INT)               │
│ avg_rating (DECIMAL 0-5)               │
│ total_reviews (INT)                    │
│ created_at                             │
│ updated_at                             │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┬───────────────┐
        │ 1:M               │ 1:M           │ 1:M
        │ (1 prof → many)   │ (1 prof →     │ (1 prof →
        │                   │  many)        │  many)
        ▼                   ▼               ▼
    ┌─────────────────┐  ┌──────────────┐  ┌─────────────┐
    │ PROF_SKILLS     │  │CERTIFICATIONS│  │PORTFOLIO    │
    │ (Junction)      │  │              │  │ITEMS        │
    ├─────────────────┤  ├──────────────┤  ├─────────────┤
    │ id (PK)         │  │ id (PK)      │  │ id (PK)     │
    │ prof_id (FK)    │  │ prof_id (FK) │  │ prof_id (FK)│
    │ skill_id (FK)   │  │ title        │  │ title       │
    │ proficiency     │  │ issuer       │  │ description │
    │ years_exp       │  │ issue_date   │  │ url         │
    │ is_primary      │  │ expiry_date  │  │ image_url   │
    │ (UNIQUE: prof_  │  │ credential   │  │ start_date  │
    │  id,skill_id)   │  │ _url         │  │ end_date    │
    └────────┬─────────┘  └──────────────┘  └─────────────┘
             │
             │ M:M (Junction table)
             │ (Skills are shared master list)
             │
             ▼
    ┌──────────────────┐
    │ SKILLS (Master)  │
    ├──────────────────┤
    │ id (PK)          │
    │ name (UNIQUE)    │
    │ category         │
    │ description      │
    │ created_at       │
    └──────────────────┘
```

### Database Constraints & Indexes

**Primary Keys:**
- All tables: `id SERIAL PRIMARY KEY`

**Foreign Keys:**
- `professional_profiles.user_id` → `users.id` (ON DELETE CASCADE)
- `professional_skills.professional_id` → `professional_profiles.id` (ON DELETE CASCADE)
- `professional_skills.skill_id` → `skills.id` (ON DELETE CASCADE)
- `certifications.professional_id` → `professional_profiles.id` (ON DELETE CASCADE)
- `portfolio_items.professional_id` → `professional_profiles.id` (ON DELETE CASCADE)

**Unique Constraints:**
- `professional_profiles.user_id` - Only one profile per user
- `skills.name` - No duplicate skill names
- `professional_skills(professional_id, skill_id)` - Can't add same skill twice

**Indexes for Performance:**
```sql
-- Lookups by user
CREATE INDEX idx_prof_profiles_user_id ON professional_profiles(user_id);

-- Search & filtering
CREATE INDEX idx_prof_profiles_rating ON professional_profiles(avg_rating DESC);
CREATE INDEX idx_prof_profiles_availability ON professional_profiles(availability_status);
CREATE INDEX idx_skills_category ON skills(category);

-- Relationship queries
CREATE INDEX idx_prof_skills_prof_id ON professional_skills(professional_id);
CREATE INDEX idx_prof_skills_proficiency ON professional_skills(proficiency_level);
CREATE INDEX idx_certifications_prof_id ON certifications(professional_id);
CREATE INDEX idx_portfolio_items_prof_id ON portfolio_items(professional_id);
```

---

## Module Architecture

### Profile Module

```
profile/
├── profileController.ts
│   └── Handles HTTP requests for profile CRUD
│       - POST /api/profiles (create)
│       - GET /api/profiles/:userId (get public profile)
│       - GET /api/profiles/me (get authenticated user's profile)
│       - PUT /api/profiles/me (update)
│       - DELETE /api/profiles/me (delete)
│
├── profileService.ts
│   └── Business logic for profiles
│       - createProfile(userId, data)
│       - getProfile(userId)
│       - getProfileWithDetails(userId) - Includes skills, certs, portfolio
│       - updateProfile(userId, data)
│       - deleteProfile(userId)
│       - Private DTOs transformations
│
├── profileRepository.ts
│   └── Data access layer
│       - create(userId, data): Promise<Profile>
│       - findByUserId(userId): Promise<Profile>
│       - findByUserIdWithDetails(userId): Promise<ProfileWithDetails>
│       - update(profileId, data): Promise<Profile>
│       - delete(profileId): Promise<void>
│
├── profileRoutes.ts
│   └── Route definitions
│       - Wires controller to express routes
│       - Applies middleware (auth, validation)
│
├── profileValidation.ts
│   └── Zod schemas
│       - createProfileSchema
│       - updateProfileSchema
│
└── types/
    └── index.ts
        - ProfessionalProfile (entity)
        - ProfessionalProfileDTO (response)
        - CreateProfileRequest (input)
        - UpdateProfileRequest (input)
```

### Skill Module

```
skill/
├── skillController.ts
│   └── HTTP handlers
│       - POST /api/profiles/me/skills (add skill)
│       - GET /api/profiles/:userId/skills (list skills)
│       - DELETE /api/profiles/me/skills/:skillId (remove)
│       - PUT /api/profiles/me/skills/:skillId (update proficiency)
│
├── skillService.ts
│   └── Business logic
│       - addSkill(profileId, skillId, proficiency, yearsExp)
│       - removeSkill(profileId, skillId)
│       - getSkills(profileId)
│       - updateSkillProficiency(skillId, proficiency)
│       - setPrimarySkill(profileId, skillId)
│
├── skillRepository.ts
│   └── Data access
│       - getAllSkills(): Promise<Skill[]>
│       - findSkillById(skillId): Promise<Skill>
│       - addSkillToProfile(profileId, skillId, data)
│       - removeSkillFromProfile(profileId, skillId)
│       - getProfileSkills(profileId)
│       - createSkill(name, category) - Admin only (Phase 3)
│
├── skillRoutes.ts
├── skillValidation.ts
└── types/index.ts
    - Skill (entity)
    - ProfessionalSkill (entity - junction table)
    - SkillDTO (response)
```

### Certification Module

```
certification/
├── certificationController.ts
│   └── HTTP handlers
│       - POST /api/certifications (add)
│       - GET /api/certifications/:certId (get)
│       - PUT /api/certifications/:certId (update)
│       - DELETE /api/certifications/:certId (remove)
│       - GET /api/profiles/:userId/certifications (list)
│
├── certificationService.ts
│   └── Business logic
│       - addCertification(profileId, data)
│       - getCertification(certId)
│       - updateCertification(certId, data)
│       - deleteCertification(certId)
│       - getCertificationsByProfile(profileId)
│       - verifyCertificationExpiry() - Batch job (Phase 2.5)
│
├── certificationRepository.ts
│   └── Data access
│       - create(profileId, data)
│       - findById(certId)
│       - findByProfileId(profileId)
│       - update(certId, data)
│       - delete(certId)
│       - findExpiredCertifications() - for batch jobs
│
├── certificationRoutes.ts
├── certificationValidation.ts
└── types/index.ts
    - Certification (entity)
    - CertificationDTO (response)
```

### Portfolio Module

```
portfolio/
├── portfolioController.ts
│   └── HTTP handlers
│       - POST /api/portfolio (add item)
│       - GET /api/portfolio/:itemId (get)
│       - PUT /api/portfolio/:itemId (update)
│       - DELETE /api/portfolio/:itemId (remove)
│       - GET /api/profiles/:userId/portfolio (list)
│
├── portfolioService.ts
│   └── Business logic
│       - addPortfolioItem(profileId, data)
│       - getPortfolioItem(itemId)
│       - updatePortfolioItem(itemId, data)
│       - deletePortfolioItem(itemId)
│       - getPortfolioByProfile(profileId)
│       - reorderPortfolio(itemIds) - Change display order
│
├── portfolioRepository.ts
├── portfolioRoutes.ts
├── portfolioValidation.ts
└── types/index.ts
    - PortfolioItem (entity)
    - PortfolioItemDTO (response)
```

### Search Module

```
search/
├── searchController.ts
│   └── HTTP handlers
│       - GET /api/search/professionals (main search)
│       - GET /api/search/skills (skill autocomplete)
│       - GET /api/search/filters (available filters)
│
├── searchService.ts
│   └── Business logic
│       - searchProfessionals(filters): Promise<SearchResults>
│       - Handles:
│         • Skill filtering (M:M join)
│         • Location filtering
│         • Rating range filtering
│         • Hourly rate filtering
│         • Availability filtering
│         • Sorting (rating, rate, recent)
│         • Pagination
│
├── searchRepository.ts
│   └── Complex queries
│       - performSearch(filters): Promise<Professional[]>
│       - countSearchResults(filters): Promise<number>
│       - getAutocompleteSkills(query): Promise<Skill[]>
│
├── searchRoutes.ts
├── searchValidation.ts
└── types/index.ts
    - SearchFilters (input)
    - SearchResults (paginated response)
```

---

## Design Patterns Used

### 1. Repository Pattern

**Purpose:** Isolate data access logic from business logic

```typescript
// Benefits:
// - Easy to mock repositories for testing
// - Database changes don't affect services
// - Consistent data access interface
// - Single source of query logic

interface IRepository<T> {
  create(data: T): Promise<T>;
  findById(id: number): Promise<T | null>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}
```

### 2. Service Pattern

**Purpose:** Encapsulate business logic and data transformations

```typescript
// Benefits:
// - Controllers stay thin
// - Business rules centralized
// - Easy to reuse across controllers
// - DTOs transformation here

class ProfileService {
  constructor(
    private profileRepository: ProfileRepository,
    private skillRepository: SkillRepository,
  ) {}
  
  // Orchestrates multiple repositories
  async createProfile(userId, data) {
    // Validation + business logic
    // Coordinates repositories
    // Returns DTO (not entity)
  }
}
```

### 3. DTO (Data Transfer Object) Pattern

**Purpose:** Control what data leaves the API

```typescript
// Entity (what's in DB):
interface ProfessionalProfile {
  id: number;
  user_id: number;
  hourly_rate: number;
  bio: string;
  avg_rating: number;
  total_reviews: number;
}

// DTO (what we send to client):
interface ProfessionalProfileDTO {
  id: number;
  hourly_rate: number;
  bio: string;
  avg_rating: number;
  total_reviews: number;
  // Note: no user_id (internal)
}

// Service transforms:
private toDTO(entity: ProfessionalProfile): ProfessionalProfileDTO {
  const { user_id, ...dto } = entity; // Exclude user_id
  return dto;
}
```

### 4. Dependency Injection

**Purpose:** Loose coupling between components

```typescript
// Container-like pattern:
const db = createDatabasePool();
const profileRepository = new ProfileRepository(db);
const skillRepository = new SkillRepository(db);
const profileService = new ProfileService(
  profileRepository,
  skillRepository
);
const profileController = new ProfileController(profileService);

// Testable: can inject mocks
const mockRepository = {
  findByUserId: jest.fn(() => ({...}))
};
const service = new ProfileService(mockRepository);
```

### 5. Middleware Pattern

**Purpose:** Cross-cutting concerns (auth, validation, logging)

```typescript
// Middleware chain:
app.post('/api/profiles',
  authMiddleware,              // Verify JWT
  validationMiddleware(schema), // Validate input
  (req, res) => {...}           // Handler
);

// Each middleware can:
// - Access req/res
// - Call next() to continue chain
// - Throw errors to stop chain
```

---

## Request/Response Flow

### Example: Create Professional Profile

```
1. CLIENT REQUEST
   POST /api/profiles
   Headers: Authorization: Bearer <jwt>, Cookie: token=<jwt>
   Body: {
     "hourly_rate": 5000,
     "bio": "Experienced Node.js developer",
     "availability_status": "available"
   }

2. MIDDLEWARE CHAIN
   
   a) authMiddleware
      - Extracts JWT from cookie/header
      - Verifies signature & expiry
      - Adds req.user = { id, email, userType }
      - Next()
   
   b) validationMiddleware(createProfileSchema)
      - Validates req.body against Zod schema
      - If invalid: throws AppError (400)
      - If valid: req.body = validated data
      - Next()
   
   c) errorMiddleware (catches errors from above)

3. CONTROLLER LAYER
   profileController.createProfile(req, res)
   
   a) Extract data from req:
      - userId from req.user.id
      - userType from req.user.userType
      - validatedData from req.body (already validated)
   
   b) Call service:
      profile = await profileService.createProfile(
        userId,
        userType,
        validatedData
      )
   
   c) Return response via ApiResponseHandler:
      ApiResponseHandler.created(res, { profile }, message)

4. SERVICE LAYER
   profileService.createProfile(userId, userType, data)
   
   a) Validation:
      - Check userType === 'professional'
      - Else throw AppError (403)
   
   b) Call repository:
      try {
        profile = await profileRepository.create(userId, data)
      } catch (error) {
        if (error.code === '23505') // Unique constraint
          throw new AppError('Profile exists', 'CONFLICT', 409)
      }
   
   c) Transform to DTO:
      return this.toDTO(profile)

5. REPOSITORY LAYER
   profileRepository.create(userId, data)
   
   a) Build SQL query (parameterized):
      INSERT INTO professional_profiles (
        user_id, hourly_rate, bio, availability_status, response_time_hours
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
   
   b) Execute via db pool:
      result = await this.db.query(query, [
        userId,
        data.hourly_rate,
        data.bio,
        data.availability_status,
        data.response_time_hours
      ])
   
   c) Return entity:
      if (result.rowCount === 0) throw NotFoundError
      return result.rows[0]

6. DATABASE
   PostgreSQL receives query
   - Validates constraints (user_id exists, unique)
   - Inserts row
   - Returns inserted row with id
   - DB confirms success/failure

7. RESPONSE FLOW (back up the chain)
   
   a) Service returns DTO
   
   b) Controller calls:
      ApiResponseHandler.created(res, { profile }, message)
      
      Which does:
      res.status(201).json({
        success: true,
        message: message,
        data: { profile: {...} },
        timestamp: new Date().toISOString()
      })
   
   c) Express sends HTTP response

8. CLIENT RECEIVES
   HTTP 201 Created
   Body: {
     "success": true,
     "message": "Professional profile created successfully",
     "data": {
       "profile": {
         "id": 123,
         "hourly_rate": 5000,
         "bio": "Experienced Node.js developer",
         "availability_status": "available",
         "avg_rating": 0,
         "total_reviews": 0,
         "skills": [],
         "certifications": [],
         "portfolio": [],
         "created_at": "2026-04-21T10:30:00Z"
       }
     },
     "timestamp": "2026-04-21T10:30:00Z"
   }
```

---

## Complex Query Examples

### Search Professionals by Skills

```sql
-- Find professionals with specific skills, filter by rating & rate
SELECT DISTINCT
  pp.id,
  pp.user_id,
  u.email,
  u.first_name,
  u.last_name,
  pp.hourly_rate,
  pp.bio,
  pp.availability_status,
  pp.avg_rating,
  pp.total_reviews,
  COUNT(DISTINCT ps.id) as skill_count,
  json_agg(
    json_build_object(
      'skillName', s.name,
      'proficiencyLevel', ps.proficiency_level,
      'isPrimary', ps.is_primary
    )
  ) as skills
FROM professional_profiles pp
JOIN users u ON pp.user_id = u.id
LEFT JOIN professional_skills ps ON pp.id = ps.professional_id
LEFT JOIN skills s ON ps.skill_id = s.id
WHERE
  -- Filter by skills (any matching skill)
  ps.skill_id IN (?, ?) -- Parameterized: skill IDs
  -- Filter by rating
  AND pp.avg_rating >= ? -- Min rating
  -- Filter by hourly rate
  AND pp.hourly_rate BETWEEN ? AND ? -- Min and max
  -- Filter by availability
  AND pp.availability_status = ? -- 'available'
  -- Filter by location (future enhancement)
  -- AND u.location ILIKE ? -- Search location
GROUP BY pp.id, pp.user_id, u.email, u.first_name, u.last_name
ORDER BY pp.avg_rating DESC, pp.hourly_rate ASC
LIMIT ? OFFSET ?; -- Pagination
```

**Performance Considerations:**
- Indexes on `professional_skills(professional_id, skill_id)`
- Index on `professional_profiles(avg_rating DESC)`
- JOIN optimization with connection pooling
- Query result caching (Phase 3+)

---

## Error Handling Architecture

### Error Hierarchy

```
AppError (base)
├── ValidationError (400)
│   ├── Missing field
│   ├── Invalid format
│   └── Out of range
├── NotFoundError (404)
│   ├── Profile not found
│   ├── Skill not found
│   └── Certification not found
├── ConflictError (409)
│   ├── Profile already exists
│   ├── Skill already added
│   └── Duplicate email
├── AuthenticationError (401)
│   ├── Invalid credentials
│   ├── Missing token
│   └── Expired token
├── AuthorizationError (403)
│   ├── Only professionals can create profiles
│   └── Cannot modify other's profile
└── ServerError (500)
    └── Database connection error
```

### Error Flow

```typescript
// In Controller:
try {
  // Code that might fail
} catch (error) {
  // Error automatically caught by catchAsync wrapper
  // and passed to error middleware
}

// In Error Middleware:
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      timestamp: new Date().toISOString()
    });
  }
  
  // Unknown error
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});
```

---

## Performance Optimization Strategies

### 1. Database Query Optimization

```sql
-- ✅ GOOD: Use indexes
CREATE INDEX idx_prof_profiles_rating ON professional_profiles(avg_rating DESC);
SELECT * FROM professional_profiles 
WHERE avg_rating >= 4.0 
ORDER BY avg_rating DESC; -- Uses index

-- ❌ BAD: No index, full table scan
SELECT * FROM professional_profiles 
WHERE LOWER(bio) LIKE '%developer%'; -- Expensive
```

### 2. Connection Pooling

```typescript
// Use pg-pool for connection reuse
// Max connections: 20 (tunable based on load)
// Idle timeout: 30 seconds
// Connection timeout: 2 seconds

const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. Response Caching (Phase 2.5+)

```typescript
// Cache search results for 5 minutes
const searchResults = await cacheManager.get(`search:${queryHash}`);
if (searchResults) return searchResults;

const results = await searchRepository.search(filters);
await cacheManager.set(`search:${queryHash}`, results, 300);
return results;
```

### 4. Pagination for Large Results

```typescript
// Don't return all 10,000 results at once
const page = req.query.page || 1;
const limit = req.query.limit || 20;
const offset = (page - 1) * limit;

const results = await searchRepository.search({
  ...filters,
  limit,
  offset
});
```

---

## Security Measures

### 1. Input Validation

```typescript
// All inputs validated with Zod before reaching service
const createProfileSchema = z.object({
  hourly_rate: z.number().positive().max(10000),
  bio: z.string().max(1000),
  availability_status: z.enum(['available', 'unavailable', 'away']),
});
```

### 2. SQL Injection Prevention

```typescript
// ✅ GOOD: Parameterized queries
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email] // Parameter passed separately
);

// ❌ BAD: String concatenation
const result = await db.query(
  `SELECT * FROM users WHERE email = '${email}'` // Vulnerable
);
```

### 3. Password Security

```typescript
// Passwords hashed with bcrypt (12 rounds)
// Never returned in responses
// Only verified in AuthService during login
```

### 4. JWT Token Security

```typescript
// Tokens stored in HTTP-only cookies
// httpOnly: true - Prevents XSS attacks
// Secure: true - HTTPS only in production
// SameSite: 'lax' - Prevents CSRF attacks
// MaxAge: 7 days - Expiration
```

### 5. Rate Limiting (Phase 2.5+)

```typescript
// Prevent abuse of search endpoints
// 100 requests per 15 minutes per IP
app.use('/api/search', rateLimiter(100, 15));
```

---

## Scalability Considerations

### Phase 2 (Current - Monolith)

```
Single Express instance
├── Profile endpoints
├── Skill endpoints
├── Certification endpoints
├── Portfolio endpoints
├── Search endpoints
└── All use same PostgreSQL
```

**Scaling strategy:**
- Horizontal scaling: Multiple Express instances behind load balancer
- Database: Read replicas for search queries
- Caching layer: Redis for search results

### Phase 3+ (Microservices - Optional)

```
API Gateway
├── Auth Service (can stay in main)
├── Profile Service (extract if needed)
├── Search Service (separate if search complex)
├── Payment Service (separate for isolation)
└── Notification Service (separate for async)

Shared:
├── PostgreSQL (federation/sharding Phase 4+)
└── Redis (cache + message queue)
```

---

## Monitoring & Observability

### Key Metrics to Track

- **Response Times:** p50, p95, p99 latencies
- **Error Rates:** 4xx, 5xx percentages
- **Database Metrics:** Connection pool usage, query times
- **Business Metrics:** Active professionals, search volume

### Logging Strategy

```typescript
// Structured logging with Winston (Phase 3+)
logger.info('Profile created', {
  userId: 123,
  profileId: 456,
  duration: 145, // ms
  timestamp: new Date().toISOString()
});

logger.error('Search failed', {
  filters: { skills: [1, 2, 3] },
  error: 'Connection timeout',
  userId: 789
});
```

---

## Deployment Architecture

### Development Environment

```
localhost:5173  → React frontend
localhost:5020  → Express backend
localhost:5432 → PostgreSQL
```

### Production Environment (Phase 3+)

```
CDN (Cloudflare)
    ↓
API Gateway (Kong/AWS ALB)
    ↓
[Express Instance 1] ──┐
[Express Instance 2] ──├→ Load Balancer
[Express Instance 3] ──┘
    ↓
PostgreSQL (Primary)
    ├─ Read Replica 1
    └─ Read Replica 2
    ↓
Redis (Caching)
    ↓
Monitoring (Prometheus/Datadog)
```

---

**Document Version:** 1.0  
**Last Updated:** April 21, 2026  
**Maintained By:** Backend Team
