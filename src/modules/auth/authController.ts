import { Request, Response } from "express";
import * as service from "./authService";
import catchAsync from "../../utils/catchAsync";
import { ApiResponseHandler } from "../../utils/response";
import { signupSchema, loginSchema } from "./authValidation";
import { AuthRequest } from "../../types/authRequest";
import * as authRepository from "./authRepository";
import logger from "../../utils/logger";
import { env } from "../../config/environment";

/**
 * Cookie configuration
 * We issue two cookies:
 * - accessToken: short-lived access token (HttpOnly)
 * - refreshToken: longer-lived refresh token (HttpOnly, narrower path)
 * For backward compatibility we also set a legacy `token` cookie equal to accessToken.
 */
const baseCookie = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

const ACCESS_TOKEN_MAX_AGE_MS = env.ACCESS_TOKEN_EXPIRES_SECONDS * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000;

const accessCookieConfig = { ...baseCookie, maxAge: ACCESS_TOKEN_MAX_AGE_MS };
const refreshCookieConfig = { ...baseCookie, maxAge: REFRESH_TOKEN_MAX_AGE_MS, path: "/api/auth/refresh" };

/**
 * POST /api/auth/signup
 * Create a new user account (professional or employer)
 * 
 * Request body:
 *   - email: string (valid email)
 *   - password: string (min 8 chars)
 *   - passwordConfirm: string (must match password)
 *   - firstName: string
 *   - lastName: string
 *   - userType: "professional" | "employer"
 *   - compName?: string (required if userType is "employer")
 *   - phone?: string
 *   - location?: string
 * 
 * Response: 
 *   - Sets HTTP-only cookie with JWT token
 *   - Returns user data (without password)
 * 
 * Errors:
 *   - 400: Validation error
 *   - 409: Email already exists
 *   - 500: Server error
 */
export const signup = catchAsync(async (req: Request, res: Response) => {
  // Step 1: Validate input against Zod schema
  const input = signupSchema.parse(req.body);

  // Step 2: Call service to create user (handles password hashing, duplicate check)
  const result = await service.signup(input);

  // Step 2.5: Log successful signup
  logger.info("User signup successful", {
    userId: result.user.id,
    email: result.user.email,
    userType: result.user.userType,
  });

  // Step 3: Set HTTP-only cookies: access + refresh. Also set legacy `token` cookie for compatibility.
  res.cookie("accessToken", result.accessToken, accessCookieConfig);
  res.cookie("refreshToken", result.refreshToken, refreshCookieConfig);
  res.cookie("token", result.accessToken, accessCookieConfig);

  // Step 4: Return standardized response with user data
  // User object already filtered by repository (no password exposed)
  return ApiResponseHandler.created(res, {
    user: result.user,
  }, "Account created successfully");
});

/**
 * POST /api/auth/login
 * Authenticate user and create session
 * 
 * Request body:
 *   - email: string
 *   - password: string
 * 
 * Response:
 *   - Sets HTTP-only cookie with JWT token
 *   - Returns user data (without password)
 * 
 * Errors:
 *   - 400: Validation error
 *   - 401: Invalid credentials
 *   - 500: Server error
 */
export const login = catchAsync(async (req: Request, res: Response) => {
  // Step 1: Validate input against Zod schema
  const input = loginSchema.parse(req.body);

  // Step 2: Call service to verify credentials (handles password comparison, user lookup)
  const result = await service.login(input);

  // Step 2.5: Log successful login
  logger.info("User login successful", {
    userId: result.user.id,
    email: result.user.email,
    ip: req.ip,
  });

  // Step 3: Set HTTP-only cookies: access + refresh. Also set legacy `token` cookie for compatibility.
  res.cookie("accessToken", result.accessToken, accessCookieConfig);
  res.cookie("refreshToken", result.refreshToken, refreshCookieConfig);
  res.cookie("token", result.accessToken, accessCookieConfig);

  // Step 4: Return standardized response with user data
  // User object already filtered by repository (no password exposed)
  return ApiResponseHandler.success(res, {
    user: result.user,
  }, "Login successful", 200);
});

/**
 * POST /api/auth/logout
 * Clear user session by removing token cookie
 * 
 * Response:
 *   - Clears HTTP-only token cookie
 *   - Returns success message
 * 
 * Note: This endpoint is typically called from frontend
 * Clearing cookie here provides double confirmation for security
 */
export const logout = catchAsync(async (req: AuthRequest, res: Response) => {
  // Step 0: Extract userId from request before clearing cookie
  const userId = req.user?.id;

  // Step 1: Clear cookies
  res.clearCookie("accessToken", accessCookieConfig as any);
  res.clearCookie("refreshToken", refreshCookieConfig as any);
  res.clearCookie("token", accessCookieConfig as any);

  // Step 1.5: Log logout event
  if (userId) {
    logger.info("User logged out", {
      userId,
    });
  }

  // Step 2: Return standardized response
  return ApiResponseHandler.success(res, undefined, "Logged out successfully", 200);
});

/**
 * POST /api/auth/refresh
 * Verify the refresh token cookie and rotate tokens (issue new access + refresh tokens).
 * This endpoint is public and only requires the refresh cookie.
 */
export const refresh = catchAsync(async (req: Request, res: Response) => {
  const refreshCookie = req.cookies?.refreshToken;

  if (!refreshCookie) {
    return ApiResponseHandler.error(res, "authentication_error", "No refresh token provided", 401);
  }

  try {
    const { verifyRefreshToken, createAccessToken, createRefreshToken } = await import("../../utils/jwt");
    const decoded = verifyRefreshToken(refreshCookie) as any;

    // Issue new tokens
    const accessToken = createAccessToken({ id: decoded.id, email: decoded.email, userType: decoded.userType });
    const newRefreshToken = createRefreshToken({ id: decoded.id, email: decoded.email, userType: decoded.userType });

    // Set cookies
    res.cookie("accessToken", accessToken, accessCookieConfig);
    res.cookie("refreshToken", newRefreshToken, refreshCookieConfig);
    res.cookie("token", accessToken, accessCookieConfig);

    return ApiResponseHandler.success(res, undefined, "Token refreshed", 200);
  } catch (err: any) {
    return ApiResponseHandler.error(res, "authentication_error", "Invalid refresh token", 401);
  }
});

/**
 * GET /api/auth/verify
 * Verify current session and return user data
 * Called by frontend on page load to restore user session
 * 
 * Protected: Requires valid JWT token in cookie or Authorization header
 * Token is attached to request by authMiddleware as req.user
 * 
 * Response:
 *   - Returns current user data (from token payload)
 *   - User can use this to restore session after page refresh
 * 
 * Errors:
 *   - 401: No valid token or token expired
 *   - 500: Server error
 * 
 * Frontend Usage:
 *   - Call on app mount to check if user is logged in
 *   - If successful, restore user state from response
 *   - If 401, user is not authenticated, redirect to login
 */
export const verify = catchAsync(async (req: AuthRequest, res: Response) => {
  // Step 1: Get userId from JWT payload (attached by authMiddleware as req.user.id)
  // The protect middleware has already verified the token and set req.user
  const userId = req.user?.id;

  // Step 2: Validate that userId exists (should always exist if protect ran)
  if (!userId) {
    logger.warn("Session verification failed - user not found in token");
    return ApiResponseHandler.error(res, "authentication_error", "User not found in token", 401);
  }

  // Step 3: Fetch fresh user data from database using userId
  // This ensures we have latest user info (in case it was updated elsewhere)
  const user = await authRepository.findById(userId);

  // Step 3.5: Log successful session verification
  if (user) {
    logger.info("Session verified", {
      userId: user.id,
      email: user.email,
    });
  }

  // Step 4: Return standardized response with current user data
  // Token still valid (verified by middleware), so session is active
  return ApiResponseHandler.success(res, {
    user,
  }, "Session verified", 200);
});
