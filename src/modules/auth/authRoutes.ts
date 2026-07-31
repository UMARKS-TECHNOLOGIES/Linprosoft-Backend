/**
 * Authentication Routes
 * OTP-based authentication flow routes
 */

import { Router } from "express";
import * as controller from "./authController";
import { protect } from "../../middleware/authMiddleware";
import rateLimiter  from "../../middleware/rateLimiter";
import { env } from "../../config/environment";

// Rate limiters for auth endpoints
const authLimiter = rateLimiter(
  (req) => req.ip || req.connection.remoteAddress || "unknown",
  Number(env.RATE_LIMIT_MAX_REQUESTS?.login || 5),
  Number(env.RATE_LIMIT_WINDOW_MS || 900000) // 15 minutes
);

const authStrictLimiter = rateLimiter(
  (req) => {
    // Stricter limiter for sensitive endpoints
    const email = req.body?.email?.toLowerCase().trim() || "";
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    return email ? `email:${email}|ip:${ip}` : `ip:${ip}`;
  },
  Number(env.RATE_LIMIT_MAX_REQUESTS?.forgotPassword || 3),
  Number(env.RATE_LIMIT_WINDOW_MS || 900000) // 15 minutes
);

const otpLimiter = rateLimiter(
  (req) => {
    // Limit OTP verification attempts by email and IP
    const email = req.body?.email?.toLowerCase().trim() || "";
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    return email ? `email:${email}|ip:${ip}` : `ip:${ip}`;
  },
  Number(env.RATE_LIMIT_MAX_REQUESTS?.verifyOtp || 10),
  Number(env.RATE_LIMIT_WINDOW_MS || 900000) // 15 minutes
);

const router = Router();


/**
 * Google OAuth Routes
 * Handles Google OAuth login and callback
 */
router.get("/google", controller.startGoogleOAuth);
router.get("/google/callback", controller.handleGoogleOAuthCallback);

/**
 * Public Routes
 * No authentication required
 */

/**
 * POST /api/auth/signup
 * Create new user account with email verification
 * Sets HTTP-only cookie with JWT token on success (after email verification)
 */
router.post("/signup", authLimiter, controller.signup);

/**
 * POST /api/auth/verify-email
 * Verify email with OTP code
 * On success: marks email as verified, issues access and refresh tokens
 */
router.post("/verify-email", otpLimiter, controller.verifyEmail);

/**
 * POST /api/auth/resend-otp
 * Resend OTP for email verification or password reset
 * Rate-limited to prevent abuse
 * Always returns success message for security (prevents email enumeration)
 */
router.post("/resend-otp", authStrictLimiter, controller.resendOtp);

/**
 * POST /api/auth/login
 * Authenticate user and start session
 * Requires email to be verified
 * Sets HTTP-only cookie with JWT token on success
 */
router.post("/login", authLimiter, controller.login);

/**
 * POST /api/auth/forgot-password
 * Initiate password reset process
 * Always returns generic response for security (prevents email enumeration)
 * Rate-limited to prevent abuse
 */
router.post("/forgot-password", authStrictLimiter, controller.forgotPassword);

/**
 * POST /api/auth/verify-reset-code
 * Verify password reset OTP code
 * On success: returns short-lived reset token
 */
router.post("/verify-reset-code", otpLimiter, controller.verifyResetCode);

/**
 * POST /api/auth/reset-password
 * Complete password reset process
 * Validates reset token, updates password, revokes all existing sessions
 */
router.post("/reset-password", otpLimiter, controller.resetPassword);

/**
 * POST /api/auth/refresh-token
 * Verify the refresh token cookie and rotate tokens
 * Issues new access and refresh tokens, revokes old refresh token
 */
router.post("/refresh-token", authLimiter, controller.refreshToken);

/**
 * Protected Routes
 * Require valid JWT token in cookie or Authorization header
 */

/**
 * POST /api/auth/logout
 * Clear user session by revoking refresh token and clearing cookies
 * Protected: User must be authenticated
 */
router.post("/logout", protect, controller.logout);

/**
 * GET /api/auth/verify
 * Verify current session and return user data
 * Used by frontend on page load to restore session
 * Protected: User must be authenticated
 */
router.get("/verify", protect, controller.verify);

/**
 * GET /api/users/me
 * Get current user profile
 * Protected: User must be authenticated
 */
router.get("/me", protect, controller.getMe);

/**
 * PATCH /api/users/me
 * Update current user profile
 * Protected: User must be authenticated
 */
router.patch("/me", protect, controller.updateMe);

export default router;