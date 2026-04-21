import { Router } from "express";
import * as controller from "./authController";
import { protect } from "../../middleware/authMiddleware";

const router = Router();

/**
 * Public Routes
 * No authentication required
 */

/**
 * POST /api/auth/signup
 * Create new user account
 * Sets HTTP-only cookie with JWT token on success
 */
router.post("/signup", controller.signup);

/**
 * POST /api/auth/login
 * Authenticate user and start session
 * Sets HTTP-only cookie with JWT token on success
 */
router.post("/login", controller.login);

/**
 * Protected Routes
 * Require valid JWT token in cookie or Authorization header
 */

/**
 * POST /api/auth/logout
 * Clear user session by removing token cookie
 * Protected: User must be authenticated
 */
router.post("/logout", protect, controller.logout);

/**
 * GET /api/auth/verify
 * Verify current session and return user data
 * Used by frontend on page load to restore session
 * Protected: User must be authenticated
 * 
 * Response: Returns current user data if session is valid
 */
router.get("/verify", protect, controller.verify);

export default router;