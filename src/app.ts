/**
 * Express application setup
 * Configures middleware, routes, and error handling
 */

import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./modules/auth/authRoutes";
import profileRoutes from "./modules/profile/profileRoutes";
import skillRoutes from "./modules/skill/skillRoutes";
import certificationRoutes from "./modules/certification/certificationRoutes";
import portfolioRoutes from "./modules/portfolio/portfolioRoutes";
import searchRoutes from "./modules/search/searchRoutes";
import { errorHandler } from "./middleware/errorMiddleware";
import { requestLogger } from "./middleware/requestLogger";
import jobRoutes from "./modules/jobs/jobRoutes";
import assignmentsRoutes from './modules/assignments/assignmentRoutes';
import paymentsRoutes from "./modules/payments/paymentsRoutes";
import adminPaymentsRoutes from "./modules/payments/adminPaymentsRoutes";
import reviewRoutes from "./modules/reviews/reviewsRoutes";
import { env } from "./config/environment";
import {
  generalLimiter,
  authLimiter,
  moderateLimiter,
  searchLimiter,
} from "./middleware/rateLimitMiddleware";

const app = express();

// ============================================
// MIDDLEWARE SETUP - Order matters!
// ============================================

// Security headers with Helmet
// Must come early to protect all responses
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
   // permissionsPolicy: false, // Disable Permissions-Policy header by default
  })
);

/**
 * ✅ Raw Body Middleware for Webhook Signature Verification
 * Captures raw request body before JSON parsing
 * Used by Paystack webhook to verify x-paystack-signature header
 * Must come before express.json() middleware
 */
app.use(
  express.json({
    verify: (req: any, _: any, buf: Buffer) => {
      // Store raw body for webhook signature verification
      req.rawBody = buf.toString("utf8");
    },
  })
);

// Alternative: For routes that don't need raw body, use standard JSON parsing
// This is already done above with the verify callback

// Parse cookies from headers
app.use(cookieParser());

// CORS configuration - allow frontend to communicate with backend
const allowedOrigins = [
  env.FRONTEND_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Allow cookies in requests
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400, // 24 hours
  })
);

// General rate limiting - applies to all routes
// 100 requests per 15 minutes per IP
app.use(generalLimiter);

// Request logging middleware
app.use(requestLogger);

// ============================================
// ROUTES
// ============================================

// Auth routes - strict rate limiting (5 requests per 15 minutes)
app.use("/api/auth", authLimiter, authRoutes);

// Profile routes - moderate rate limiting (30 requests per 15 minutes)
app.use("/api/profiles", moderateLimiter, profileRoutes);

// Skill routes - moderate rate limiting
app.use("/api/skills", moderateLimiter, skillRoutes);

// Certification routes - moderate rate limiting
app.use("/api/profiles", moderateLimiter, certificationRoutes);

// Portfolio routes - moderate rate limiting
app.use("/api/profiles", moderateLimiter, portfolioRoutes);

// Search routes - search-specific rate limiting (50 requests per 15 minutes)
app.use("/api/search", searchLimiter, searchRoutes);

// Payments routes
app.use("/api/payments", paymentsRoutes);
// Admin payment approval endpoints (router enforces admin role)
app.use("/api/admin/payments", adminPaymentsRoutes);
app.use("/api/reviews", reviewRoutes);
// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

//Jobs routes
app.use('/api/jobs', jobRoutes);

//Assignment routes
app.use('/api/assignments', assignmentsRoutes);
// 404 handler - must come before error handler
app.use("*", (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "not_found",
    message: "Route not found",
    statusCode: 404,
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// ERROR HANDLING MIDDLEWARE - must be last!
// ============================================
app.use(errorHandler);

export default app;
