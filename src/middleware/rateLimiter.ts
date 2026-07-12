/**
 * Rate Limiting Middleware
 * Implements IP and email-based rate limiting for auth endpoints
 * Uses in-memory storage (for single instance) or could be adapted for Redis
 */

import { Request, Response, NextFunction } from "express";

// In-memory stores for rate limiting
// In production, these should be replaced with Redis or similar distributed store
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const emailRequestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Clean up expired entries from rate limiting maps
 * This should be called periodically to prevent memory leaks
 */
const cleanupRateLimitingMaps = () => {
  const now = Date.now();

  // Clean IP map
  for (const [key, value] of ipRequestCounts.entries()) {
    if (value.resetTime < now) {
      ipRequestCounts.delete(key);
    }
  }

  // Clean email map
  for (const [key, value] of emailRequestCounts.entries()) {
    if (value.resetTime < now) {
      emailRequestCounts.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitingMaps, 5 * 60 * 1000);

/**
 * Rate limiter middleware factory
 * @param keyGenerator - Function to generate rate limit key from request
 * @param limit - Max requests allowed in window
 * @param windowMs - Window size in milliseconds
 * @param useEmailStore - Whether to use email store (true) or IP store (false)
 * @returns Middleware function
 */
const rateLimiter = (
  keyGenerator: (req: Request) => string,
  limit: number,
  windowMs: number,
  useEmailStore: boolean = false
) => {
  return (req: Request, res: Response, next: NextFunction) => {
   const key = keyGenerator(req);
   const now = Date.now();
   // Choose the appropriate map based on useEmailStore flag
   const requestCounts = useEmailStore ? emailRequestCounts : ipRequestCounts;

   // Get or create counter for this key
   let record = requestCounts.get(key);

   if (!record || record.resetTime <= now) {
     // Reset window
     record = { count: 1, resetTime: now + windowMs };
     requestCounts.set(key, record);
   } else {
     // Increment count
     record.count++;

     // Check if limit exceeded
     if (record.count > limit) {
       return res.status(429).json({
         success: false,
         message: "Rate limit exceeded",
         error: "RATE_LIMITED",
         timestamp: new Date().toISOString()
       });
     }
   }

   // Add rate limit headers
   res.setHeader("X-RateLimit-Limit", limit);
   res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - record.count));
   res.setHeader("X-RateLimit-Reset", new Date(record.resetTime).toISOString());

   next();
  };
};

export default rateLimiter;
