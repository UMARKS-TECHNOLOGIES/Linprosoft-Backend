# Linkprosoft Backend - Phase 1: MVP Foundation

**Version:** 1.0  
**Timeline:** Weeks 1-3 (3 weeks)  
**Focus:** Authentication, User Management, TypeScript Foundation  

---

## Table of Contents

1. [Overview & Goals](#overview--goals)
2. [Architecture & Design Patterns](#architecture--design-patterns)
3. [Project Structure](#project-structure)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Coding Standards & Style Guide](#coding-standards--style-guide)
6. [Service Layer Pattern (Monolith)](#service-layer-pattern-monolith)
7. [Error Handling & Logging](#error-handling--logging)
8. [Database Setup & Migrations](#database-setup--migrations)
9. [Testing Strategy](#testing-strategy)
10. [Migration Path to Microservices](#migration-path-to-microservices)

---

## Overview & Goals

### Phase 1 Objectives

✅ **Set up TypeScript + Express backend**
✅ **Implement PostgreSQL connection pooling**
✅ **Build authentication system** (register, login, logout, verify)
✅ **Create user profile management**
✅ **Establish service layer pattern** (ready for scaling)
✅ **Document coding standards** (for team consistency)
✅ **Write integration tests** (auth + user endpoints)
✅ **Prepare for Phase 2** (profiles, skills, search)

### Success Criteria

- All auth endpoints return correct HTTP status codes
- Token-based auth works with frontend (HTTP-only cookies)
- User registration validates input and prevents duplicates
- Response times: <200ms for auth, <100ms for user fetch
- No SQL injection vulnerabilities
- Full TypeScript type safety (no `any` types)
- 80%+ test coverage on critical paths

---

## Architecture & Design Patterns

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│              http://localhost:5173                          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (cookies)
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Express Server (Port 5020)                      │
│  http://localhost:5020/api                                  │
├─────────────────────────────────────────────────────────────┤
│  Routes Layer                                               │
│  ├─ /api/auth (AuthRoutes)                                  │
│  ├─ /api/users (UserRoutes)                                 │
│  └─ /api/profiles (ProfileRoutes) - Phase 2                │
├─────────────────────────────────────────────────────────────┤
│  Middleware Layer                                           │
│  ├─ ErrorHandler                                            │
│  ├─ JwtMiddleware                                           │
│  ├─ ValidationMiddleware                                    │
│  └─ CorsMiddleware                                          │
├─────────────────────────────────────────────────────────────┤
│  Controller Layer                                           │
│  ├─ AuthController (receives request, calls service)        │
│  ├─ UserController                                          │
│  └─ ProfileController - Phase 2                            │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (Business Logic)                             │
│  ├─ AuthService                                             │
│  ├─ UserService                                             │
│  └─ ProfileService - Phase 2                               │
├─────────────────────────────────────────────────────────────┤
│  Repository Layer (Data Access)                             │
│  ├─ UserRepository                                          │
│  └─ TokenRepository                                         │
├─────────────────────────────────────────────────────────────┤
│  Database Layer                                             │
│  └─ PostgreSQL (via pg connection pool)                     │
└─────────────────────────────────────────────────────────────┘
```

### Layered Architecture Benefits

- **Separation of Concerns:** Each layer has a single responsibility
- **Testability:** Easy to mock services/repositories
- **Maintainability:** Changes in one layer don't affect others
- **Scalability:** Ready to split into microservices (Phase 5+)
- **Reusability:** Services can be called from multiple controllers

### Monolith to Microservices Path

**Phase 1-2 (Monolith):**
- Single `backend` folder
- All services in one process
- Shared PostgreSQL database

**Phase 3+ (Transitional):**
- Extract `AuthService` → separate service (optional, can stay)
- Extract `PaymentService` → separate service (financial isolation)

**Phase 4+ (Full Microservices):**
```
linkprosoft-backend/
├── services/
│   ├── auth-service/       # Independent auth microservice
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── profile-service/     # Professional profiles
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── job-service/         # Job posting and search
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── payment-service/     # Payment processing
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── api-gateway/         # Route requests to services
│       ├── src/
│       └── package.json
└── shared/                  # Shared types, utils
    ├── types/
    └── utils/
```

---

## Project Structure

### Phase 1 Folder Layout

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts           # PostgreSQL connection pool
│   │   ├── environment.ts        # Env validation (Zod)
│   │   └── constants.ts          # App-wide constants
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT verification
│   │   ├── errorHandler.ts       # Global error handling
│   │   ├── cors.middleware.ts    # CORS configuration
│   │   ├── validation.ts         # Request validation
│   │   └── logger.ts             # Request logging
│   ├── routes/
│   │   ├── index.ts              # Mount all routes
│   │   ├── auth.routes.ts        # Auth endpoints
│   │   └── users.routes.ts       # User endpoints
│   ├── controllers/
│   │   ├── auth.controller.ts    # Auth request handlers
│   │   └── user.controller.ts    # User request handlers
│   ├── services/
│   │   ├── auth.service.ts       # Auth business logic
│   │   └── user.service.ts       # User business logic
│   ├── repositories/
│   │   ├── base.repository.ts    # Generic CRUD
│   │   ├── user.repository.ts    # User queries
│   │   └── token.repository.ts   # Token tracking (optional)
│   ├── types/
│   │   ├── user.types.ts         # User interfaces
│   │   ├── auth.types.ts         # Auth interfaces
│   │   └── index.ts              # Export all types
│   ├── utils/
│   │   ├── errors.ts             # Custom error classes
│   │   ├── helpers.ts            # Utility functions
│   │   └── validators.ts         # Validation helpers
│   ├── migrations/
│   │   ├── 001_init_schema.sql   # Create tables
│   │   └── 002_add_indexes.sql   # Performance indexes
│   └── server.ts                 # Entry point
├── tests/
│   ├── integration/
│   │   ├── auth.test.ts          # Auth endpoint tests
│   │   └── user.test.ts          # User endpoint tests
│   ├── unit/
│   │   ├── auth.service.test.ts
│   │   └── user.service.test.ts
│   └── fixtures/
│       └── mockData.ts           # Test data
├── scripts/
│   ├── seed.ts                   # Sample data (for testing)
│   └── setup-db.ts               # DB initialization
├── .env.example                  # Environment template
├── .env.local                    # (Don't commit) Local development
├── .gitignore
├── .eslintrc.json
├── tsconfig.json
├── jest.config.js
├── package.json
└── README.md
```

---

## Step-by-Step Implementation

### Step 1: Initialize TypeScript Project (Day 1)

```bash
cd backend

# Install dependencies
npm install

# Initialize TypeScript config (already exists in tsconfig.json)
# Verify tsconfig.json has:
# - "strict": true
# - "target": "ES2020"
# - "module": "commonjs"

# Create .env.local from .env.example
cp .env.example .env.local

# Create base folder structure
mkdir -p src/{config,middleware,routes,controllers,services,repositories,types,utils,migrations}
mkdir -p tests/{integration,unit,fixtures}
mkdir -p scripts
```

### Step 2: Set Up Database Connection (Day 1-2)

**src/config/database.ts:**
```typescript
import { Pool, QueryResult } from 'pg';

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

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
export type { QueryResult };
```

**src/config/environment.ts:**
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().default(5020),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('linkprosoft_dev'),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('24h'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);
```

### Step 3: Create Database Schema (Day 2)

**src/migrations/001_init_schema.sql:**
```sql
-- Create ENUM types
CREATE TYPE user_type AS ENUM ('professional', 'employer');
CREATE TYPE job_status AS ENUM ('draft', 'posted', 'in_progress', 'completed', 'cancelled');
CREATE TYPE availability_status AS ENUM ('available', 'unavailable', 'away');

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  user_type user_type NOT NULL,
  phone_number VARCHAR(20),
  location VARCHAR(255),
  profile_image_url VARCHAR(500),
  bio TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- Professional profiles table
CREATE TABLE professional_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  hourly_rate DECIMAL(10, 2),
  availability_status availability_status DEFAULT 'available',
  total_ratings INT DEFAULT 0,
  avg_rating DECIMAL(3, 2) DEFAULT 0,
  total_jobs_completed INT DEFAULT 0,
  response_time_hours INT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens (for token rotation - Phase 2)
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**src/migrations/002_add_indexes.sql:**
```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX idx_professional_profiles_rating ON professional_profiles(avg_rating DESC);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

**Run migrations:**
```bash
# Option 1: Using node-pg-migrate
npm run db:migrate

# Option 2: Manual SQL execution
psql -U postgres -d linkprosoft_dev < src/migrations/001_init_schema.sql
psql -U postgres -d linkprosoft_dev < src/migrations/002_add_indexes.sql
```

### Step 4: Implement Types (Day 2)

**src/types/user.types.ts:**
```typescript
export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  user_type: 'professional' | 'employer';
  phone_number?: string;
  location?: string;
  profile_image_url?: string;
  bio?: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_type: 'professional' | 'employer';
  phone_number?: string;
  location?: string;
}

export interface UserResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  is_verified: boolean;
  created_at: Date;
}
```

**src/types/auth.types.ts:**
```typescript
export interface JwtPayload {
  id: number;
  email: string;
  firstName: string;
  userType: 'professional' | 'employer';
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: UserResponse;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  userType: 'professional' | 'employer';
}
```

### Step 5: Build Service Layer (Day 3)

**src/services/auth.service.ts:**
```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, CreateUserDto } from '../types/user.types.js';
import { JwtPayload } from '../types/auth.types.js';
import UserRepository from '../repositories/user.repository.js';
import { env } from '../config/environment.js';
import AppError from '../utils/errors.js';

class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(data: CreateUserDto): Promise<{ user: User; token: string }> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('User already exists', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await this.userRepository.create({
      ...data,
      password_hash: hashedPassword,
    });

    // Generate JWT
    const token = this.generateToken(user);

    // Return user (without password)
    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate JWT
    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      return decoded;
    } catch (error) {
      throw new AppError('Invalid or expired token', 401);
    }
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      userType: user.user_type,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRY,
    });
  }

  private sanitizeUser(user: User): Omit<User, 'password_hash'> {
    const { password_hash, ...sanitized } = user;
    return sanitized;
  }
}

export default new AuthService();
```

**src/services/user.service.ts:**
```typescript
import { User } from '../types/user.types.js';
import UserRepository from '../repositories/user.repository.js';
import AppError from '../utils/errors.js';

class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getUserById(id: number): Promise<User | null> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async updateUserProfile(id: number, data: Partial<User>): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent password updates through this endpoint
    const { password_hash, ...updateData } = data;

    const updatedUser = await this.userRepository.update(id, {
      ...updateData,
      updated_at: new Date(),
    });

    return updatedUser;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }
}

export default new UserService();
```

### Step 6: Build Repository Layer (Day 3)

**src/repositories/base.repository.ts:**
```typescript
import { QueryResult } from 'pg';
import pool from '../config/database.js';

abstract class BaseRepository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async findById(id: number): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1 AND deleted_at IS NULL`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findAll(limit = 50, offset = 0): Promise<T[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL LIMIT $1 OFFSET $2`;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  async create(data: Partial<T>): Promise<T> {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data)
      .map((_, i) => `$${i + 1}`)
      .join(', ');
    const values = Object.values(data);

    const query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async update(id: number, data: Partial<T>): Promise<T> {
    const columns = Object.keys(data)
      .map((col, i) => `${col} = $${i + 1}`)
      .join(', ');
    const values = [...Object.values(data), id];

    const query = `UPDATE ${this.tableName} SET ${columns} WHERE id = $${values.length} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async delete(id: number): Promise<boolean> {
    const query = `UPDATE ${this.tableName} SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async count(): Promise<number> {
    const query = `SELECT COUNT(*) FROM ${this.tableName} WHERE deleted_at IS NULL`;
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
  }
}

export default BaseRepository;
```

**src/repositories/user.repository.ts:**
```typescript
import pool from '../config/database.js';
import { User, CreateUserDto } from '../types/user.types.js';
import BaseRepository from './base.repository.js';

class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async create(data: CreateUserDto & { password_hash: string }): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, user_type, phone_number, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.email,
      data.password_hash,
      data.first_name,
      data.last_name,
      data.user_type,
      data.phone_number,
      data.location,
    ]);
    return result.rows[0];
  }
}

export default UserRepository;
```

### Step 7: Build Controllers (Day 3)

**src/controllers/auth.controller.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service.js';
import { RegisterDto, LoginDto } from '../types/auth.types.js';
import { z } from 'zod';

const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  userType: z.enum(['professional', 'employer']),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = registerSchema.parse(req.body);

    const { user, token } = await authService.register({
      email: validatedData.email,
      password: validatedData.password,
      first_name: validatedData.firstName,
      last_name: validatedData.lastName,
      user_type: validatedData.userType,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        userType: user.user_type,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = loginSchema.parse(req.body);

    const { user, token } = await authService.login(
      validatedData.email,
      validatedData.password
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        userType: user.user_type,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response) {
  res.clearCookie('token');
  return res.status(200).json({
    success: true,
    message: 'User logged out successfully',
  });
}

export async function checkAuth(req: Request, res: Response) {
  return res.status(200).json({
    success: true,
    message: 'Authenticated',
    user: req.user,
  });
}
```

### Step 8: Middleware Setup (Day 3)

**src/middleware/auth.middleware.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service.js';
import AppError from '../utils/errors.js';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies.token;

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const decoded = await authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}
```

**src/middleware/errorHandler.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/errors.js';

export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  // Zod validation error
  if (error instanceof SyntaxError || error.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: (error as any).errors,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
```

### Step 9: Routes Setup (Day 3)

**src/routes/auth.routes.ts:**
```typescript
import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/check-auth', authMiddleware, authController.checkAuth);

export default router;
```

**src/routes/index.ts:**
```typescript
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router;
```

### Step 10: Server Entry Point (Day 3)

**src/server.ts:**
```typescript
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/environment.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Frontend URL: ${env.FRONTEND_URL}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});
```

---

## Coding Standards & Style Guide

### TypeScript Best Practices

#### 1. Strict Type Safety (No `any`)

❌ **Bad:**
```typescript
function processUser(user: any) {
  return user.email;
}
```

✅ **Good:**
```typescript
function processUser(user: User): string {
  return user.email;
}
```

#### 2. Use Interfaces for Contracts

❌ **Bad:**
```typescript
async function getUser(id: number) {
  return await userRepository.findById(id);
}
```

✅ **Good:**
```typescript
async function getUser(id: number): Promise<User | null> {
  return await userRepository.findById(id);
}
```

#### 3. Error Handling with Custom Errors

❌ **Bad:**
```typescript
if (!user) {
  throw new Error('User not found');
}
```

✅ **Good:**
```typescript
if (!user) {
  throw new AppError('User not found', 404);
}
```

#### 4. Naming Conventions

```typescript
// Classes: PascalCase
class UserService { }

// Functions: camelCase
function getUserById() { }

// Constants: UPPER_SNAKE_CASE
const DB_POOL_SIZE = 20;

// Interfaces: PrefixWithI or DescriptiveType
interface IUserRepository { }
interface User { }  // Descriptive type

// Private members: prefixed with _
private _internalState: string;
```

#### 5. Comments & Documentation

```typescript
/**
 * Registers a new user in the system
 * @param data - User registration data
 * @returns Promise containing user object and JWT token
 * @throws AppError if user already exists
 * @example
 * const result = await authService.register({
 *   email: 'john@example.com',
 *   password: 'secure123'
 * });
 */
async register(data: CreateUserDto): Promise<{ user: User; token: string }> {
  // implementation
}
```

### Code Organization

#### 1. File Organization

```typescript
// 1. Imports (grouped: external, types, internal)
import express from 'express';
import { User } from '../types/user.types.js';
import UserService from '../services/user.service.js';

// 2. Type definitions
interface UserParams {
  id: number;
}

// 3. Constants
const MAX_PASSWORD_ATTEMPTS = 5;

// 4. Class/Function definition
class AuthController {
  // Properties
  private authService: AuthService;

  // Constructor
  constructor() {
    this.authService = new AuthService();
  }

  // Public methods
  async register() { }

  // Private methods
  private sanitizeUser() { }
}

// 5. Exports
export default AuthController;
```

#### 2. Service Layer Pattern

**Single Responsibility:**
```typescript
// AuthService handles ONLY authentication
class AuthService {
  async register() { }
  async login() { }
  async verifyToken() { }
  // NOT: async sendEmail() - that's EmailService's job
}
```

**Dependency Injection:**
```typescript
// ✅ Good: Services receive dependencies
class UserService {
  constructor(private repository: UserRepository) { }
}

// ❌ Bad: Services create their own dependencies
class UserService {
  constructor() {
    this.repository = new UserRepository();
  }
}
```

#### 3. Controller Pattern

```typescript
// Controllers are thin - they delegate to services
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Validate input
    const validatedData = registerSchema.parse(req.body);

    // 2. Call service
    const result = await authService.register(validatedData);

    // 3. Send response
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    // 4. Handle errors (pass to middleware)
    next(error);
  }
}
```

### Testing Standards

#### 1. Unit Test Pattern

```typescript
// auth.service.test.ts
import authService from '../auth.service';
import UserRepository from '../repositories/user.repository';

jest.mock('../repositories/user.repository');

describe('AuthService', () => {
  let mockRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepository = UserRepository as jest.Mocked<typeof UserRepository>;
  });

  it('should register a new user successfully', async () => {
    // Arrange
    const userData = { email: 'test@example.com', password: 'pass123' };
    mockRepository.findByEmail.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue({ id: 1, ...userData });

    // Act
    const result = await authService.register(userData);

    // Assert
    expect(result.user.id).toBe(1);
    expect(mockRepository.create).toHaveBeenCalled();
  });

  it('should throw error if user already exists', async () => {
    // Arrange
    const userData = { email: 'test@example.com', password: 'pass123' };
    mockRepository.findByEmail.mockResolvedValue({ id: 1, ...userData });

    // Act & Assert
    await expect(authService.register(userData)).rejects.toThrow('User already exists');
  });
});
```

#### 2. Integration Test Pattern

```typescript
// auth.test.ts
import request from 'supertest';
import app from '../server';
import pool from '../config/database';

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    // Setup test database
  });

  afterAll(async () => {
    // Cleanup
    await pool.end();
  });

  it('POST /api/auth/register should return 201', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        userType: 'professional',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.headers['set-cookie']).toBeDefined();
  });
});
```

---

## Service Layer Pattern (Monolith)

### How Services Work

Each service encapsulates business logic for a domain:

```
Request → Controller → Service → Repository → Database
  ↓         ↓           ↓          ↓             ↓
Validate  Format      Logic     Query      Return data
input     response    (rules)   (SQL)
```

### Phase 1 Services

#### AuthService
```
Responsibilities:
- Hashing passwords
- Generating JWT tokens
- Verifying tokens
- User registration validation
- Login validation
```

#### UserService
```
Responsibilities:
- User profile retrieval
- Profile updates
- User listing (Phase 2+)
- Soft delete (archive)
```

### Adding a New Service (Template)

When adding a service in Phase 2+:

```typescript
// src/services/profile.service.ts
import ProfileRepository from '../repositories/profile.repository.js';
import { ProfessionalProfile } from '../types/profile.types.js';

class ProfileService {
  private profileRepository: ProfileRepository;

  constructor() {
    this.profileRepository = new ProfileRepository();
  }

  async createProfile(userId: number, data: any): Promise<ProfessionalProfile> {
    // Business logic here
    // e.g., validate hourly rate, check permissions
    return this.profileRepository.create(userId, data);
  }

  async updateProfile(id: number, data: any): Promise<ProfessionalProfile> {
    // Business logic
    return this.profileRepository.update(id, data);
  }
}

export default new ProfileService();
```

---

## Error Handling & Logging

### Custom Error Class

**src/utils/errors.ts:**
```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export default AppError;
```

### Error Usage

```typescript
// Validation error
if (!email.includes('@')) {
  throw new AppError('Invalid email format', 400);
}

// Not found
if (!user) {
  throw new AppError('User not found', 404);
}

// Conflict (duplicate)
if (existingUser) {
  throw new AppError('User already exists', 409);
}

// Unauthorized
if (!token) {
  throw new AppError('Unauthorized', 401);
}

// Forbidden
if (user.id !== requesterId) {
  throw new AppError('Forbidden', 403);
}

// Server error
throw new AppError('Database connection failed', 500);
```

### Logging

Use `morgan` for HTTP requests (already configured in `server.ts`).

For business logic logging (Phase 2+):

```typescript
// src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

export default logger;
```

---

## Database Setup & Migrations

### Initial Setup

```bash
# 1. Create database
createdb linkprosoft_dev

# 2. Run migrations
npm run db:migrate

# 3. Verify schema
psql -U postgres -d linkprosoft_dev -c "\dt"

# 4. Seed sample data (optional)
npm run db:seed
```

### Migration Workflow

```bash
# Create new migration
npm run db:migrate:create -- add_new_table

# This creates: src/migrations/003_add_new_table.sql

# Run migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate:down
```

### Connection Pool Monitoring

```typescript
// Add to health check endpoint
app.get('/health', async (req, res) => {
  const poolStats = {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
  };

  res.json({
    status: 'OK',
    database: 'connected',
    pool: poolStats,
  });
});
```

---

## Testing Strategy

### Coverage Targets

| Category | Target |
|----------|--------|
| Auth endpoints | 100% |
| User endpoints | 90% |
| Services | 85% |
| Repositories | 80% |
| Utils | 75% |
| **Overall** | **80%+** |

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Watch mode (for development)
npm test:watch
```

### Test Structure

```
tests/
├── integration/
│   ├── auth.test.ts          # Endpoint tests
│   └── user.test.ts
├── unit/
│   ├── auth.service.test.ts  # Service logic tests
│   └── user.service.test.ts
└── fixtures/
    └── mockData.ts            # Shared test data
```

---

## Migration Path to Microservices

### Phase 1-2: Monolith Foundation (Current)

```
linkprosoft-backend/
├── src/
│   ├── services/
│   │   ├── auth.service.ts       (Could be extracted)
│   │   ├── user.service.ts       (With profiles - Phase 2)
│   │   ├── profile.service.ts    (Phase 2)
│   │   ├── skill.service.ts      (Phase 2)
│   │   └── job.service.ts        (Phase 3)
│   └── ...
├── db/ (Shared PostgreSQL)
└── package.json
```

**Advantages:**
- Single deployment
- Easier debugging
- Shared database (ACID guarantees)
- Lower operational overhead

---

### Phase 3+: Identify Boundary Service (Payment)

**Payment Service becomes independent first:**

```
Rationale:
- Financial transactions need isolation
- Can scale independently (PCI compliance)
- Webhook handling (Paystack) can be async
- Separate database for audit trail
```

**Structure:**
```
linkprosoft-backend/
├── api-gateway/              # Routes requests
│   ├── src/
│   │   ├── routes/gateway.routes.ts
│   │   └── middleware/auth.middleware.ts
│   └── package.json
├── services/
│   ├── auth-service/         # Still monolithic or split later
│   ├── payment-service/      # EXTRACTED (independent)
│   │   ├── src/
│   │   │   ├── services/
│   │   │   ├── controllers/
│   │   │   └── server.ts
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   └── package.json
│   └── core-service/         # Everything else (profiles, jobs, search)
└── shared/                   # Shared types, constants
```

---

### Phase 4+: Full Microservices

```
linkprosoft-backend/
├── services/
│   ├── auth-service/         # JWT verification only
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── profile-service/      # Professional profiles
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── job-service/          # Job posting and search
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── payment-service/      # Payment processing
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── review-service/       # Reviews and ratings
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── api-gateway/          # Request routing
│       ├── src/
│       │   ├── routes/
│       │   ├── middleware/
│       │   └── server.ts
│       ├── Dockerfile
│       └── package.json
├── shared/
│   ├── types/
│   ├── utils/
│   └── package.json          # Shared npm package
├── docker-compose.yml        # All services + PostgreSQL
└── README.md
```

### Migration Checklist

- [ ] Phase 1: Build monolith with service layer
- [ ] Phase 2: Add profiles/skills (same monolith)
- [ ] Phase 3: Extract payment service (first microservice)
- [ ] Phase 4: Extract search service (async job queue)
- [ ] Phase 5: Extract other services
- [ ] Use event-driven communication (RabbitMQ/Kafka)
- [ ] Implement circuit breakers for resilience
- [ ] Add distributed tracing (Jaeger)

---

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Create folder structure
3. ✅ Set up `.env.local`
4. ✅ Create database and run migrations
5. ✅ Implement auth endpoints (Phase 1 focus)
6. ✅ Write tests
7. ✅ Start dev server: `npm run dev`
8. ✅ Test endpoints with Thunder Client
9. → Move to Phase 2: Profiles & Skills

---

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Owner:** Backend Team  

