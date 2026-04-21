# Linkprosoft Backend - Production-Ready Implementation Guide

**Phase 1: Enhanced MVP Foundation**  
**Duration:** 3-5 days  
**Output:** Enterprise-grade authentication system ready for scaling  

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Type System & DTOs](#type-system--dtos)
3. [Request Validation](#request-validation)
4. [Response Standardization](#response-standardization)
5. [Middleware Strategy](#middleware-strategy)
6. [Enhanced Error Handling](#enhanced-error-handling)
7. [Logging & Observability](#logging--observability)
8. [Cookie-Based Authentication](#cookie-based-authentication)
9. [Implementation Checklist](#implementation-checklist)

---

## Architecture Overview

### Layered Request Flow (Production-Ready)

```
CLIENT REQUEST
    ↓
Express Middleware Stack
├── CORS
├── JSON Body Parser
├── Cookie Parser
└── Request Logging (Morgan/Winston)
    ↓
Route Handler
├── Path Matching
├── Method Routing
    ↓
INPUT VALIDATION LAYER ← NEW
├── Request DTO Validation (Zod)
├── Authorization Middleware (JWT)
├── Rate Limiting ← Phase 2
    ↓
CONTROLLER LAYER
├── Extract Request Data
├── Call Service
├── Format Response (DTO)
    ↓
SERVICE LAYER
├── Business Logic
├── Calls Repository
├── Throws AppError on failure
    ↓
REPOSITORY LAYER
├── SQL Queries
├── Returns typed data
├── NO filtering (service responsibility)
    ↓
DATABASE
├── PostgreSQL
    ↓
Response Processing
├── DTO Transformation ← NEW
├── Standardized Response Wrapper ← NEW
├── Set Cookies ← NEW
    ↓
CLIENT RESPONSE
├── HTTP Status Code
├── Standardized JSON
├── Set-Cookie Headers
```

---

## Type System & DTOs

### Why DTOs Matter

**Without DTOs (Current):**
```typescript
// Service returns full database object
user = { id: 1, email: "...", password: "...", created_at: "...", updated_at: "..." }

// Controller sends everything to frontend
res.json({ user }); // ← PASSWORD EXPOSED!
```

**With DTOs (Production):**
```typescript
// Service still gets full object
// Controller transforms to DTO
user = { id: 1, email: "...", firstName: "..." } // ← Only what frontend needs

// Frontend receives safe data
res.json({ success: true, data: { user } });
```

### Recommended File Structure

```
src/types/
├── index.ts                 # Export everything
├── user.types.ts           # User entities
├── auth.types.ts           # Auth request/response
├── api.types.ts            # Global API types
└── error.types.ts          # Error definitions
```

### Core Types to Implement

```typescript
// types/user.types.ts
export interface User {
  id: number;
  email: string;
  password: string;           // Hash - never expose
  first_name: string;
  last_name: string;
  user_type: "professional" | "employer";
  comp_name?: string;         // Required if employer
  location?: string;
  phone?: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface UserResponseDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  userType: "professional" | "employer";
  compName?: string;
  location?: string;
  phone?: string;
  isVerified: boolean;
  createdAt: Date;
}

// types/auth.types.ts
export interface SignupRequestDTO {
  email: string;
  password: string;
  passwordConfirm: string;
  firstName: string;
  lastName: string;
  userType: "professional" | "employer";
  compName?: string;
  phone?: string;
  location?: string;
}

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface AuthResponseDTO {
  success: boolean;
  message: string;
  data: {
    user: UserResponseDTO;
  };
}

export interface JwtPayload {
  id: number;
  email: string;
  userType: "professional" | "employer";
  iat?: number;
  exp?: number;
}

// types/api.types.ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp: string;
}

// types/error.types.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  ...(NODE_ENV === "development" && { stack?: string })
}
```

---

## Request Validation

### Why Zod?

1. **Type-Safe:** Generates TypeScript types from schemas
2. **Composable:** Reuse schemas easily
3. **Clear Errors:** Validation error formatting for frontend
4. **Performance:** Minimal overhead

### Installation

```bash
npm install zod
npm install -D @types/zod
```

### Validation Schemas

```typescript
// modules/auth/authValidation.ts
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain uppercase letter")
  .regex(/[0-9]/, "Password must contain number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain special character");

const emailSchema = z.string().email("Invalid email format");

export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
    firstName: z.string().min(2, "First name required"),
    lastName: z.string().min(2, "Last name required"),
    userType: z.enum(["professional", "employer"]),
    compName: z.string().optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone").optional(),
    location: z.string().optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  })
  .refine((data) => {
    if (data.userType === "employer" && !data.compName) {
      return false;
    }
    return true;
  }, {
    message: "Company name required for employers",
    path: ["compName"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password required"),
});

// Type inference
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

### Validation Middleware

```typescript
// middleware/validation.middleware.ts
import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/appError";

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      const formattedErrors = error.errors.map((err: any) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      
      throw new AppError(
        `Validation failed: ${JSON.stringify(formattedErrors)}`,
        400
      );
    }
  };
};

// Usage in routes
router.post("/signup", validate(signupSchema), controller.signup);
router.post("/login", validate(loginSchema), controller.login);
```

---

## Response Standardization

### Response Wrapper Utility

```typescript
// utils/response.ts
import { Response } from "express";
import { ApiResponse, PaginatedResponse } from "../types/api.types";

export class ApiResponseHandler {
  static success<T>(
    res: Response,
    data: T,
    message: string = "Success",
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    
    return res.status(statusCode).json(response);
  }

  static created<T>(
    res: Response,
    data: T,
    message: string = "Created successfully"
  ): Response {
    return this.success(res, data, message, 201);
  }

  static paginated<T>(
    res: Response,
    items: T[],
    total: number,
    page: number,
    limit: number,
    message: string = "Success"
  ): Response {
    const totalPages = Math.ceil(total / limit);
    
    const response: PaginatedResponse<T> = {
      success: true,
      message,
      data: {
        items,
        total,
        page,
        limit,
        totalPages,
      },
      timestamp: new Date().toISOString(),
    };
    
    return res.status(200).json(response);
  }

  static error(
    res: Response,
    error: string,
    message: string,
    statusCode: number = 500
  ): Response {
    return res.status(statusCode).json({
      success: false,
      error,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    });
  }
}

// Usage in controllers
export const signup = catchAsync(async (req: Request, res: Response) => {
  const { user, token } = await service.signup(req.body);
  
  // Set secure cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000,
  });
  
  // Return standardized response
  return ApiResponseHandler.created(res, { user }, "User registered successfully");
});
```

---

## Middleware Strategy

### Authentication Middleware

```typescript
// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import catchAsync from "../utils/catchAsync";
import { AppError } from "../utils/appError";
import { JwtPayload } from "../types/auth.types";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const protect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let token = "";
  
    // Get token from cookies (primary)
    if (req.cookies?.token) {
      token = req.cookies.token;
    }
    // Get token from Authorization header (fallback)
    else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    
    // No token provided
    if (!token) {
      throw new AppError("Please login to access this resource", 401);
    }
    
    // Verify token
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as JwtPayload;
      
      req.user = decoded;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError("Token expired, please login again", 401);
      }
      throw new AppError("Invalid token", 401);
    }
  }
);

// Optional: Check if user is role
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Not authenticated", 401);
    }
    
    if (!roles.includes(req.user.userType)) {
      throw new AppError("Not authorized for this action", 403);
    }
    
    next();
  };
};

// Usage in routes
router.get("/me", protect, getCurrentUser);
router.post("/jobs", protect, authorize("employer"), createJob);
```

### CORS Middleware (Improved)

```typescript
// middleware/cors.middleware.ts
import cors from "cors";

export const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true, // Allow cookies
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);

// app.ts
app.use(corsMiddleware);
```

---

## Enhanced Error Handling

### Custom Error Classes

```typescript
// utils/appError.ts
export class AppError extends Error {
  isOperational: boolean = true;

  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }

  get status() {
    return `${this.statusCode}`.startsWith("4") ? "fail" : "error";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Not authorized") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409);
  }
}
```

### Global Error Handler

```typescript
// middleware/errorMiddleware.ts
import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { AppError } from "../utils/appError";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  
  // Log error with context
  const errorLog = {
    timestamp: new Date().toISOString(),
    statusCode: err.statusCode,
    message: err.message,
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.user?.id,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };
  
  if (err.statusCode >= 500) {
    logger.error("Server Error", errorLog);
  } else {
    logger.warn("Client Error", errorLog);
  }
  
  // Operational errors (expected)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.status,
      message: err.message,
      statusCode: err.statusCode,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Programming errors (unexpected)
  logger.error("Unhandled Error", { error: err, ...errorLog });
  
  res.status(500).json({
    success: false,
    error: "error",
    message: process.env.NODE_ENV === "production"
      ? "Something went wrong, please try again later"
      : err.message,
    statusCode: 500,
    timestamp: new Date().toISOString(),
  });
};

// 404 handler
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    success: false,
    error: "fail",
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
  });
};
```

---

## Logging & Observability

### Winston Logger Setup

```bash
npm install winston
```

```typescript
// utils/logger.ts
import winston from "winston";
import fs from "fs";
import path from "path";

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "linkprosoft-backend" },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Console in development
    ...(process.env.NODE_ENV !== "production"
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({ timestamp, level, message, ...meta }) => {
                  const metaStr = Object.keys(meta).length
                    ? JSON.stringify(meta, null, 2)
                    : "";
                  return `${timestamp} [${level}]: ${message} ${metaStr}`;
                }
              )
            ),
          }),
        ]
      : []),
  ],
});

export default logger;

// Usage examples
logger.info("User registered", { userId: 123, email: "user@example.com" });
logger.error("Database connection failed", { error: err.message });
logger.warn("Unusual activity", { userId: 123, action: "multiple failed logins" });
```

### Request Logging Middleware

```typescript
// middleware/requestLogger.ts
import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("HTTP Request", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    });
  });
  
  next();
};

// app.ts
app.use(requestLogger);
```

---

## Cookie-Based Authentication

### Complete Setup

```typescript
// server.ts
import cookieParser from "cookie-parser";
import app from "./app";
import { env } from "./config/environment";

app.use(cookieParser());

app.listen(env.PORT, () => {
  console.log(`🚀 Server running on port ${env.PORT}`);
});

// authController.ts (Updated)
export const signup = catchAsync(async (req: Request, res: Response) => {
  const input = req.body; // Already validated by middleware
  const { user, token } = await authService.signup(input);
  
  // Set HTTP-only, Secure cookie
  res.cookie("token", token, {
    httpOnly: true, // Can't be accessed by JavaScript
    secure: env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict", // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: "/api", // Cookie only sent to /api routes
  });
  
  return ApiResponseHandler.created(res, { user }, "User registered successfully");
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  // Clear the cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
  });
  
  return ApiResponseHandler.success(res, null, "Logged out successfully");
});

export const verifyAuth = catchAsync(async (req: Request, res: Response) => {
  // If we reach here, token is valid (protect middleware did its job)
  return ApiResponseHandler.success(res, { user: req.user }, "Authenticated");
});
```

---

## Implementation Checklist

### Dependencies to Install

```bash
npm install zod cookie-parser winston
npm install -D @types/cookie-parser
```

### Files to Create/Modify

- [ ] `types/user.types.ts` - User entities and DTOs
- [ ] `types/auth.types.ts` - Auth request/response types
- [ ] `types/api.types.ts` - Global API response types
- [ ] `types/error.types.ts` - Error type definitions
- [ ] `modules/auth/authValidation.ts` - Zod schemas
- [ ] `middleware/validation.middleware.ts` - Validation handler
- [ ] `middleware/auth.middleware.ts` - JWT verification
- [ ] `middleware/cors.middleware.ts` - CORS configuration
- [ ] `middleware/requestLogger.ts` - Request logging
- [ ] `utils/response.ts` - Response wrapper
- [ ] `utils/logger.ts` - Winston logger
- [ ] `config/environment.ts` - Environment validation
- [ ] `modules/auth/authController.ts` - Updated controllers
- [ ] `modules/auth/authService.ts` - Enhanced service
- [ ] `modules/auth/authRepository.ts` - DTO filtering
- [ ] `app.ts` - Middleware registration
- [ ] `server.ts` - Entry point with proper setup
- [ ] `.env` - Environment variables

### Testing Endpoints

```bash
# Signup
curl -X POST http://localhost:5020/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "passwordConfirm": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "professional"
  }'

# Login
curl -X POST http://localhost:5020/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }' \
  -c cookies.txt

# Verify Auth (using cookies)
curl -X GET http://localhost:5020/api/auth/verify \
  -b cookies.txt

# Logout
curl -X POST http://localhost:5020/api/auth/logout \
  -b cookies.txt
```

---

This guide provides the complete blueprint for production-ready authentication. Implement these patterns and your backend will be ready for enterprise use!
