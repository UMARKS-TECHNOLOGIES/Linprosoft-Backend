/**
 * Rate Limiting Middleware
 * Implements tiered rate limiting for API protection
 */

import rateLimit from "express-rate-limit";
import { Request } from "express";

/**
 * Helper function to get client IP from request
 * Handles proxy scenarios (X-Forwarded-For) and direct connections
 */
function getClientIp(req: Request): string {
  const forwardedFor = req.headers["x-forwarded-for"] as string;
  if (forwardedFor) {
    // If behind a proxy, get the first IP
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || "127.0.0.1";
}

/**
 * General API rate limiter
 * Applied to all routes: 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "rate_limit_exceeded",
    message: "Too many requests from this IP, please try again later.",
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req: Request) => getClientIp(req),
  skip: (req: Request) => {
    // Skip rate limiting for health check endpoint
    return req.path === "/health";
  },
});

/**
 * Strict rate limiter for auth endpoints
 * Applied to login/register: 5 requests per 15 minutes per IP
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: "auth_rate_limit_exceeded",
    message: "Too many login attempts. Please try again later.",
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientIp(req),
  // Skip if user is already authenticated
  skip: (req: Request) => {
    return !!req.cookies?.token;
  },
});

/**
 * Moderate rate limiter for data-heavy operations
 * Applied to profile updates, file uploads: 30 requests per 15 minutes per IP
 */
export const moderateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: {
    success: false,
    error: "rate_limit_exceeded",
    message: "Too many requests. Please wait before trying again.",
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientIp(req),
});

/**
 * Search endpoint rate limiter
 * Applied to search queries: 50 requests per 15 minutes per IP
 * Prevents search abuse while allowing frequent legitimate searches
 */
export const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: {
    success: false,
    error: "search_rate_limit_exceeded",
    message: "Too many search requests. Please try again later.",
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientIp(req),
});

export default {
  generalLimiter,
  authLimiter,
  moderateLimiter,
  searchLimiter,
};
