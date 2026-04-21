# Linkprosoft Backend - Scalable Architecture Blueprint

**Version:** 1.0  
**Target:** Enterprise-grade, multi-tenant ready  
**Tech Stack:** Node.js + Express + TypeScript + PostgreSQL + Redis (Phase 2)  

---

## Complete System Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite @ localhost:5173)                       │
│  ├─ User Interface                                              │
│  ├─ State Management (React Context/Redux)                      │
│  └─ API Client (Axios with interceptors)                        │
└────────────────┬────────────────────────────────────────────────┘
                 │ HTTP/REST + Cookies
┌────────────────▼────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Express Server (Port 5020)                                     │
│  ├─ Request Validation                                          │
│  ├─ Authentication/Authorization                                │
│  ├─ Rate Limiting (Phase 2)                                     │
│  ├─ Request Logging                                             │
│  ├─ CORS Handling                                               │
│  └─ Error Normalization                                         │
└────────────────┬────────────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┬──────────────┬──────────────┐
    ▼                         ▼              ▼              ▼
┌─────────────┐     ┌──────────────┐  ┌───────────┐  ┌──────────┐
│  Auth API   │     │  User API    │  │ Profile   │  │   Job    │
│   Routes    │     │   Routes     │  │  Routes   │  │  Routes  │
└──────┬──────┘     └──────┬───────┘  └────┬──────┘  └────┬─────┘
       │                   │               │             │
       └───────────────────┼───────────────┼─────────────┘
                           │
                 BUSINESS LOGIC LAYER
    ┌──────────────────────┼──────────────────────┐
    ▼                      ▼                      ▼
┌──────────────┐   ┌────────────────┐   ┌──────────────────┐
│ AuthService  │   │ UserService    │   │ ProfileService   │
├──────────────┤   ├────────────────┤   ├──────────────────┤
│ register()   │   │ getUserById()   │   │ createProfile()  │
│ login()      │   │ updateUser()    │   │ updateProfile()  │
│ logout()     │   │ getUserByEmail()│   │ addSkills()      │
│ verifyToken()│   │ deleteUser()    │   │ getCertifications│
└──────┬───────┘   └────────┬───────┘   └────────┬─────────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                   DATA ACCESS LAYER
    ┌───────────────────────┼────────────────────┐
    ▼                       ▼                    ▼
┌─────────────────┐  ┌────────────────┐  ┌──────────────┐
│ UserRepository  │  │ AuthRepository │  │ ProfileRepo  │
├─────────────────┤  ├────────────────┤  ├──────────────┤
│ create()        │  │ findByEmail()  │  │ create()     │
│ findById()      │  │ findWithPass() │  │ findByUserId()│
│ update()        │  │ update()       │  │ update()     │
│ delete()        │  │ softDelete()   │  │ addSkill()   │
└────────┬────────┘  └────────┬───────┘  └──────┬───────┘
         │                    │               │
         └────────────────────┼───────────────┘
                              │
                    DATABASE ABSTRACTION
                   (Connection Pooling)
                              │
         ┌────────────────────┴────────────────────┐
         ▼                                         ▼
    ┌─────────────┐                        ┌──────────────┐
    │ PostgreSQL  │                        │  Redis Cache │
    │   Database  │                        │  (Phase 2+)  │
    └─────────────┘                        └──────────────┘
```

---

## Modular Project Structure

### Complete File Organization

```
linkprosoft_backend/
│
├── src/
│   ├── config/
│   │   ├── database.ts           # Connection pooling
│   │   ├── environment.ts        # Env validation (Zod)
│   │   ├── constants.ts          # App-wide constants
│   │   └── index.ts              # Export config
│   │
│   ├── types/
│   │   ├── index.ts              # Central export
│   │   ├── user.types.ts         # User & DTO interfaces
│   │   ├── auth.types.ts         # Auth request/response
│   │   ├── api.types.ts          # Global API types
│   │   ├── error.types.ts        # Error definitions
│   │   └── database.types.ts     # DB models
│   │
│   ├── middleware/
│   │   ├── index.ts              # Export & register all
│   │   ├── auth.middleware.ts    # JWT verification
│   │   ├── validation.middleware.ts  # Input validation
│   │   ├── errorHandler.ts       # Global error handling
│   │   ├── cors.middleware.ts    # CORS settings
│   │   ├── requestLogger.ts      # Request logging
│   │   ├── notFound.middleware.ts # 404 handler
│   │   └── rateLimiter.ts        # Rate limiting (Phase 2)
│   │
│   ├── utils/
│   │   ├── index.ts              # Export all utils
│   │   ├── appError.ts           # Custom error classes
│   │   ├── catchAsync.ts         # Async wrapper
│   │   ├── logger.ts             # Winston logger
│   │   ├── response.ts           # Response handler
│   │   ├── jwt.ts                # JWT operations
│   │   ├── validators.ts         # Validation helpers
│   │   └── helpers.ts            # Utility functions
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.validation.ts    # Zod schemas
│   │   │   ├── auth.types.ts         # Auth interfaces
│   │   │   ├── auth.routes.ts        # Route definitions
│   │   │   ├── auth.controller.ts    # Request handlers
│   │   │   ├── auth.service.ts       # Business logic
│   │   │   ├── auth.repository.ts    # Data access
│   │   │   └── index.ts              # Module export
│   │   │
│   │   ├── users/
│   │   │   ├── user.validation.ts
│   │   │   ├── user.types.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.repository.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── profiles/ (Phase 2)
│   │   ├── skills/ (Phase 2)
│   │   ├── jobs/ (Phase 2)
│   │   ├── search/ (Phase 2)
│   │   └── payments/ (Phase 3+)
│   │
│   ├── repositories/
│   │   ├── base.repository.ts    # Generic CRUD
│   │   └── index.ts              # Export all
│   │
│   ├── services/
│   │   ├── base.service.ts       # Generic service base (Phase 2)
│   │   └── index.ts
│   │
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 001_init.sql
│   │   │   ├── 002_indexes.sql
│   │   │   └── 003_phase2.sql
│   │   ├── seeds/
│   │   │   └── seed.ts
│   │   └── schema.sql
│   │
│   ├── app.ts                    # Express app setup
│   └── server.ts                 # Entry point
│
├── tests/
│   ├── unit/
│   │   ├── auth.service.test.ts
│   │   ├── user.service.test.ts
│   │   └── utils.test.ts
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── user.test.ts
│   │   └── health.test.ts
│   ├── fixtures/
│   │   └── mockData.ts
│   └── setup.ts
│
├── scripts/
│   ├── setup-db.ts              # Database initialization
│   ├── seed-db.ts               # Seed sample data
│   └── migrate.ts               # Run migrations
│
├── logs/
│   ├── error.log
│   └── combined.log
│
├── .env
├── .env.example
├── .env.test
├── .gitignore
├── .eslintrc.json
├── tsconfig.json
├── jest.config.js
├── package.json
└── README.md
```

---

## Service Layer Pattern

### Base Service (Reusable Template)

```typescript
// services/base.service.ts
import BaseRepository from "../repositories/base.repository";
import { AppError } from "../utils/appError";

export abstract class BaseService<T, CreateDTO, UpdateDTO> {
  constructor(protected repository: BaseRepository<T>) {}

  async getById(id: number): Promise<T> {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new AppError(`Resource with ID ${id} not found`, 404);
    }
    return item;
  }

  async getAll(filters?: any, pagination?: any): Promise<T[]> {
    return this.repository.findAll(filters, pagination);
  }

  async create(data: CreateDTO): Promise<T> {
    return this.repository.create(data as any);
  }

  async update(id: number, data: UpdateDTO): Promise<T> {
    const item = await this.repository.update(id, data as any);
    if (!item) {
      throw new AppError(`Failed to update resource`, 500);
    }
    return item;
  }

  async delete(id: number): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new AppError(`Resource not found`, 404);
    }
  }
}

// Example: UserService extends BaseService
export class UserService extends BaseService<User, CreateUserDTO, UpdateUserDTO> {
  async getUserByEmail(email: string): Promise<User | null> {
    return this.repository.findByEmail(email);
  }

  async softDeleteUser(id: number): Promise<void> {
    await this.repository.softDelete(id);
  }

  // Custom methods beyond CRUD
  async activateUser(id: number): Promise<User> {
    return this.repository.update(id, { is_verified: true } as any);
  }
}
```

### Repository Pattern (Generic Base)

```typescript
// repositories/base.repository.ts
import { QueryResult } from "pg";
import pool from "../config/database";

export abstract class BaseRepository<T> {
  protected abstract tableName: string;
  protected abstract mapRow(row: any): T;

  async create(data: any): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  async findById(id: number): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findAll(filters?: any, pagination?: any): Promise<T[]> {
    let query = `SELECT * FROM ${this.tableName}`;

    // Add filters
    if (filters) {
      const filterClauses = Object.entries(filters)
        .map(([key, value]) => `${key} = '${value}'`)
        .join(" AND ");
      query += ` WHERE ${filterClauses}`;
    }

    // Add pagination
    if (pagination?.limit && pagination?.offset) {
      query += ` LIMIT ${pagination.limit} OFFSET ${pagination.offset}`;
    }

    const result = await pool.query(query);
    return result.rows.map((row) => this.mapRow(row));
  }

  async update(id: number, data: any): Promise<T | null> {
    const updates = Object.entries(data)
      .map(([key], i) => `${key} = $${i + 1}`)
      .join(", ");

    const query = `
      UPDATE ${this.tableName}
      SET ${updates}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${Object.keys(data).length + 1}
      RETURNING *
    `;

    const result = await pool.query(query, [
      ...Object.values(data),
      id,
    ]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id: number): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rowCount! > 0;
  }

  async softDelete(id: number): Promise<boolean> {
    const query = `
      UPDATE ${this.tableName}
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rowCount! > 0;
  }
}
```

---

## Request-Response Flow Example

### Complete Auth Flow

```
CLIENT (Frontend)
    │
    ├─ POST /api/auth/signup
    │  Headers: Content-Type: application/json
    │  Body: { email, password, firstName, lastName, userType }
    │
    ▼
SERVER (Express)
    ├─ Route Handler (authRoutes.ts)
    ├─ Validation Middleware → validate(signupSchema)
    │  └─ Parses & validates body against Zod schema
    │
    ├─ Controller (authController.ts → signup)
    │  └─ Calls authService.signup(validatedData)
    │
    ├─ Service (authService.ts)
    │  ├─ Check existing user → authRepository.findByEmail(email)
    │  ├─ Hash password → bcrypt.hash(password, 12)
    │  ├─ Create user → authRepository.createUser(data)
    │  ├─ Generate JWT → jwt.sign({ id, userType }, SECRET, { expiresIn })
    │  └─ Return { user: UserDTO, token: string }
    │
    ├─ Back to Controller
    │  ├─ Set HTTP-only cookie → res.cookie("token", ...)
    │  ├─ Transform response → ApiResponseHandler.created(res, { user })
    │  └─ Send to client
    │
    ▼
CLIENT (Frontend)
    ├─ Receive response with 201 status
    ├─ Browser stores cookie automatically
    └─ Redirect to dashboard

// On subsequent requests:
CLIENT
    ├─ GET /api/auth/verify
    │  (Cookie automatically sent by browser)
    │
    ▼
SERVER
    ├─ Route Handler
    ├─ Auth Middleware (protect) → Verifies JWT from cookie
    │  └─ Decodes token → verifies signature
    │  └─ Sets req.user = decoded token
    │
    ├─ Controller → Receives authenticated request
    └─ Returns user data
    │
    ▼
CLIENT
    └─ Receives verified user data
```

---

## Database Schema Design

### Phase 1: Core Tables

```sql
-- Users table (Phase 1)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('professional', 'employer')),
  comp_name VARCHAR(255), -- Required if employer
  phone VARCHAR(20),
  location VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Professional profiles (Phase 2)
CREATE TABLE professional_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hourly_rate DECIMAL(10, 2),
  bio TEXT,
  availability_status VARCHAR(20) DEFAULT 'available' CHECK (
    availability_status IN ('available', 'unavailable', 'away')
  ),
  response_time_hours INTEGER,
  total_hours_worked INTEGER DEFAULT 0,
  avg_rating DECIMAL(3, 2),
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Professional skills
CREATE TABLE professional_skills (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level VARCHAR(20) DEFAULT 'intermediate' CHECK (
    proficiency_level IN ('beginner', 'intermediate', 'expert')
  ),
  years_of_experience INTEGER,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(professional_id, skill_id)
);

-- Certifications
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

-- Portfolio items
CREATE TABLE portfolio_items (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  link_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job postings (Phase 3)
CREATE TABLE job_postings (
  id SERIAL PRIMARY KEY,
  employer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id INTEGER REFERENCES skills(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  budget DECIMAL(10, 2),
  status VARCHAR(20) DEFAULT 'posted' CHECK (
    status IN ('draft', 'posted', 'in_progress', 'completed', 'cancelled')
  ),
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Performance Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX idx_professional_profiles_rating ON professional_profiles(avg_rating DESC);
CREATE INDEX idx_professional_skills_professional_id ON professional_skills(professional_id);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_certifications_professional_id ON certifications(professional_id);
CREATE INDEX idx_portfolio_items_professional_id ON portfolio_items(professional_id);
CREATE INDEX idx_job_postings_employer_id ON job_postings(employer_id);
CREATE INDEX idx_job_postings_skill_id ON job_postings(skill_id);
CREATE INDEX idx_job_postings_status ON job_postings(status);
CREATE INDEX idx_job_postings_location ON job_postings(location);
```

---

## Development Workflow

### Local Setup

```bash
# 1. Install dependencies
cd linkprosoft_backend
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your local credentials

# 3. Create database
createdb linkprosoft_dev

# 4. Run migrations
npm run db:migrate

# 5. Seed sample data (optional)
npm run db:seed

# 6. Start dev server
npm run dev
```

### Package Scripts

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "db:migrate": "node -r ts-node/register scripts/migrate.ts",
    "db:seed": "node -r ts-node/register scripts/seed-db.ts",
    "db:setup": "node -r ts-node/register scripts/setup-db.ts"
  }
}
```

---

## Performance Considerations

### Query Optimization

```typescript
// ❌ Bad: N+1 queries
const professionals = await repo.getProfessionals();
for (const prof of professionals) {
  prof.skills = await repo.getSkillsForProfessional(prof.id); // N queries!
}

// ✅ Good: Single query with JOIN
const professionals = await repo.getProfessionalsWithSkills();
// Uses SQL JOIN to fetch everything in one query
```

### Caching Strategy (Phase 2+)

```typescript
// Redis cache layer
async function getProfessionalProfile(userId: number) {
  const cached = await redis.get(`profile:${userId}`);
  if (cached) return JSON.parse(cached);

  const profile = await database.query(...);
  await redis.setex(`profile:${userId}`, 3600, JSON.stringify(profile));
  return profile;
}

// Invalidate on updates
async function updateProfile(userId: number, data: any) {
  await database.update(...);
  await redis.del(`profile:${userId}`); // Invalidate cache
}
```

---

## Security Checklist

- [ ] All inputs validated with Zod
- [ ] Passwords hashed with bcrypt (rounds: 12)
- [ ] JWT tokens in HTTP-only cookies
- [ ] CORS properly configured
- [ ] SQL injection prevented (parameterized queries)
- [ ] Rate limiting implemented (Phase 2)
- [ ] Request logging with audit trail
- [ ] Sensitive data filtered from responses
- [ ] Environment validation on startup
- [ ] Error messages don't leak info
- [ ] HTTPS enforced in production

---

This architecture provides a solid foundation that scales from MVP to enterprise application!
