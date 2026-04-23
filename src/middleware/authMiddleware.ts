/**
 * Authentication Middleware
 * Verifies JWT tokens from cookies or Authorization header
 * Sets req.user with decoded token payload
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import catchAsync from "../utils/catchAsync";
import { AppError } from "../utils/appError";
import { JwtPayload } from "../types/authTypes";

/**
 * Extend Express Request type to include user property
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Protect middleware - verifies JWT token from cookies or Authorization header
 * Must be placed BEFORE controllers in route middleware chain
 * 
 * Usage: router.get('/protected', protect, controller.method)
 */
export const protect = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    let token = "";

    // Step 1: Try to get token from cookies (primary method - most secure)
    if (req.cookies?.token) {
      token = req.cookies.token;
    }
    // Step 2: Fallback to Authorization header (for mobile/non-cookie clients)
    // Expected format: "Bearer <token>"
    else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Step 3: If no token found, throw error
    if (!token) {
      throw new AppError("Please login to access this resource", 401);
    }

    // Step 4: Verify and decode JWT token
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as JwtPayload;

      // Step 5: Attach user info to request for downstream use
      req.user = decoded;
      next();
    } catch (error) {
      // Handle specific JWT errors
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError("Token expired, please login again", 401);
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError("Invalid token", 401);
      }

      throw new AppError("Authentication failed", 401);
    }
  }
);

/**
 * Authorize middleware - checks if user has required role(s)
 * Must be placed AFTER protect middleware
 * 
 * Usage: router.post('/admin', protect, authorize('professional'), controller.method)
 * 
 * @param roles - Array of allowed user types (e.g., 'professional', 'employer')
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Check if user is authenticated (protect middleware runs first)
    if (!req.user) {
      throw new AppError("Not authenticated", 401);
    }

    // Check if user's type is in allowed roles
    if (!roles.includes(req.user.userType)) {
      throw new AppError(
        `Not authorized. Required role: ${roles.join(" or ")}`,
        403
      );
    }

    next();
  };
};
