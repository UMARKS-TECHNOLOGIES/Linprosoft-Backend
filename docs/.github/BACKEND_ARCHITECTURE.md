# Linkprosoft Backend Architecture Plan

**Version:** 1.0  
**Date:** April 2026  
**Stack:** Node.js + Express + TypeScript + PostgreSQL + pg  

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [API Architecture](#api-architecture)
5. [Service Layer Design](#service-layer-design)
6. [Development Phases & Timeline](#development-phases--timeline)
7. [Core Features Breakdown](#core-features-breakdown)
8. [Security & Compliance](#security--compliance)
9. [Scalability & Performance](#scalability--performance)
10. [Tools & Dependencies](#tools--dependencies)

---

## System Overview

### Architecture Style

**Monolith with clear service layer separation** (Phase 1 & 2)

Rationale:
- Simpler deployment and debugging for MVP
- Single database reduces consistency issues
- Easy transition to microservices later if needed
- Aligned with 7-12 week MVP timeline

Future: Can split into microservices for payments, search, notifications once traffic scales.

### Core Business Domains

1. **Authentication & User Management**
   - Registration (professional/employer)
   - Login/logout
   - Profile management
   - Role-based access control (RBAC)

2. **Professional Profiles & Skills**
   - Skill listing and categorization
   - Portfolio management
   - Certifications
   - Availability and rates

3. **Job/Gig Posting**
   - Create, read, update, delete job postings
   - Filtering and search
   - Status tracking (posted, in-progress, completed)

4. **Skill Matching & Search**
   - Real-time location-based matching
   - Filter by category, keyword, rate, location
   - Relevance ranking

5. **Transactional Services**
   - Job assignment/booking
   - Payment processing and tracking
   - Commission calculation (15% seller, 1% buyer)
   - Dispute resolution

6. **Reviews & Ratings**
   - Review submission
   - Rating aggregation
   - Reviewer authentication

7. **Messaging** (Phase 2+)
   - Inbox/conversation management
   - Real-time notifications

---

## Technology Stack

### Core Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Runtime** | Node.js (v18+) | JavaScript ecosystem, fast async I/O |
| **Framework** | Express.js | Lightweight, well-documented, flexible routing |
| **Language** | TypeScript | Type safety, better IDE support, maintainability |
| **Database** | PostgreSQL | ACID compliance, relational data, familiar to you |
| **DB Driver** | `pg` | Lightweight, direct control, minimal overhead |
| **Authentication** | JWT (cookies) | Stateless, frontend already expects this |

### Supporting Libraries

**Production Dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.0.0 | HTTP server framework |
| `pg` | ^8.11.0 | PostgreSQL client (no ORM) |
| `dotenv` | ^16.5.0 | Environment variable management |
| `bcryptjs` | ^3.0.2 | Password hashing (cryptography) |
| `jsonwebtoken` | ^9.0.2 | JWT signing and verification |
| `cookie-parser` | ^1.4.7 | Parse cookies from requests |
| `cors` | ^2.8.5 | Enable CORS headers |
| `zod` | ^3.22.0 | TypeScript-first schema validation |
| `helmet` | ^7.1.0 | Security headers (CSP, X-Frame-Options, etc.) |
| `morgan` | ^1.10.0 | HTTP request logging middleware |

**Phase 2+ Additions:**
```json
{
  "nodemailer": "^6.9.0",        // Email sending
  "redis": "^4.6.0",             // Caching layer
  "bull": "^4.10.0",             // Job queuing
  "joi": "^17.11.0"              // Alternative validator (optional)
}
```

**Phase 4+ Additions:**
```json
{
  "axios": "^1.6.0",             // HTTP client for Paystack API
  "joi": "^17.11.0"              // Stricter validation for payments
}
```

**Development Dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.0.0 | TypeScript compiler |
| `@types/node` | ^20.0.0 | Node.js type definitions |
| `@types/express` | ^5.0.0 | Express type definitions |
| `@types/jest` | ^29.0.0 | Jest type definitions |
| `ts-node` | ^10.9.0 | Run TypeScript files directly |
| `ts-node-dev` | ^2.0.0 | Auto-restart on file changes + transpile-only |
| `nodemon` | ^3.0.0 | File watcher for auto-restart |
| `eslint` | ^8.0.0 | Linter for code quality |
| `@typescript-eslint/parser` | ^6.0.0 | TypeScript ESLint parser |
| `@typescript-eslint/eslint-plugin` | ^6.0.0 | TypeScript ESLint rules |
| `jest` | ^29.0.0 | Testing framework |
| `@types/jest` | ^29.0.0 | Jest type definitions |
| `supertest` | ^6.3.0 | HTTP assertion library for tests |
| `node-pg-migrate` | ^6.2.0 | Database migration tool |

**Full package.json:**
```json
{
  "name": "linkprosoft-backend",
  "version": "1.0.0",
  "description": "Linkprosoft backend API",
  "type": "module",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "db:migrate": "node-pg-migrate up",
    "db:migrate:down": "node-pg-migrate down",
    "db:migrate:create": "node-pg-migrate create",
    "db:seed": "ts-node scripts/seed.ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^5.0.0",
    "pg": "^8.11.0",
    "dotenv": "^16.5.0",
    "bcryptjs": "^3.0.2",
    "jsonwebtoken": "^9.0.2",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "zod": "^3.22.0",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.0.0",
    "ts-node": "^10.9.0",
    "ts-node-dev": "^2.0.0",
    "nodemon": "^3.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "jest": "^29.0.0",
    "supertest": "^6.3.0",
    "node-pg-migrate": "^6.2.0"
  }
}
```

### Additional Tools (Recommended)

- **Database Migrations:** `node-pg-migrate` or custom SQL scripts
- **Environment Config:** `.env` files + `dotenv`
- **Validation:** `Zod` or `Joi` for request schemas
- **Error Handling:** Custom error classes + global middleware
- **Logging:** `winston` or `pino` (Phase 2+)
- **Testing:** `Jest` + `Supertest`
- **API Documentation:** Swagger/OpenAPI (Phase 2+)
- **Payment Integration:** Paystack SDK or direct API integration
- **Search Optimization:** PostgreSQL full-text search (MVP), Elasticsearch (Phase 3)
- **Caching:** Redis (Phase 2+ for high-traffic features)

---

## Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  user_type ENUM('professional', 'employer') NOT NULL,
  phone_number VARCHAR(20),
  location VARCHAR(255),
  profile_image_url VARCHAR(500),
  bio TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

#### professional_profiles
```sql
CREATE TABLE professional_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  hourly_rate DECIMAL(10, 2),
  availability_status ENUM('available', 'unavailable', 'away') DEFAULT 'available',
  total_ratings INT DEFAULT 0,
  avg_rating DECIMAL(3, 2) DEFAULT 0,
  total_jobs_completed INT DEFAULT 0,
  response_time_hours INT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### skills
```sql
CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE professional_skills (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  proficiency_level ENUM('beginner', 'intermediate', 'expert') DEFAULT 'intermediate',
  years_of_experience INT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(professional_id, skill_id)
);
```

#### certifications
```sql
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
```

#### job_postings
```sql
CREATE TABLE job_postings (
  id SERIAL PRIMARY KEY,
  employer_id INTEGER NOT NULL REFERENCES users(id),
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  budget DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  duration_days INT,
  location VARCHAR(255),
  status ENUM('draft', 'posted', 'in_progress', 'completed', 'cancelled') DEFAULT 'posted',
  visibility ENUM('public', 'private') DEFAULT 'public',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);
```

#### job_assignments
```sql
CREATE TABLE job_assignments (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES job_postings(id),
  professional_id INTEGER NOT NULL REFERENCES professional_profiles(id),
  employer_id INTEGER NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status ENUM('invited', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled') DEFAULT 'invited',
  accepted_budget DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### payments
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  job_assignment_id INTEGER NOT NULL REFERENCES job_assignments(id),
  payer_id INTEGER NOT NULL REFERENCES users(id),
  payee_id INTEGER NOT NULL REFERENCES users(id),
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  seller_commission_percent DECIMAL(5, 2) DEFAULT 15,
  buyer_commission_percent DECIMAL(5, 2) DEFAULT 1,
  seller_commission_amount DECIMAL(12, 2),
  buyer_commission_amount DECIMAL(12, 2),
  platform_fee DECIMAL(12, 2),
  net_amount DECIMAL(12, 2),
  payment_method VARCHAR(50),
  status ENUM('pending', 'processing', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  transaction_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### reviews
```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  job_assignment_id INTEGER NOT NULL REFERENCES job_assignments(id),
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  reviewed_professional_id INTEGER NOT NULL REFERENCES professional_profiles(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_assignment_id, reviewer_id)
);
```

#### messages
```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  recipient_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_recipient ON messages(recipient_id, is_read);
```

#### portfolio_items
```sql
CREATE TABLE portfolio_items (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  link_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Key Indexes for Performance

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX idx_professional_skills_professional_id ON professional_skills(professional_id);
CREATE INDEX idx_job_postings_employer_id ON job_postings(employer_id);
CREATE INDEX idx_job_postings_skill_id ON job_postings(skill_id);
CREATE INDEX idx_job_postings_status ON job_postings(status);
CREATE INDEX idx_job_postings_location ON job_postings(location);
CREATE INDEX idx_job_assignments_job_id ON job_assignments(job_id);
CREATE INDEX idx_job_assignments_professional_id ON job_assignments(professional_id);
CREATE INDEX idx_payments_job_assignment_id ON payments(job_assignment_id);
CREATE INDEX idx_reviews_reviewed_professional_id ON reviews(reviewed_professional_id);
```

---

## API Architecture

### Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # PostgreSQL connection pool
│   │   └── environment.ts       # env validation
│   ├── middleware/
│   │   ├── auth.middleware.ts   # JWT verification
│   │   ├── errorHandler.ts      # Global error handling
│   │   ├── cors.middleware.ts   # CORS configuration
│   │   └── validation.ts        # Request validation
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── profiles.routes.ts
│   │   ├── skills.routes.ts
│   │   ├── jobs.routes.ts
│   │   ├── assignments.routes.ts
│   │   ├── payments.routes.ts
│   │   ├── reviews.routes.ts
│   │   ├── messages.routes.ts
│   │   └── search.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── profiles.controller.ts
│   │   ├── skills.controller.ts
│   │   ├── jobs.controller.ts
│   │   ├── assignments.controller.ts
│   │   ├── payments.controller.ts
│   │   ├── reviews.controller.ts
│   │   ├── messages.controller.ts
│   │   └── search.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── profile.service.ts
│   │   ├── skill.service.ts
│   │   ├── job.service.ts
│   │   ├── assignment.service.ts
│   │   ├── payment.service.ts
│   │   ├── review.service.ts
│   │   ├── message.service.ts
│   │   ├── search.service.ts
│   │   └── notification.service.ts
│   ├── repositories/
│   │   ├── base.repository.ts   # Generic CRUD operations
│   │   ├── user.repository.ts
│   │   ├── job.repository.ts
│   │   ├── payment.repository.ts
│   │   └── ...
│   ├── types/
│   │   ├── user.types.ts
│   │   ├── job.types.ts
│   │   ├── payment.types.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── helpers.ts
│   ├── migrations/
│   │   ├── 001_init_schema.sql
│   │   ├── 002_add_indexes.sql
│   │   └── ...
│   └── server.ts               # Entry point
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── .env.example
├── .gitignore
├── tsconfig.json
├── package.json
└── README.md
```

### Layered Architecture

```
HTTP Request
    ↓
Routes (Express Router)
    ↓
Middleware (Auth, Validation, Error)
    ↓
Controllers (Request handling, response formatting)
    ↓
Services (Business logic)
    ↓
Repositories (Data access)
    ↓
Database (PostgreSQL)
```

---

## Service Layer Design

### Core Services (Phase 1)

#### 1. AuthService
- `register(email, password, userType, compName)`
- `login(email, password)`
- `logout(userId)`
- `verifyToken(token)`
- `refreshToken(token)`

#### 2. UserService
- `getUserById(id)`
- `updateUserProfile(id, data)`
- `getUserByEmail(email)`
- `getUsers(filters, pagination)`

#### 3. ProfileService
- `createProfessionalProfile(userId, data)`
- `updateProfessionalProfile(userId, data)`
- `getProfessionalProfile(userId)`
- `getProfessionalRating(userId)`

#### 4. SkillService
- `createSkill(name, category, description)`
- `getSkills(filters)`
- `addSkillToProfessional(professionalId, skillId, proficiency)`
- `removeSkillFromProfessional(professionalId, skillId)`
- `getProfessionalSkills(professionalId)`

#### 5. JobService
- `createJobPosting(employerId, jobData)`
- `getJobPostings(filters, pagination)` → enables search
- `getJobById(jobId)`
- `updateJobPosting(jobId, data)`
- `deleteJobPosting(jobId)`
- `getJobsByEmployer(employerId)`
- `getJobsBySkill(skillId)`

#### 6. SearchService
- `searchSkills(query, filters)` → full-text search on skills
- `searchProfessionals(location, skillId, filters)` → location-based matching
- `searchJobs(query, filters)`
- `rankResults(results)` → relevance scoring

#### 7. AssignmentService
- `createAssignment(jobId, professionalId, budget)`
- `acceptAssignment(assignmentId)`
- `rejectAssignment(assignmentId)`
- `completeAssignment(assignmentId)`
- `cancelAssignment(assignmentId)`
- `getAssignmentsByProfessional(professionalId)`
- `getAssignmentsByEmployer(employerId)`

#### 8. PaymentService
- `initiatePayment(assignmentId, amount)` → returns Paystack link
- `verifyPayment(reference)`
- `recordPayment(paymentData)`
- `getPaymentHistory(userId)`
- `calculateCommissions(amount)` → 15% seller, 1% buyer

#### 9. ReviewService
- `createReview(assignmentId, reviewerId, rating, comment)`
- `getReviewsForProfessional(professionalId, pagination)`
- `updateProfessionalRating(professionalId)`
- `getReviewsByReviewer(reviewerId)`

#### 10. MessageService (Phase 2+)
- `sendMessage(senderId, recipientId, content)`
- `getConversation(user1Id, user2Id)`
- `getInbox(userId)`
- `markAsRead(messageId)`

### Repositories (Data Access Layer)

Generic base repository pattern:
```typescript
abstract class BaseRepository<T> {
  async findById(id: number): Promise<T | null>;
  async findAll(filters?: object, limit?: number, offset?: number): Promise<T[]>;
  async create(data: Partial<T>): Promise<T>;
  async update(id: number, data: Partial<T>): Promise<T>;
  async delete(id: number): Promise<boolean>;
  async count(filters?: object): Promise<number>;
}
```

Specific repositories inherit from BaseRepository and add domain-specific queries.

---

## Development Phases & Timeline

### Phase 1: MVP Authentication & Foundation (Weeks 1-3)

**Goal:** Establish backend foundation with working auth and core user management.

**Deliverables:**
- TypeScript project structure
- PostgreSQL connection + basic schema
- Authentication endpoints (register, login, logout, check-auth)
- User profile CRUD
- Role-based access control (RBAC)
- Docker setup for local development
- Error handling + logging middleware

**Endpoints:**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/check-auth
GET    /api/users/:id
PUT    /api/users/:id
```

**Dependencies to Install:**
- express, typescript, ts-node, dotenv
- pg, bcryptjs, jsonwebtoken
- helmet, cors, morgan

---

### Phase 2: Professional Profiles & Skill Search (Weeks 4-6)

**Goal:** Enable professionals to build portfolios and employers to find them.

**Deliverables:**
- Professional profile endpoints
- Skill management (CRUD)
- Portfolio/certifications endpoints
- Full-text search on skills and professionals
- Location-based filtering
- Pagination and sorting

**Endpoints:**
```
POST   /api/profiles
GET    /api/profiles/:id
PUT    /api/profiles/:id
POST   /api/skills
GET    /api/skills
POST   /api/profiles/:id/skills
DELETE /api/profiles/:id/skills/:skillId
GET    /api/search/skills?query=...&location=...
GET    /api/search/professionals?skill=...&location=...
POST   /api/portfolios
GET    /api/portfolios/:professionalId
```

**New Dependencies:**
- `zod` or `joi` for schema validation

---

### Phase 3: Job Posting & Assignment (Weeks 7-9)

**Goal:** Employers post jobs; professionals apply/get assigned.

**Deliverables:**
- Job posting CRUD
- Job assignment workflow (invite → accept → in-progress → complete)
- Dispute flagging
- Job status tracking
- Email/notification stubs

**Endpoints:**
```
POST   /api/jobs
GET    /api/jobs?filters=...
GET    /api/jobs/:id
PUT    /api/jobs/:id
DELETE /api/jobs/:id
POST   /api/assignments
GET    /api/assignments/:id
PUT    /api/assignments/:id/accept
PUT    /api/assignments/:id/reject
PUT    /api/assignments/:id/complete
```

---

### Phase 4: Payments & Reviews (Weeks 10-12)

**Goal:** Complete transactional loop with secure payments and feedback.

**Deliverables:**
- Payment gateway integration (Paystack)
- Commission tracking and payout calculations
- Review/rating system
- Payment history and analytics
- Webhook handling for payment callbacks

**Endpoints:**
```
POST   /api/payments/initiate
GET    /api/payments/:reference/verify
GET    /api/payments/history/:userId
POST   /api/reviews
GET    /api/reviews/:professionalId
GET    /api/reviews/:id
```

**New Dependencies:**
- `paystack` SDK or HTTP client for API

---

### Phase 5 (Post-MVP): Enhancements (Weeks 13+)

- Messaging system with WebSockets
- Real-time notifications
- Advanced search with Elasticsearch
- Rate limiting and caching (Redis)
- Admin dashboard
- Analytics & reporting
- Mobile app API adjustments

---

## Core Features Breakdown

### Feature 1: Skill Search & Professional Discovery

**Priority:** P0 (MVP)

**Requirements:**
- Search by skill name, category
- Filter by location, hourly rate range, availability
- Sort by rating, response time, jobs completed
- Pagination

**Implementation:**
- PostgreSQL full-text search on `skills.name` and `skills.category`
- Geospatial queries for location (could use PostGIS extension later)
- SQL query with indexes for performance

**API Endpoint:**
```
GET /api/search/professionals?
    skill=web+development&
    location=lagos&
    minRate=10000&
    maxRate=100000&
    page=1&
    limit=20
```

---

### Feature 2: Job Posting & Matching

**Priority:** P0 (MVP)

**Requirements:**
- Employer creates job posting with skill requirement
- System matches professionals with that skill
- Professionals can see matching jobs
- Invitation or application workflow

**Implementation:**
- Job posting stored in `job_postings` table
- Skill matching via JOIN with `professional_skills`
- Status workflow: draft → posted → assigned → completed

**API Endpoints:**
```
POST   /api/jobs
GET    /api/jobs/:jobId/matches
POST   /api/assignments (employer invites professional)
PUT    /api/assignments/:id/accept
```

---

### Feature 3: Payment Processing

**Priority:** P1 (MVP+1)

**Requirements:**
- Secure payment via Paystack
- 15% commission on seller side, 1% on buyer side
- Automatic payout tracking
- Transaction history

**Implementation:**
- Frontend redirects to Paystack checkout
- Backend receives webhook callback on payment success
- Commission calculated and stored in `payments` table
- Status tracked: pending → processing → completed

**API Endpoints:**
```
POST   /api/payments/initiate
POST   /api/payments/webhook (receives Paystack callback)
GET    /api/payments/history/:userId
```

---

### Feature 4: Reviews & Ratings

**Priority:** P1 (MVP+1)

**Requirements:**
- Professional rated after job completion (1-5 stars)
- Comments allowed
- Anonymous option
- Rating aggregation

**Implementation:**
- Review stored in `reviews` table
- Trigger to update `professional_profiles.avg_rating` on new review
- Endpoint to get all reviews for a professional with pagination

**API Endpoints:**
```
POST   /api/reviews
GET    /api/reviews/:professionalId
GET    /api/reviews/:reviewId
```

---

### Feature 5: Real-Time Location-Based Matching

**Priority:** P2 (Phase 2)

**Requirements:**
- Match professionals near employer location
- Distance calculation (e.g., within 5km radius)
- Update professional availability in real-time

**Implementation:**
- Store `location` as VARCHAR or use PostGIS for geometry
- Distance calculation using haversine formula or PostGIS
- Cache location-based queries with Redis (Phase 3)

**Future Enhancement:** Use PostGIS for precise geo-queries.

---

### Feature 6: Messaging & Notifications

**Priority:** P2 (Phase 2+)

**Requirements:**
- Send messages between professionals and employers
- Notifications for new messages, job invites, reviews
- Real-time updates

**Implementation:**
- Messages stored in `messages` table
- WebSocket support (Socket.io or native WebSocket) in Phase 2
- Email notifications as fallback

---

## Security & Compliance

### Authentication & Authorization

1. **JWT in HTTP-only Cookies**
   - Frontend already expects `token` cookie
   - Set `httpOnly: true`, `secure: true`, `sameSite: 'Lax'`
   - 24-hour expiration (user must login again)

2. **Role-Based Access Control (RBAC)**
   - `professional` role: can view jobs, create profile, submit reviews
   - `employer` role: can post jobs, view candidates, make payments
   - Enforce in middleware: `authMiddleware → roleMiddleware`

3. **Endpoint Protection**
   - All profile/job/payment endpoints require auth
   - Validate ownership: professional can only update own profile

### Data Protection

1. **Password Hashing**
   - Use `bcryptjs` with salt rounds 10+
   - Never store plaintext passwords

2. **Sensitive Data**
   - Bank account info stored encrypted (if needed)
   - Payment data via Paystack (PCI compliance delegated)
   - Personal data: use HTTPS only

3. **SQL Injection Prevention**
   - Use parameterized queries with `pg` (already safe)
   - Validate and sanitize input with Zod/Joi

### API Security

1. **CORS**
   - Allow `http://localhost:5173` (frontend) and production URL only
   - Restrict methods: GET, POST, PUT, DELETE

2. **Rate Limiting**
   - Limit login attempts: 5 per minute per IP
   - Limit API requests: 100 per minute per user
   - Use middleware: `express-rate-limit`

3. **Helmet**
   - Set security headers: CSP, X-Frame-Options, etc.

### Compliance

- **Data Retention:** Soft-delete with `deleted_at` timestamp
- **Audit Logging:** Log all payment and sensitive actions
- **Dispute Handling:** Flag suspicious transactions for review

---

## Scalability & Performance

### Phase 1-2 (MVP)

- Single PostgreSQL instance
- Connection pooling with `pg` library
- Indexes on frequently queried columns
- Simple in-memory caching (Node.js process)

### Phase 3+ (Growth)

1. **Database Scaling**
   - Read replicas for reporting queries
   - Sharding if user base > 1M
   - Archive old payments/messages

2. **Caching**
   - Redis for:
     - Skill search results
     - Professional profile cache
     - Session storage
   - Cache expiration: 5-30 minutes

3. **Search Optimization**
   - PostgreSQL full-text search (Phase 1)
   - Elasticsearch for advanced faceted search (Phase 3)

4. **API Optimization**
   - Pagination mandatory (max 50 items per page)
   - Lazy loading for portfolios, certifications
   - Query batching for related data

5. **Async Processing**
   - Bull or RabbitMQ for:
     - Payment processing
     - Email notifications
     - Review aggregation
   - Non-blocking user experience

6. **CDN**
   - CloudFlare for API endpoints
   - S3/GCS for profile images, portfolio items

### Expected Scale Targets (Year 1)

| Metric | Target |
|--------|--------|
| Concurrent users | 5,000 |
| Requests/sec (peak) | 500 |
| Database size | 50-100 GB |
| Response time (p95) | <500ms |

---

## Tools & Dependencies

### Development Tools

```bash
# Backend setup
npm init
npm install --save express pg dotenv bcryptjs jsonwebtoken cookie-parser cors helmet morgan zod
npm install --save-dev typescript ts-node ts-node-dev nodemon @types/node @types/express eslint jest supertest

# Database migrations
npm install --save-dev node-pg-migrate
```

### Local Development Environment

| Tool | Purpose | Notes |
|------|---------|-------|
| **VS Code** | Code editor | TypeScript support via extensions |
| **Thunder Client** | API testing | Lightweight, VS Code extension |
| **pgAdmin 4** | PostgreSQL admin UI | Local database management |
| **DBeaver** | SQL IDE | Advanced queries and schema inspection |
| **Postman** | Alternative API testing | If preferred over Thunder Client |
| **Git + GitHub** | Version control | For collaboration and CI/CD |

### Environment Configuration

```bash
# .env.example (commit to repo, never commit actual .env)
NODE_ENV=development
PORT=5020

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linkprosoft_dev
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_POOL_SIZE=20
DB_IDLE_TIMEOUT=30000

# JWT
JWT_SECRET=your_very_secure_random_string_here_min_32_chars
JWT_EXPIRY=24h

# Frontend
FRONTEND_URL=http://localhost:5173

# Paystack (Phase 4)
PAYSTACK_SECRET_KEY=your_paystack_test_key
PAYSTACK_PUBLIC_KEY=your_paystack_test_public_key

# Email (Phase 2+)
# SENDGRID_API_KEY=your_sendgrid_key
# SENDGRID_FROM_EMAIL=noreply@linkprosoft.com

# Logging
LOG_LEVEL=debug
```

### npm Scripts

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "db:migrate": "node-pg-migrate up",
    "db:migrate:down": "node-pg-migrate down",
    "db:migrate:create": "node-pg-migrate create",
    "db:seed": "ts-node scripts/seed.ts",
    "type-check": "tsc --noEmit"
  }
}
```

### Database Tools

- **pgAdmin** (local admin UI)
- **DBeaver** (SQL IDE)
- **PostGIS** (future: geospatial queries)

### API Testing with Thunder Client

**Setup:**
1. Install Thunder Client extension in VS Code
2. Create a collection: `Linkprosoft API`
3. Set environment variables in Thunder Client:

```json
{
  "dev": {
    "base_url": "http://localhost:5020/api",
    "token": "",
    "user_id": ""
  },
  "staging": {
    "base_url": "https://api-staging.linkprosoft.com/api",
    "token": "",
    "user_id": ""
  }
}
```

**Request Template Example:**

```
GET {{base_url}}/auth/check-auth
Headers:
  Content-Type: application/json
  Authorization: Bearer {{token}}
Cookies:
  token={{token}}
```

**Workflow:**
1. POST to `/auth/login` → capture `token` from response
2. Set `{{token}}` in environment
3. Use token in subsequent protected requests
4. Export collection + environment for team collaboration

### Performance Benchmarks (Thunder Client)

Run load tests locally to verify response times:

```
# Phase 1 targets:
- Auth endpoints (login/register): <200ms
- Single resource fetch (user profile): <100ms
- Search with filters: <500ms
- Payment processing: <2000ms
```

### Deployment & Monitoring (Phase 3+)

- **Hosting:** Vercel, Railway, or DigitalOcean App Platform
- **Database Hosting:** AWS RDS, Neon, or Supabase
- **Monitoring:** Sentry (error tracking), DataDog (performance)
- **CI/CD:** GitHub Actions

### TypeScript Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### ESLint Configuration

**.eslintrc.json:**
```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "plugins": ["@typescript-eslint"],
  "env": {
    "node": true,
    "es2021": true
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### PostgreSQL Connection Pooling

**config/database.ts** pattern:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'linkprosoft_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_SIZE || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: 5000,
});

export default pool;
```

**Best Practices:**
- Connection pool size: 20 for development, 50+ for production
- Reuse connections across requests
- Close pool gracefully on server shutdown
- Monitor pool stats: active/idle connections

### External APIs & Services

- **Payments:** Paystack (processing, webhooks)
- **Email:** SendGrid or Mailgun (Phase 2+)
- **SMS:** Twilio (Phase 2+, optional)
- **Storage:** AWS S3 or Cloudinary (portfolio images)

---

## Next Steps

1. **Initialize TypeScript project** with folder structure
2. **Set up PostgreSQL locally** and create schema
3. **Implement Phase 1 endpoints** (auth + user management)
4. **Write integration tests** to verify endpoints
5. **Deploy to staging** and load test
6. **Proceed to Phase 2** based on feedback

---

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Owner:** Backend Team  

