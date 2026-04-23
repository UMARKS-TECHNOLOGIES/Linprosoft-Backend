# Linkprosoft Backend - Phase 2: Professional Profiles & Discovery

**Version:** 1.0  
**Timeline:** Weeks 4-6 (3 weeks)  
**Focus:** Professional Profile Management, Skills, Certifications, Discovery & Search  
**Build on:** Phase 1 MVP Foundation (Auth + User Management)  

---

## Table of Contents

1. [Overview & Goals](#overview--goals)
2. [Architecture & Design Patterns](#architecture--design-patterns)
3. [Project Structure](#project-structure)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Coding Standards & Style Guide](#coding-standards--style-guide)
6. [Database Layer Pattern](#database-layer-pattern)
7. [Service Layer Pattern](#service-layer-pattern)
8. [Error Handling & Validation](#error-handling--validation)
9. [Testing Strategy](#testing-strategy)
10. [Integration Checklist](#integration-checklist)

---

## Overview & Goals

### Phase 2 Objectives

✅ **Implement Professional Profile Management** (create, read, update, delete)  
✅ **Build Skills Management System** (add/remove skills with proficiency)  
✅ **Add Certifications Management** (create, update, verify)  
✅ **Implement Portfolio System** (showcase professional work)  
✅ **Build Professional Discovery/Search** (filter by skills, location, rating)  
✅ **Extend database with Phase 2 tables** (professional_profiles, skills, certifications, portfolio_items)  
✅ **Write comprehensive integration tests** (all new endpoints)  
✅ **Establish reusable service patterns** (ready for Phase 3 expansion)  

### Success Criteria

| # | Criterion | Metric | Status |
|---|-----------|--------|--------|
| 1 | Profile CRUD Operations | POST/GET/PUT/DELETE return 201/200/200/204 | To Complete |
| 2 | Skills Management | Add/remove skills with proficiency levels | To Complete |
| 3 | Input Validation | All endpoints validate with Zod schemas | To Complete |
| 4 | Search Functionality | Filter by skills, location, rating with pagination | To Complete |
| 5 | Auth Protection | All endpoints except search require JWT | To Complete |
| 6 | Response Times | Profile CRUD <150ms, Search <300ms | To Complete |
| 7 | No SQL Injection | All queries parameterized, no concatenation | To Complete |
| 8 | Type Safety | 100% TypeScript, no `any` types | To Complete |
| 9 | Test Coverage | 85%+ on critical paths, all CRUD tested | To Complete |
| 10 | Error Handling | Consistent error responses with proper status codes | To Complete |

---

## Architecture & Design Patterns

### Phase 2 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│              http://localhost:5173                          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (cookies, JWT)
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Express Server (Port 5020)                      │
│  http://localhost:5020/api                                  │
├─────────────────────────────────────────────────────────────┤
│  Routes Layer                   [PHASE 2 ADDITIONS]          │
│  ├─ /api/auth (AuthRoutes)                                  │
│  ├─ /api/users (UserRoutes)                                 │
│  ├─ /api/profiles (ProfileRoutes) ⭐ NEW                    │
│  ├─ /api/skills (SkillRoutes) ⭐ NEW                        │
│  ├─ /api/certifications (CertificationRoutes) ⭐ NEW        │
│  ├─ /api/portfolio (PortfolioRoutes) ⭐ NEW                 │
│  └─ /api/search (SearchRoutes) ⭐ NEW                       │
├─────────────────────────────────────────────────────────────┤
│  Middleware Layer                                           │
│  ├─ ErrorHandler                                            │
│  ├─ JwtMiddleware                                           │
│  ├─ ValidationMiddleware (request body validation)          │
│  ├─ CorsMiddleware                                          │
│  └─ RequestLogger                                           │
├─────────────────────────────────────────────────────────────┤
│  Controller Layer            [PHASE 2 ADDITIONS]             │
│  ├─ AuthController                                          │
│  ├─ UserController                                          │
│  ├─ ProfileController ⭐ NEW                                │
│  ├─ SkillController ⭐ NEW                                  │
│  ├─ CertificationController ⭐ NEW                          │
│  ├─ PortfolioController ⭐ NEW                              │
│  └─ SearchController ⭐ NEW                                 │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (Business Logic) [PHASE 2 ADDITIONS]          │
│  ├─ AuthService                                             │
│  ├─ UserService                                             │
│  ├─ ProfileService ⭐ NEW                                   │
│  ├─ SkillService ⭐ NEW                                     │
│  ├─ CertificationService ⭐ NEW                             │
│  ├─ PortfolioService ⭐ NEW                                 │
│  └─ SearchService ⭐ NEW                                    │
├─────────────────────────────────────────────────────────────┤
│  Repository Layer (Data Access) [PHASE 2 ADDITIONS]          │
│  ├─ UserRepository                                          │
│  ├─ ProfileRepository ⭐ NEW                                │
│  ├─ SkillRepository ⭐ NEW                                  │
│  ├─ CertificationRepository ⭐ NEW                          │
│  ├─ PortfolioRepository ⭐ NEW                              │
│  └─ SearchRepository ⭐ NEW                                 │
├─────────────────────────────────────────────────────────────┤
│  Database Layer                                             │
│  └─ PostgreSQL (connection pooling)                         │
│     ├─ users (Phase 1)                                      │
│     ├─ professional_profiles ⭐ (Phase 2)                   │
│     ├─ skills ⭐ (Phase 2)                                  │
│     ├─ professional_skills ⭐ (Phase 2 junction)            │
│     ├─ certifications ⭐ (Phase 2)                          │
│     └─ portfolio_items ⭐ (Phase 2)                         │
└─────────────────────────────────────────────────────────────┘
```

### Layered Architecture Extensions

**Phase 2 builds on Phase 1 patterns:**

1. **Controller Layer:**
   - Same request → service → response pattern
   - Input validation via middleware
   - Consistent error handling

2. **Service Layer:**
   - Business logic encapsulation
   - Cross-repository coordination
   - Data transformation/DTOs

3. **Repository Layer:**
   - Database abstraction
   - Query optimization
   - Transaction support

4. **Type Safety:**
   - Entity types (DB models)
   - DTO types (API response models)
   - Request validation schemas

### Data Relationships (ER Diagram - Enhanced)

```
┌──────────────────┐
│     USERS        │
├──────────────────┤
│ id (PK)          │
│ email            │
│ password         │ ← Phase 1
│ first_name       │
│ last_name        │
│ user_type        │
│ created_at       │
└────────┬─────────┘
         │ 1:1
         ▼
┌──────────────────────────────┐
│ PROFESSIONAL_PROFILES        │ ← Phase 2
├──────────────────────────────┤
│ id (PK)                      │
│ user_id (FK) ─┐              │
│ hourly_rate   │              │
│ bio           │              │
│ avg_rating    │              │
│ availability  │              │
│ created_at    │              │
└──────┬────────┴──────────────┘
       │ 1:M
       ▼
┌──────────────────────────┐     ┌───────────────┐
│ PROFESSIONAL_SKILLS      │     │    SKILLS     │
├──────────────────────────┤     ├───────────────┤
│ id (PK)                  │ M:M │ id (PK)       │
│ professional_id (FK) ────┼────→│ name          │
│ skill_id (FK) ───────────┼────→│ category      │
│ proficiency_level        │     │ description   │
│ years_of_experience      │     └───────────────┘
│ is_primary               │
└──────────────────────────┘

┌──────────────────────────┐     ┌────────────────────┐
│ CERTIFICATIONS           │     │ PORTFOLIO_ITEMS    │
├──────────────────────────┤     ├────────────────────┤
│ id (PK)                  │     │ id (PK)            │
│ professional_id (FK)     │ 1:M │ professional_id    │ 1:M
│ title                    │────→│ title              │←───┤
│ issuer                   │     │ description        │    │
│ issue_date               │     │ url                │    │
│ expiry_date              │     │ image_url          │    │
│ credential_url           │     │ start_date         │    │
└──────────────────────────┘     │ end_date           │    │
                                 │ created_at         │    │
                                 └────────────────────┘    │
                                                            │
                         (Professional Profile 1:M)────────┘
```

---

## Project Structure

### Phase 2 Folder Layout

```
linkprosoft_backend/
│
├── src/
│   ├── config/                      [From Phase 1]
│   │   ├── database.ts
│   │   ├── environment.ts
│   │   └── constants.ts
│   │
│   ├── types/                       [EXTENDED - Phase 2]
│   │   ├── index.ts
│   │   ├── user.types.ts            [Phase 1]
│   │   ├── auth.types.ts            [Phase 1]
│   │   ├── api.types.ts             [Phase 1]
│   │   ├── error.types.ts           [Phase 1]
│   │   ├── profile.types.ts         ⭐ NEW
│   │   ├── skill.types.ts           ⭐ NEW
│   │   ├── certification.types.ts   ⭐ NEW
│   │   ├── portfolio.types.ts       ⭐ NEW
│   │   └── search.types.ts          ⭐ NEW
│   │
│   ├── middleware/                  [EXTENDED - Phase 2]
│   │   ├── errorMiddleware.ts       [Phase 1]
│   │   ├── authMiddleware.ts        [Phase 1]
│   │   ├── validationMiddleware.ts  ⭐ NEW
│   │   └── requestLogger.ts         ⭐ NEW
│   │
│   ├── utils/                       [EXTENDED - Phase 2]
│   │   ├── appError.ts              [Phase 1]
│   │   ├── catchAsync.ts            [Phase 1]
│   │   ├── jwt.ts                   [Phase 1]
│   │   ├── response.ts              ⭐ NEW
│   │   ├── pagination.ts            ⭐ NEW
│   │   └── validators.ts            ⭐ NEW
│   │
│   ├── modules/                     [EXTENDED - Phase 2]
│   │
│   │   ├── auth/                    [Phase 1]
│   │   │   ├── authController.ts
│   │   │   ├── authService.ts
│   │   │   ├── authRepository.ts
│   │   │   ├── authRoutes.ts
│   │   │   ├── authValidation.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── user/                    [Phase 1]
│   │   │   ├── userController.ts
│   │   │   ├── userService.ts
│   │   │   ├── userRepository.ts
│   │   │   ├── userRoutes.ts
│   │   │   ├── userValidation.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── profile/                 ⭐ NEW (Phase 2)
│   │   │   ├── profileController.ts
│   │   │   ├── profileService.ts
│   │   │   ├── profileRepository.ts
│   │   │   ├── profileRoutes.ts
│   │   │   ├── profileValidation.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── skill/                   ⭐ NEW (Phase 2)
│   │   │   ├── skillController.ts
│   │   │   ├── skillService.ts
│   │   │   ├── skillRepository.ts
│   │   │   ├── skillRoutes.ts
│   │   │   ├── skillValidation.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── certification/           ⭐ NEW (Phase 2)
│   │   │   ├── certificationController.ts
│   │   │   ├── certificationService.ts
│   │   │   ├── certificationRepository.ts
│   │   │   ├── certificationRoutes.ts
│   │   │   ├── certificationValidation.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── portfolio/               ⭐ NEW (Phase 2)
│   │   │   ├── portfolioController.ts
│   │   │   ├── portfolioService.ts
│   │   │   ├── portfolioRepository.ts
│   │   │   ├── portfolioRoutes.ts
│   │   │   ├── portfolioValidation.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   └── search/                  ⭐ NEW (Phase 2)
│   │       ├── searchController.ts
│   │       ├── searchService.ts
│   │       ├── searchRepository.ts
│   │       ├── searchRoutes.ts
│   │       ├── searchValidation.ts
│   │       └── types/
│   │           └── index.ts
│   │
│   ├── __tests__/                   [EXTENDED - Phase 2]
│   │   ├── auth/                    [Phase 1]
│   │   │   ├── auth.test.ts
│   │   │   └── auth.fixtures.ts
│   │   │
│   │   ├── profile/                 ⭐ NEW
│   │   │   ├── profile.test.ts
│   │   │   ├── profileCrud.test.ts
│   │   │   └── profile.fixtures.ts
│   │   │
│   │   ├── skill/                   ⭐ NEW
│   │   │   ├── skill.test.ts
│   │   │   └── skill.fixtures.ts
│   │   │
│   │   ├── certification/           ⭐ NEW
│   │   │   ├── certification.test.ts
│   │   │   └── certification.fixtures.ts
│   │   │
│   │   ├── portfolio/               ⭐ NEW
│   │   │   ├── portfolio.test.ts
│   │   │   └── portfolio.fixtures.ts
│   │   │
│   │   ├── search/                  ⭐ NEW
│   │   │   ├── search.test.ts
│   │   │   ├── searchFilters.test.ts
│   │   │   └── search.fixtures.ts
│   │   │
│   │   └── setup.ts                 [Phase 1]
│   │
│   ├── app.ts                       [Phase 1]
│   └── server.ts                    [Phase 1]
│
├── docs/
│   ├── PHASE1/                      [Complete Phase 1 docs]
│   │   ├── PHASE_1_IMPLEMENTATION.md
│   │   ├── PHASE_1_ASSESSMENT.md
│   │   ├── PHASE_1_TESTING_QUICK_REFERENCE.md
│   │   ├── Thunder-Client-Collection.json
│   │   └── THUNDER_CLIENT_GUIDE.md
│   │
│   └── PHASE2/                      ⭐ NEW
│       ├── PHASE_2_IMPLEMENTATION.md (this file)
│       ├── PHASE_2_ARCHITECTURE.md
│       ├── PHASE_2_DATABASE_SCHEMA.md
│       ├── PHASE_2_ENDPOINTS.md
│       ├── PHASE_2_TESTING.md
│       ├── PHASE_2_ROADMAP.md
│       └── Thunder-Client-Collection.json (Phase 2 endpoints)
│
├── jest.config.js                  [Phase 1]
├── package.json                    [Phase 1]
└── tsconfig.json                   [Phase 1]
```

---

## Step-by-Step Implementation

### Step 1: Database Migration (Day 1)

**Objective:** Add Phase 2 tables to existing PostgreSQL database

**Files to Execute:**
```sql
-- 1. Verify Phase 1 tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'users';

-- 2. Create PROFESSIONAL_PROFILES table
CREATE TABLE professional_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hourly_rate DECIMAL(10, 2),
    bio TEXT,
    availability_status VARCHAR(20) DEFAULT 'available' 
        CHECK (availability_status IN ('available', 'unavailable', 'away')),
    response_time_hours INTEGER,
    total_hours_worked INTEGER DEFAULT 0,
    avg_rating DECIMAL(3, 2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX idx_professional_profiles_rating ON professional_profiles(avg_rating DESC);
CREATE INDEX idx_professional_profiles_availability ON professional_profiles(availability_status);

-- 3. Create SKILLS table (master list)
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);

-- 4. Create PROFESSIONAL_SKILLS junction table
CREATE TABLE professional_skills (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate' 
        CHECK (proficiency_level IN ('beginner', 'intermediate', 'expert')),
    years_of_experience INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(professional_id, skill_id)
);

CREATE INDEX idx_professional_skills_professional_id ON professional_skills(professional_id);
CREATE INDEX idx_professional_skills_skill_id ON professional_skills(skill_id);
CREATE INDEX idx_professional_skills_proficiency ON professional_skills(proficiency_level);

-- 5. Create CERTIFICATIONS table
CREATE TABLE certifications (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    issuer VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    credential_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_certifications_professional_id ON certifications(professional_id);

-- 6. Create PORTFOLIO_ITEMS table
CREATE TABLE portfolio_items (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    url VARCHAR(500),
    image_url VARCHAR(500),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portfolio_items_professional_id ON portfolio_items(professional_id);
```

**Acceptance Criteria:**
- ✅ All 5 new tables created without errors
- ✅ Foreign keys referencing users/profiles
- ✅ Indexes created for performance
- ✅ CHECK constraints enforce valid values
- ✅ UNIQUE constraints prevent duplicates

**Estimated Time:** 1 hour

---

### Step 2: Type Definitions (Day 1)

**Objective:** Create comprehensive TypeScript types for all Phase 2 entities

**Files to Create:**

1. `src/types/profile.types.ts` - Professional profile entities & DTOs
2. `src/types/skill.types.ts` - Skill management types
3. `src/types/certification.types.ts` - Certification types
4. `src/types/portfolio.types.ts` - Portfolio types
5. `src/types/search.types.ts` - Search query & filter types

**Key Type Patterns:**

```typescript
// Entity Type (Database model)
export interface ProfessionalProfile {
  id: number;
  user_id: number;
  hourly_rate: number | null;
  bio: string | null;
  availability_status: 'available' | 'unavailable' | 'away';
  response_time_hours: number | null;
  total_hours_worked: number;
  avg_rating: number;
  total_reviews: number;
  created_at: Date;
  updated_at: Date;
}

// DTO Type (API Response - sensitive fields excluded)
export interface ProfessionalProfileDTO {
  id: number;
  user_id: number;
  hourly_rate: number | null;
  bio: string | null;
  availability_status: 'available' | 'unavailable' | 'away';
  avg_rating: number;
  total_reviews: number;
  skills: ProfessionalSkillDTO[];
  certifications: CertificationDTO[];
  portfolio: PortfolioItemDTO[];
  created_at: Date;
}

// Request Type (Input validation)
export interface CreateProfileRequest {
  hourly_rate?: number;
  bio?: string;
  availability_status?: 'available' | 'unavailable' | 'away';
  response_time_hours?: number;
}

// Search Filter Type
export interface SearchFilters {
  skills?: number[];
  location?: string;
  minRating?: number;
  maxRate?: number;
  minRate?: number;
  availability?: 'available' | 'unavailable' | 'away';
  sortBy?: 'rating' | 'hourlyRate' | 'recent';
  page?: number;
  limit?: number;
}
```

**Acceptance Criteria:**
- ✅ All Phase 2 types defined without `any`
- ✅ Entity types match database schema exactly
- ✅ DTOs exclude sensitive/internal fields
- ✅ Request types for input validation
- ✅ Search types support filtering & pagination
- ✅ Exported from `src/types/index.ts`

**Estimated Time:** 2 hours

---

### Step 3: Validation Schemas (Day 1-2)

**Objective:** Create Zod schemas for request validation

**Files to Create:**

1. `src/modules/profile/profileValidation.ts` - Profile CRUD validation
2. `src/modules/skill/skillValidation.ts` - Skill management validation
3. `src/modules/certification/certificationValidation.ts` - Certification validation
4. `src/modules/portfolio/portfolioValidation.ts` - Portfolio validation
5. `src/modules/search/searchValidation.ts` - Search query validation

**Validation Schema Pattern:**

```typescript
import { z } from 'zod';

// Reusable sub-schemas
const skillProficiencySchema = z.enum(['beginner', 'intermediate', 'expert']);
const availabilitySchema = z.enum(['available', 'unavailable', 'away']);
const decimalSchema = z.number().positive().max(10000);

// Create Profile Schema
export const createProfileSchema = z.object({
  hourly_rate: decimalSchema.optional(),
  bio: z.string().max(1000).optional(),
  availability_status: availabilitySchema.optional(),
  response_time_hours: z.number().int().positive().max(168).optional(),
});

export type CreateProfileRequest = z.infer<typeof createProfileSchema>;

// Add Skill Schema
export const addSkillSchema = z.object({
  skill_id: z.number().int().positive(),
  proficiency_level: skillProficiencySchema,
  years_of_experience: z.number().int().nonnegative().optional(),
  is_primary: z.boolean().optional(),
});

export type AddSkillRequest = z.infer<typeof addSkillSchema>;

// Add Certification Schema
export const addCertificationSchema = z.object({
  title: z.string().min(3).max(255),
  issuer: z.string().min(2).max(255).optional(),
  issue_date: z.string().date().optional(),
  expiry_date: z.string().date().optional(),
  credential_url: z.string().url().optional(),
});

export type AddCertificationRequest = z.infer<typeof addCertificationSchema>;

// Search Query Schema
export const searchQuerySchema = z.object({
  skills: z.array(z.number().int()).optional(),
  location: z.string().optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxRate: z.number().positive().optional(),
  minRate: z.number().positive().optional(),
  availability: availabilitySchema.optional(),
  sortBy: z.enum(['rating', 'hourlyRate', 'recent']).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
```

**Acceptance Criteria:**
- ✅ All input types have schemas
- ✅ Schemas validate format and constraints
- ✅ Type inference from schemas
- ✅ Custom error messages for clarity
- ✅ Reusable sub-schemas

**Estimated Time:** 2 hours

---

### Step 4: Repository Layer (Day 2-3)

**Objective:** Implement data access layer for all Phase 2 entities

**Files to Create:**

1. `src/modules/profile/profileRepository.ts` - Profile CRUD & queries
2. `src/modules/skill/skillRepository.ts` - Skill management
3. `src/modules/certification/certificationRepository.ts` - Certification queries
4. `src/modules/portfolio/portfolioRepository.ts` - Portfolio CRUD
5. `src/modules/search/searchRepository.ts` - Complex search queries

**Repository Pattern (ProfileRepository Example):**

```typescript
import { Pool } from 'pg';
import { ProfessionalProfile, CreateProfileRequest } from '../types';

export class ProfileRepository {
  constructor(private db: Pool) {}

  /**
   * Create a new professional profile for a user
   * @throws DatabaseError if user already has profile or user doesn't exist
   */
  async create(userId: number, data: CreateProfileRequest): Promise<ProfessionalProfile> {
    const query = `
      INSERT INTO professional_profiles (
        user_id, 
        hourly_rate, 
        bio, 
        availability_status, 
        response_time_hours
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    
    const result = await this.db.query(query, [
      userId,
      data.hourly_rate ?? null,
      data.bio ?? null,
      data.availability_status ?? 'available',
      data.response_time_hours ?? null,
    ]);

    if (result.rowCount === 0) {
      throw new DatabaseError('Failed to create profile', 'PROFILE_CREATE_FAILED');
    }

    return result.rows[0];
  }

  /**
   * Get professional profile by user ID
   * @throws NotFoundError if profile doesn't exist
   */
  async findByUserId(userId: number): Promise<ProfessionalProfile> {
    const query = `
      SELECT * FROM professional_profiles 
      WHERE user_id = $1;
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Profile not found', 'PROFILE_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * Update professional profile
   * @throws NotFoundError if profile doesn't exist
   */
  async update(
    profileId: number, 
    data: Partial<CreateProfileRequest>
  ): Promise<ProfessionalProfile> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.hourly_rate !== undefined) {
      updateFields.push(`hourly_rate = $${paramCount++}`);
      values.push(data.hourly_rate);
    }
    
    if (data.bio !== undefined) {
      updateFields.push(`bio = $${paramCount++}`);
      values.push(data.bio);
    }

    if (data.availability_status !== undefined) {
      updateFields.push(`availability_status = $${paramCount++}`);
      values.push(data.availability_status);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(profileId);

    const query = `
      UPDATE professional_profiles 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    const result = await this.db.query(query, values);

    if (result.rowCount === 0) {
      throw new NotFoundError('Profile not found', 'PROFILE_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * Delete professional profile (soft or hard delete)
   */
  async delete(profileId: number, hardDelete: boolean = false): Promise<void> {
    if (hardDelete) {
      const query = 'DELETE FROM professional_profiles WHERE id = $1;';
      await this.db.query(query, [profileId]);
    } else {
      // Soft delete could be implemented if needed
      // UPDATE professional_profiles SET deleted_at = NOW() WHERE id = $1
    }
  }

  /**
   * Get profile with all related data (skills, certifications, portfolio)
   */
  async findByUserIdWithDetails(userId: number): Promise<ProfessionalProfileWithDetails> {
    // Complex query joining all related tables
    const query = `
      SELECT 
        pp.*,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', ps.id,
            'skillId', s.id,
            'skillName', s.name,
            'proficiencyLevel', ps.proficiency_level,
            'yearsOfExperience', ps.years_of_experience,
            'isPrimary', ps.is_primary
          )
        ) FILTER (WHERE ps.id IS NOT NULL), '[]'::json) as skills,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', c.id,
            'title', c.title,
            'issuer', c.issuer,
            'issueDate', c.issue_date,
            'expiryDate', c.expiry_date,
            'credentialUrl', c.credential_url
          )
        ) FILTER (WHERE c.id IS NOT NULL), '[]'::json) as certifications,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', pi.id,
            'title', pi.title,
            'description', pi.description,
            'url', pi.url,
            'imageUrl', pi.image_url,
            'startDate', pi.start_date,
            'endDate', pi.end_date
          )
        ) FILTER (WHERE pi.id IS NOT NULL), '[]'::json) as portfolio
      FROM professional_profiles pp
      LEFT JOIN professional_skills ps ON pp.id = ps.professional_id
      LEFT JOIN skills s ON ps.skill_id = s.id
      LEFT JOIN certifications c ON pp.id = c.professional_id
      LEFT JOIN portfolio_items pi ON pp.id = pi.professional_id
      WHERE pp.user_id = $1
      GROUP BY pp.id;
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Profile not found', 'PROFILE_NOT_FOUND');
    }

    return result.rows[0];
  }
}
```

**Acceptance Criteria:**
- ✅ All CRUD operations implemented
- ✅ Parameterized queries (no SQL injection)
- ✅ Proper error handling & custom errors
- ✅ Transaction support for complex operations
- ✅ Performance-optimized queries with JOINs
- ✅ Consistent naming: find*, create, update, delete

**Estimated Time:** 4 hours

---

### Step 5: Service Layer (Day 3-4)

**Objective:** Implement business logic layer

**Files to Create:**

1. `src/modules/profile/profileService.ts` - Profile management logic
2. `src/modules/skill/skillService.ts` - Skill operations
3. `src/modules/certification/certificationService.ts` - Certification operations
4. `src/modules/portfolio/portfolioService.ts` - Portfolio management
5. `src/modules/search/searchService.ts` - Search logic with filtering

**Service Pattern (ProfileService Example):**

```typescript
import { ProfessionalProfile, CreateProfileRequest } from '../types';
import { ProfileRepository } from './profileRepository';
import { AppError } from '../../utils/appError';

export class ProfileService {
  constructor(
    private profileRepository: ProfileRepository,
    private skillRepository: SkillRepository,
    private certificationRepository: CertificationRepository,
  ) {}

  /**
   * Create professional profile for authenticated user
   * - Validates user is professional type
   * - Ensures no duplicate profile
   * - Returns full profile with empty skills/certifications
   */
  async createProfile(
    userId: number,
    userType: string,
    data: CreateProfileRequest
  ): Promise<ProfessionalProfileDTO> {
    // Validation
    if (userType !== 'professional') {
      throw new AppError(
        'Only professional users can have a profile',
        'UNAUTHORIZED',
        403
      );
    }

    try {
      const profile = await this.profileRepository.create(userId, data);
      
      return this.toDTO({
        ...profile,
        skills: [],
        certifications: [],
        portfolio: [],
      });
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new AppError(
          'User already has a professional profile',
          'PROFILE_EXISTS',
          409
        );
      }
      throw error;
    }
  }

  /**
   * Get full profile with all details
   */
  async getProfile(userId: number): Promise<ProfessionalProfileDTO> {
    const profileWithDetails = await this.profileRepository
      .findByUserIdWithDetails(userId);
    
    return this.toDTO(profileWithDetails);
  }

  /**
   * Update profile settings
   */
  async updateProfile(
    userId: number,
    data: Partial<CreateProfileRequest>
  ): Promise<ProfessionalProfileDTO> {
    const profile = await this.profileRepository.findByUserId(userId);
    const updated = await this.profileRepository.update(profile.id, data);
    
    const fullProfile = await this.profileRepository
      .findByUserIdWithDetails(userId);
    
    return this.toDTO(fullProfile);
  }

  /**
   * Add skill to professional profile
   */
  async addSkill(
    userId: number,
    skillId: number,
    proficiencyLevel: string,
    yearsOfExperience?: number
  ): Promise<ProfessionalSkillDTO> {
    const profile = await this.profileRepository.findByUserId(userId);
    
    // Verify skill exists
    const skill = await this.skillRepository.findById(skillId);
    if (!skill) {
      throw new AppError('Skill not found', 'SKILL_NOT_FOUND', 404);
    }

    try {
      const professionalSkill = await this.skillRepository.addSkill(
        profile.id,
        skillId,
        proficiencyLevel,
        yearsOfExperience
      );

      return this.skillToDTO(professionalSkill);
    } catch (error) {
      if (error.code === '23505') {
        throw new AppError(
          'Skill already added to profile',
          'SKILL_EXISTS',
          409
        );
      }
      throw error;
    }
  }

  /**
   * DTO transformation (exclude sensitive fields)
   */
  private toDTO(profile: ProfessionalProfileWithDetails): ProfessionalProfileDTO {
    return {
      id: profile.id,
      user_id: profile.user_id,
      hourly_rate: profile.hourly_rate,
      bio: profile.bio,
      availability_status: profile.availability_status,
      avg_rating: profile.avg_rating,
      total_reviews: profile.total_reviews,
      skills: profile.skills || [],
      certifications: profile.certifications || [],
      portfolio: profile.portfolio || [],
      created_at: profile.created_at,
    };
  }
}
```

**Acceptance Criteria:**
- ✅ All business logic encapsulated
- ✅ Input validation before database operations
- ✅ Proper error handling with context
- ✅ DTO transformation for responses
- ✅ Reusable methods for multiple controllers
- ✅ Transaction support for multi-table operations

**Estimated Time:** 4 hours

---

### Step 6: Controller Layer (Day 4)

**Objective:** Create HTTP request handlers

**Files to Create:**

1. `src/modules/profile/profileController.ts` - HTTP handlers
2. `src/modules/skill/skillController.ts` - Skill endpoints
3. `src/modules/certification/certificationController.ts` - Certification endpoints
4. `src/modules/portfolio/portfolioController.ts` - Portfolio endpoints
5. `src/modules/search/searchController.ts` - Search handlers

**Controller Pattern (ProfileController Example):**

```typescript
import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ApiResponseHandler } from '../../utils/response';
import { ProfileService } from './profileService';

export class ProfileController {
  constructor(private profileService: ProfileService) {}

  /**
   * POST /api/profiles
   * Create new professional profile
   */
  createProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.id; // From JWT middleware
    const userType = req.user.userType;
    const validatedData = req.body; // Already validated by middleware

    const profile = await this.profileService.createProfile(
      userId,
      userType,
      validatedData
    );

    return ApiResponseHandler.created(
      res,
      { profile },
      'Professional profile created successfully'
    );
  });

  /**
   * GET /api/profiles/:userId
   * Get professional profile by user ID (public)
   */
  getProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    
    if (isNaN(userId)) {
      throw new AppError('Invalid user ID', 'INVALID_INPUT', 400);
    }

    const profile = await this.profileService.getProfile(userId);

    return ApiResponseHandler.ok(
      res,
      { profile },
      'Profile retrieved successfully'
    );
  });

  /**
   * GET /api/profiles/me
   * Get current user's profile (authenticated)
   */
  getMyProfile = catchAsync(async (req: Request, res: Response) => {
    const profile = await this.profileService.getProfile(req.user.id);

    return ApiResponseHandler.ok(
      res,
      { profile },
      'Your profile retrieved successfully'
    );
  });

  /**
   * PUT /api/profiles/me
   * Update current user's profile
   */
  updateProfile = catchAsync(async (req: Request, res: Response) => {
    const validatedData = req.body;

    const profile = await this.profileService.updateProfile(
      req.user.id,
      validatedData
    );

    return ApiResponseHandler.ok(
      res,
      { profile },
      'Profile updated successfully'
    );
  });

  /**
   * DELETE /api/profiles/me
   * Delete current user's profile
   */
  deleteProfile = catchAsync(async (req: Request, res: Response) => {
    await this.profileService.deleteProfile(req.user.id);

    return ApiResponseHandler.noContent(res);
  });

  /**
   * POST /api/profiles/me/skills
   * Add skill to profile
   */
  addSkill = catchAsync(async (req: Request, res: Response) => {
    const { skill_id, proficiency_level, years_of_experience } = req.body;

    const skill = await this.profileService.addSkill(
      req.user.id,
      skill_id,
      proficiency_level,
      years_of_experience
    );

    return ApiResponseHandler.created(
      res,
      { skill },
      'Skill added successfully'
    );
  });

  /**
   * DELETE /api/profiles/me/skills/:skillId
   * Remove skill from profile
   */
  removeSkill = catchAsync(async (req: Request, res: Response) => {
    const skillId = parseInt(req.params.skillId, 10);

    await this.profileService.removeSkill(req.user.id, skillId);

    return ApiResponseHandler.noContent(res);
  });
}
```

**Acceptance Criteria:**
- ✅ All CRUD endpoints implemented
- ✅ Request validation via middleware
- ✅ Consistent error handling with catchAsync
- ✅ Proper HTTP status codes (201, 200, 204, 400, 401, 404, 409)
- ✅ Standardized response format via ApiResponseHandler
- ✅ User context extracted from JWT

**Estimated Time:** 2 hours

---

### Step 7: Routes & Middleware (Day 5)

**Objective:** Wire controllers to express routes

**Files to Create:**

1. `src/modules/profile/profileRoutes.ts` - Route definitions
2. `src/modules/skill/skillRoutes.ts`
3. `src/modules/certification/certificationRoutes.ts`
4. `src/modules/portfolio/portfolioRoutes.ts`
5. `src/modules/search/searchRoutes.ts`
6. Update `src/app.ts` to register new routes

**Route Pattern (ProfileRoutes Example):**

```typescript
import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware';
import { validationMiddleware } from '../../middleware/validationMiddleware';
import { ProfileController } from './profileController';
import { createProfileSchema, updateProfileSchema } from './profileValidation';

export function createProfileRoutes(controller: ProfileController): Router {
  const router = Router();

  /**
   * Public routes
   */

  /**
   * GET /api/profiles/:userId
   * Get any professional's profile (public)
   */
  router.get('/:userId', controller.getProfile);

  /**
   * Authenticated routes (protected)
   */

  /**
   * POST /api/profiles
   * Create new professional profile
   */
  router.post(
    '/',
    authMiddleware,
    validationMiddleware(createProfileSchema),
    controller.createProfile
  );

  /**
   * GET /api/profiles/me
   * Get current user's profile
   */
  router.get('/me', authMiddleware, controller.getMyProfile);

  /**
   * PUT /api/profiles/me
   * Update current user's profile
   */
  router.put(
    '/me',
    authMiddleware,
    validationMiddleware(updateProfileSchema),
    controller.updateProfile
  );

  /**
   * DELETE /api/profiles/me
   * Delete current user's profile
   */
  router.delete('/me', authMiddleware, controller.deleteProfile);

  /**
   * POST /api/profiles/me/skills
   * Add skill to profile
   */
  router.post(
    '/me/skills',
    authMiddleware,
    validationMiddleware(addSkillSchema),
    controller.addSkill
  );

  /**
   * DELETE /api/profiles/me/skills/:skillId
   * Remove skill from profile
   */
  router.delete('/me/skills/:skillId', authMiddleware, controller.removeSkill);

  return router;
}
```

**Update app.ts:**

```typescript
// ... existing imports ...
import { createProfileRoutes } from './modules/profile/profileRoutes';
import { createSkillRoutes } from './modules/skill/skillRoutes';
import { createSearchRoutes } from './modules/search/searchRoutes';
import { Pool } from 'pg';

const db = new Pool({
  // connection config
});

// Initialize repositories
const profileRepository = new ProfileRepository(db);
const skillRepository = new SkillRepository(db);
// ... more repositories ...

// Initialize services
const profileService = new ProfileService(profileRepository, skillRepository);
const skillService = new SkillService(skillRepository);
// ... more services ...

// Initialize controllers
const profileController = new ProfileController(profileService);
const skillController = new SkillController(skillService);
// ... more controllers ...

// Register routes
app.use('/api/profiles', createProfileRoutes(profileController));
app.use('/api/skills', createSkillRoutes(skillController));
app.use('/api/search', createSearchRoutes(searchController));
// ... more routes ...

export default app;
```

**Acceptance Criteria:**
- ✅ All routes registered in app.ts
- ✅ Auth middleware on protected routes
- ✅ Validation middleware on POST/PUT
- ✅ Proper URL structure (/api/profiles, /api/skills, etc.)
- ✅ Route parameters extracted safely

**Estimated Time:** 2 hours

---

### Step 8: Comprehensive Testing (Day 5-6)

**Objective:** Write integration tests for all endpoints

**Test Files to Create:**

```bash
src/__tests__/
├── profile/
│   ├── profile.test.ts         # CRUD operations
│   ├── profileSearch.test.ts   # Profile queries
│   └── profile.fixtures.ts     # Test data
├── skill/
│   ├── skill.test.ts           # Add/remove skills
│   └── skill.fixtures.ts       # Test data
├── certification/
│   ├── certification.test.ts   # Cert operations
│   └── certification.fixtures.ts
├── portfolio/
│   ├── portfolio.test.ts       # Portfolio CRUD
│   └── portfolio.fixtures.ts
└── search/
    ├── search.test.ts          # Search with filters
    ├── searchFilters.test.ts    # Filter combinations
    └── search.fixtures.ts
```

**Test Pattern (Profile CRUD):**

```typescript
import request from 'supertest';
import app from '../../app';
import { Pool } from 'pg';

describe('Profile CRUD Operations', () => {
  let db: Pool;
  let userId: number;
  let authToken: string;

  beforeAll(async () => {
    db = new Pool({ /* config */ });
    
    // Create test user
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send(testUser);
    
    userId = signupRes.body.user.id;
    authToken = signupRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await db.end();
  });

  describe('POST /api/profiles', () => {
    it('should create professional profile with valid data - 201', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Cookie', authToken)
        .send({
          hourly_rate: 5000,
          bio: 'Experienced developer',
          availability_status: 'available',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.profile).toHaveProperty('id');
      expect(res.body.data.profile.hourly_rate).toBe(5000);
    });

    it('should return 409 if profile already exists', async () => {
      // Create first profile
      await request(app)
        .post('/api/profiles')
        .set('Cookie', authToken)
        .send({ hourly_rate: 5000 });

      // Try to create again
      const res = await request(app)
        .post('/api/profiles')
        .set('Cookie', authToken)
        .send({ hourly_rate: 6000 });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already has a profile');
    });

    it('should return 400 if hourly_rate is negative', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Cookie', authToken)
        .send({ hourly_rate: -100 });

      expect(res.status).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .send({ hourly_rate: 5000 });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/profiles/:userId', () => {
    it('should retrieve profile by user ID - 200', async () => {
      // First create a profile
      await request(app)
        .post('/api/profiles')
        .set('Cookie', authToken)
        .send({ hourly_rate: 5000 });

      const res = await request(app)
        .get(`/api/profiles/${userId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.profile.user_id).toBe(userId);
    });

    it('should return 404 if profile not found', async () => {
      const res = await request(app)
        .get('/api/profiles/999999');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/profiles/me', () => {
    it('should update profile - 200', async () => {
      const res = await request(app)
        .put('/api/profiles/me')
        .set('Cookie', authToken)
        .send({ bio: 'Updated bio' });

      expect(res.status).toBe(200);
      expect(res.body.data.profile.bio).toBe('Updated bio');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put('/api/profiles/me')
        .send({ bio: 'Updated bio' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/profiles/me', () => {
    it('should delete profile - 204', async () => {
      const res = await request(app)
        .delete('/api/profiles/me')
        .set('Cookie', authToken);

      expect(res.status).toBe(204);

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/profiles/${userId}`);

      expect(getRes.status).toBe(404);
    });
  });
});
```

**Acceptance Criteria:**
- ✅ 80%+ test coverage on critical paths
- ✅ All CRUD operations tested
- ✅ Error scenarios covered (400, 401, 404, 409)
- ✅ Auth protection verified
- ✅ Input validation tested
- ✅ All tests passing
- ✅ No flaky tests

**Estimated Time:** 4 hours

---

## Coding Standards & Style Guide

### Naming Conventions

**Files:**
```
# Services
profileService.ts
skillService.ts

# Controllers
profileController.ts

# Routes
profileRoutes.ts

# Types
profile.types.ts

# Validation
profileValidation.ts

# Tests
profile.test.ts
profile.fixtures.ts
```

**Variables & Functions:**
```typescript
// ✅ GOOD - descriptive, camelCase
const hourlyRate = 5000;
const isAvailable = true;
const calculateTotalEarnings = () => {};

// ❌ BAD - ambiguous
const rate = 5000;
const available = true;
const calc = () => {};
```

**Interfaces & Types:**
```typescript
// ✅ GOOD - PascalCase, descriptive
interface ProfessionalProfile {}
type CreateProfileRequest = {};

// ❌ BAD
interface professionalProfile {}
type createProfileRequest = {};
```

### Error Handling

**Consistent Error Pattern:**

```typescript
// ✅ GOOD
if (!profile) {
  throw new AppError(
    'Profile not found',
    'PROFILE_NOT_FOUND',
    404
  );
}

// ❌ BAD - unclear, different patterns
if (!profile) throw new Error('not found');
if (!profile) res.status(404).send('error');
```

### Type Safety

**All Parameters & Returns Typed:**

```typescript
// ✅ GOOD - fully typed
async function createProfile(
  userId: number,
  data: CreateProfileRequest
): Promise<ProfessionalProfileDTO> {
  // ...
}

// ❌ BAD - any types
async function createProfile(userId: any, data: any): any {
  // ...
}
```

### Code Organization

**Module Structure:**

```
profile/
├── profileController.ts     # HTTP handlers
├── profileService.ts        # Business logic
├── profileRepository.ts     # Data access
├── profileRoutes.ts         # Route definitions
├── profileValidation.ts     # Zod schemas
└── types/
    └── index.ts             # TypeScript interfaces
```

### Comments & Documentation

**When to Comment:**

```typescript
// ✅ GOOD - explains WHY, not WHAT

/**
 * Add skill to professional profile
 * @param userId - Authenticated user ID
 * @param skillId - Skill to add
 * @param proficiencyLevel - Expertise level
 * @throws NotFoundError if skill doesn't exist
 * @throws ConflictError if skill already added
 * @returns DTO of added skill
 */
async addSkill(
  userId: number,
  skillId: number,
  proficiencyLevel: string
): Promise<ProfessionalSkillDTO> {
  // ...
}

// ❌ BAD - states obvious
// Get the profile
const profile = await profileService.getProfile(userId);

// ❌ BAD - WHY are we checking this?
if (proficiency !== 'expert') {
  // Magic number 5000
  return 5000;
}
```

---

## Database Layer Pattern

### Connection Pooling

```typescript
// src/config/database.ts
import { Pool } from 'pg';

export const createDatabasePool = (): Pool => {
  return new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20, // Maximum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
};

const pool = createDatabasePool();

// Health check
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
```

### Transaction Support

```typescript
// For operations spanning multiple tables
async function updateProfileWithSkills(
  profileId: number,
  profileData: any,
  skills: any[]
): Promise<void> {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update profile
    await client.query(
      'UPDATE professional_profiles SET ...',
      [/* values */]
    );
    
    // Add skills
    for (const skill of skills) {
      await client.query(
        'INSERT INTO professional_skills ...',
        [/* values */]
      );
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## Service Layer Pattern

### Single Responsibility

```typescript
// ✅ GOOD - ProfileService handles only profile logic
class ProfileService {
  async createProfile(userId, data) {}
  async getProfile(userId) {}
  async updateProfile(userId, data) {}
}

// ✅ GOOD - SkillService handles only skill logic
class SkillService {
  async addSkill(profileId, skillId) {}
  async removeSkill(profileId, skillId) {}
  async getSkills(profileId) {}
}

// ❌ BAD - Mixed responsibilities
class ProfileService {
  async createProfile(userId, data) {}
  async createPayment(jobId, amount) {}    // Doesn't belong
  async sendEmail(userId) {}                // Doesn't belong
}
```

### Dependency Injection

```typescript
// ✅ GOOD - Dependencies injected
class ProfileService {
  constructor(
    private profileRepository: ProfileRepository,
    private skillRepository: SkillRepository,
  ) {}
  
  async createProfile(userId, data) {
    // Uses injected repositories
  }
}

// Used in controller
const profileService = new ProfileService(
  profileRepository,
  skillRepository
);

// ❌ BAD - Hard-coded dependencies
class ProfileService {
  private profileRepository = new ProfileRepository(); // Tight coupling
  
  async createProfile(userId, data) {}
}
```

---

## Error Handling & Validation

### Custom Error Classes

```typescript
// src/utils/appError.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}
```

### Validation Middleware

```typescript
// src/middleware/validationMiddleware.ts
import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validationMiddleware = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          error.errors[0].message,
          'VALIDATION_ERROR',
          400
        );
      }
      throw error;
    }
  };
};
```

---

## Testing Strategy

### Test Structure

```
__tests__/
├── setup.ts                 # Test configuration
├── fixtures/                # Test data
│   ├── users.ts
│   ├── profiles.ts
│   ├── skills.ts
│   └── certifications.ts
├── profile/
│   ├── profile.test.ts      # CRUD tests
│   ├── profileSearch.test.ts
│   └── profile.fixtures.ts
└── search/
    ├── search.test.ts       # Search tests
    └── search.fixtures.ts
```

### Test Coverage Goals

| Module | Coverage Target | Critical Paths |
|--------|-----------------|-----------------|
| Profile | 90% | Create, Read, Update, Delete |
| Skill | 85% | Add, Remove, Get |
| Search | 80% | Filter, Paginate, Sort |
| Certification | 85% | Create, Read, Update |
| Portfolio | 80% | Create, Read, Update |

### Unit vs Integration

- **Unit Tests:** Repository methods (mocked DB)
- **Integration Tests:** Full endpoint flows (real DB in test env)
- **E2E Tests:** Frontend → Backend → DB (Phase 3+)

---

## Integration Checklist

### Pre-Deployment Tasks

- [ ] All 35+ tests passing
- [ ] Database migrations executed
- [ ] No TypeScript errors
- [ ] ESLint checks pass
- [ ] Code review completed
- [ ] Performance benchmarks met (<300ms for search)
- [ ] Security review done
- [ ] Error handling comprehensive
- [ ] API documentation updated
- [ ] Thunder Client collection exported

### Deployment Steps

1. Backup production database
2. Run migrations
3. Deploy backend
4. Run smoke tests
5. Update frontend API endpoints (if changed)
6. Monitor error logs
7. Gradual rollout (canary) recommended

---

## Success Metrics

| Metric | Target | Success Criteria |
|--------|--------|-----------------|
| Test Coverage | 85% | All critical paths covered |
| Response Time (Search) | <300ms | p95 latency |
| Response Time (CRUD) | <150ms | p95 latency |
| Error Rate | <0.1% | Production readiness |
| Uptime | 99.9% | SLA compliance |
| Type Coverage | 100% | No `any` types |

---

## Next Steps (Phase 3 Preview)

After Phase 2 completion:

1. **Job Postings & Matching** - Employers post jobs, match with professionals
2. **Reviews & Ratings** - Enable feedback system
3. **Messaging & Notifications** - Real-time communication (WebSockets)
4. **Payment Integration** - Secure payment processing
5. **Admin Dashboard** - Platform analytics & moderation

---

**Document Version:** 1.0  
**Last Updated:** April 21, 2026  
**Status:** Ready for Implementation
