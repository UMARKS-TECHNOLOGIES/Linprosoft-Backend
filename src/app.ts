/**
 * Express application setup
 * Configures middleware, routes, and error handling
 */

import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./modules/auth/authRoutes";
import { errorHandler } from "./middleware/errorMiddleware";
import { requestLogger } from "./middleware/requestLogger";

const app = express();

// ============================================
// MIDDLEWARE SETUP - Order matters!
// ============================================

// Parse JSON request bodies
app.use(express.json());

// Parse cookies from headers
app.use(cookieParser());

// CORS configuration - allow frontend to communicate with backend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true, // Allow cookies in requests
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400, // 24 hours
  })
);

// Request logging middleware
app.use(requestLogger);

// ============================================
// ROUTES
// ============================================

// Auth routes
app.use("/api/auth", authRoutes);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

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
