/**
 * Authentication Controller
 * HTTP request handlers for authentication operations
 */

import { Request, Response } from "express";
import * as service from "./authService";
import catchAsync from "../../utils/catchAsync";
import { ApiResponseHandler } from "../../utils/response";
import logger, { logAuthEvent } from "../../utils/logger";
import {
  signupSchema as SignupInput,
  loginSchema as LoginInput,
  verifyEmailSchema as VerifyEmailInput,
  resendOtpSchema as ResendOtpInput,
  forgotPasswordSchema as ForgotPasswordInput,
  verifyResetCodeSchema as VerifyResetCodeInput,
  resetPasswordSchema as ResetPasswordInput
} from "./authValidation";

const normalizeIpAddress = (req: Request): string | undefined => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    const firstIp = forwardedFor[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }

  const socketIp = req.socket.remoteAddress;
  if (socketIp) {
    return socketIp;
  }

  return undefined;
};

/**
 * POST /api/auth/signup
 * Register a new user account
 *
 * Request body:
 *   - full_name: string (max 150 chars)
 *   - email: string (valid email)
 *   - password: string (min 8 chars)
 *   - role: "client" | "professional"
 *   - professional_type?: "digital" | "non_digital" (required if role is professional)
 *   - phone?: string (max 20 chars)
 *   - location?: string (max 100 chars)
 *
 * Response:
 *   - Always returns: { user: { id, email, full_name, role, professional_type, is_email_verified, is_active, onboarding_step, phone, location, created_at, updated_at } }
 *   - Sets no cookies (user not verified yet)
 */
export const signup = catchAsync(async (req: Request, res: Response) => {
  // Extract audit information
  const auditInfo = {
    ipAddress: req.headers["x-forwarded-for"] as string ||
                req.socket.remoteAddress as string ||
                (req.headers["x-real-ip"] as string) ||
                undefined,
    userAgent: req.get("User-Agent") || undefined
  };

  // Validate input using Zod schema
  const parsedBody = SignupInput.parse(req.body);

  // Call service to create user and send OTP
  const result = await service.signup(
    {
      email: parsedBody.email,
      password: parsedBody.password,
      full_name: parsedBody.full_name,
      role: parsedBody.role,
      professional_type: parsedBody.professional_type,
      phone: parsedBody.phone,
      location: parsedBody.location
    },
    auditInfo
  );

  // Return minimal user data (no tokens yet - user must verify email first)
  return ApiResponseHandler.success(
    res,
    { user: result.user },
    "Account created. Check email for verification."
  );
});

/**
 * POST /api/auth/verify-email
 * Verify email with OTP code
 *
 * Request body:
 *   - email: string (valid email)
 *   - otp_code: string (6-digit OTP)
 *
 * Response:
 *   - Success: { accessToken, refreshToken, user }
 *   - Sets HTTP-only cookies
 */
export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  // Extract audit information
  const auditInfo = {
    ipAddress: normalizeIpAddress(req),
    userAgent: req.get("User-Agent") || undefined
  };

  // Validate input using Zod schema
  const parsedBody = VerifyEmailInput.parse(req.body);

  // Call service to verify email
  const result = await service.verifyEmail(
    parsedBody.email,
    parsedBody.otp_code,
    auditInfo
  );

  // Set HTTP-only cookies
  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  return ApiResponseHandler.success(
    res,
    {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user
    },
    "Email verified successfully"
  );
});

/**
 * POST /api/auth/resend-otp
 * Resend OTP for email verification or password reset
 *
 * Request body:
 *   - email: string (valid email)
 *   - purpose: "email_verification" | "password_reset"
 *
 * Response:
 *   - Always returns: { message: "If the email exists in our system, a new OTP has been sent" }
 *   - Rate limited
 */
export const resendOtp = catchAsync(async (req: Request, res: Response) => {
  // Extract audit information
  const auditInfo = {
    ipAddress: normalizeIpAddress(req),
    userAgent: req.get("User-Agent") || undefined
  };

  // Validate input using Zod schema
  const parsedBody = ResendOtpInput.parse(req.body);

  // Call service to resend OTP
  const result = await service.resendOtP(
    parsedBody.email,
    parsedBody.purpose,
    auditInfo
  );

  logger.info("Resend OTP processed", {
  email: parsedBody.email,
  purpose: parsedBody.purpose,
  otpId: result?.otpId ?? "unknown", // OTP ID from service response
  ip: auditInfo.ipAddress,
});

  // Always return generic message to prevent email enumeration
  return ApiResponseHandler.success(
    res,
    { message: "If the email exists in our system, a new OTP has been sent" },
    "OTP resent successfully"
  );
});

/**
 * POST /api/auth/login
 * Login user with email and password
 *
 * Request body:
 *   - email: string (valid email)
 *   - password: string
 *
 * Response:
 *   - Success: { accessToken, refreshToken, user }
 *   - Sets HTTP-only cookies
 *   - If email not verified: returns 403 with EMAIL_NOT_VERIFIED error
 */
export const login = catchAsync(async (req: Request, res: Response) => {
  // Extract audit information
  const auditInfo = {
    ipAddress: normalizeIpAddress(req),
    userAgent: req.get("User-Agent") || undefined
  };

  // Validate input using Zod schema
  const parsedBody = LoginInput.parse(req.body);

  // Call service to login user
  const result = await service.login(
    {
      email: parsedBody.email,
      password: parsedBody.password
    },
    auditInfo
  );

  // Set HTTP-only cookies
  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  return ApiResponseHandler.success(
    res,
    {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user
    },
    "Login successful"
  );
});

/**
 * POST /api/auth/forgot-password
 * Initiate password reset process
 *
 * Request body:
 *   - email: string (valid email)
 *
 * Response:
 *   - Always returns: { message: "If the email exists in our system, a password reset OPT has been sent" }
 *   - Rate limited
 */
export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  // Extract audit information
  const auditInfo = {
    ipAddress: normalizeIpAddress(req),
    userAgent: req.get("User-Agent") || undefined
  };

  // Validate input using Zod schema
  const parsedBody = ForgotPasswordInput.parse(req.body);

  // Call service to initiate password reset
  const result = await service.forgotPassword(
    parsedBody.email,
    auditInfo
  );

  // Always return generic message to prevent email enumeration
  return ApiResponseHandler.success(
    res,
    result,
    "Password reset process initiated"
  );
});

/**
 * POST /api/auth/verify-reset-code
 * Verify password reset OTP code
 *
 * Request body:
 *   - email: string (valid email)
 *   - otp_code: string (6-digit OTP)
 *
 * Response:
 *   - Success: { resetToken }
 *   - Error: Appropriate error response
 */
export const verifyResetCode = catchAsync(async (req: Request, res: Response) => {
  // Extract audit information
  const auditInfo = {
    ipAddress: normalizeIpAddress(req),
    userAgent: req.get("User-Agent") || undefined
  };

  // Validate input using Zod schema
  const parsedBody = VerifyResetCodeInput.parse(req.body);

  // Call service to verify reset code
  const result = await service.verifyResetCode(
    parsedBody.email,
    parsedBody.otp_code,
    auditInfo
  );

  return ApiResponseHandler.success(
    res,
    result,
    "Reset code verified successfully"
  );
});

/**
 * POST /api/auth/reset-password
 * Complete password reset process
 *
* Request body:
 *   - resetToken: string (from verify-reset-code)
 *   - newPassword: string (min 8 chars)
 *
 * Response:
 *   - Success: { message: "Password reset successful" }
 */
export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  // Extract audit information
  const auditInfo = {
    ipAddress: normalizeIpAddress(req),
    userAgent: req.get("User-Agent") || undefined
  };

  // Validate input using Zod schema
  const parsedBody = ResetPasswordInput.parse(req.body);

  // Call service to reset password
  const result = await service.resetPassword(
    parsedBody.reset_token,
    parsedBody.new_password,
    auditInfo
  );

  return ApiResponseHandler.success(
    res,
    result,
    "Password has been successfully reset"
  );
});

/**
 * POST /api/auth/refresh-token
 * Refresh access token using refresh token
 *
 * Request body:
 *   - refreshToken: string (can also be read from HttpOnly cookie)
 *
 * Response:
 *   - Success: { accessToken }
 *   - Sets new accessToken cookie
 *   - Rotates refresh token
 */
export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  // Extract audit information
  const auditInfo = {
    ipAddress: normalizeIpAddress(req),
    userAgent: req.get("User-Agent") || undefined
  };

  // Get refresh token from body or cookie
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

  if (!refreshToken) {
    return ApiResponseHandler.error(
      res,
      "invalid_request",
      "Refresh token is required",
      400
    );
  }

  // Call service to refresh token
  const result = await service.refreshToken(
    refreshToken,
    auditInfo
  );

  // Set new accessToken cookie
  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  // Set new refreshToken cookie (rotation)
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  return ApiResponseHandler.success(
    res,
    { accessToken: result.accessToken },
    "Token refreshed successfully"
  );
});

/**
 * POST /api/auth/logout
 * Logout user by revoking refresh token
 *
 * Request body:
 *   - refreshToken: string (can also be read from HttpOnly cookie)
 *
 * Response:
 *   - Success: { message: "Logged out successfully" }
 *   - Clears cookies
 */
export const logout = catchAsync(async (req: Request, res: Response) => {
  // Extract audit information
  const auditInfo = {
    ipAddress: req.headers["x-forwarded-for"] as string ||
                req.socket.remoteAddress as string ||
                (req.headers["x-real-ip"] as string) ||
                undefined,
    userAgent: req.get("User-Agent") || undefined
  };

  // Get refresh token from body or cookie
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  const userId = req.user?.id; // From auth middleware

  if (!userId) {
    return ApiResponseHandler.error(
      res,
      "unauthorized",
      "User not authenticated",
      401
    );
  }

  if (!refreshToken) {
    return ApiResponseHandler.error(
      res,
      "invalid_request",
      "Refresh token is required",
      400
    );
  }

  // Call service to logout
  await service.logout(
    refreshToken,
    userId,
    auditInfo
  );

  // Clear cookies
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  return ApiResponseHandler.success(
    res,
    { message: "Logged out successfully" },
    "Logout successful"
  );
});

/**
 * POST /api/auth/verify
 * Verify current session and return user data
 *
 * Headers:
 *   - Authorization: Bearer <accessToken>
 *
 * Response:
 *   - Success: { user }
 */
export const verify = catchAsync(async (req: Request, res: Response) => {
  // Extract audit information
  const auditInfo = {
    ipAddress: req.headers["x-forwarded-for"] as string ||
                req.socket.remoteAddress as string ||
                (req.headers["x-real-ip"] as string) ||
                undefined,
    userAgent: req.get("User-Agent") || undefined
  };

  // Get user ID from auth middleware (set by verifyToken middleware)
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(
      res,
      "unauthorized",
      "User not authenticated",
      401
    );
  }

  // Call service to verify session
  const result = await service.verify(
    userId,
    auditInfo
  );

  return ApiResponseHandler.success(
    res,
    result.user,
    "Session verified successfully"
  );
});

/**
 * GET /api/users/me
 * Get current user profile
 *
 * Headers:
 *   - Authorization: Bearer <accessToken>
 *
 * Response:
 *   - Returns user profile data
 */
export const getMe = catchAsync(async (req: Request, res: Response) => {
  // Extract audit information
  const auditInfo = {
    ipAddress: req.headers["x-forwarded-for"] as string ||
                req.socket.remoteAddress as string ||
                (req.headers["x-real-ip"] as string) ||
                undefined,
    userAgent: req.get("User-Agent") || undefined
  };

  // Get user ID from auth middleware
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponseHandler.error(
      res,
      "unauthorized",
      "User not authenticated",
      401
    );
  }

  // Call service to get user profile
  const result = await service.getMe(
    userId,
    auditInfo
  );

  return ApiResponseHandler.success(
    res,
    result.user,
    "User profile retrieved successfully"
  );
});

/**
 * PATCH /api/users/me
 * Update current user profile
 *
 * Headers:
 *   - Authorization: Bearer <accessToken>
 *
 * Request body:
 *   - fullName?: string
 *   - professionalType?: "digital" | "non_digital" (for professionals only)
 *   - phone?: string
 *   - location?: string
 *
 * Response:
 *   - Returns updated user profile data
 */
export const updateMe = catchAsync(async (req: Request, res: Response) => {
  // Extract audit information
  const auditInfo = {
    ipAddress: req.headers["x-forwarded-for"] as string ||
                req.socket.remoteAddress as string ||
                (req.headers["x-real-ip"] as string) ||
                undefined,
    userAgent: req.get("User-Agent") || undefined
  };

  // Get user ID and role from auth middleware
  const userId = req.user?.id;
  const userRole = req.user?.role; // From auth middleware

  if (!userId) {
    return ApiResponseHandler.error(
      res,
      "unauthorized",
      "User not authenticated",
      401
    );
  }

  // Validate that only professionals can update professional_type
  const updates: any = {};

  if (req.body.fullName !== undefined) {
    updates.fullName = req.body.fullName;
  }

  if (req.body.professionalType !== undefined) {
    // Only professionals can update professional_type
    if (userRole !== "professional") {
      return ApiResponseHandler.error(
        res,
        "forbidden",
        "Only professionals can update professional type",
        403
      );
    }
    updates.professionalType = req.body.professionalType;
  }

  if (req.body.phone !== undefined) {
    updates.phone = req.body.phone;
  }

  if (req.body.location !== undefined) {
    updates.location = req.body.location;
  }

  // If no valid updates provided
  if (Object.keys(updates).length === 0) {
    return ApiResponseHandler.error(
      res,
      "bad_request",
      "No valid fields to update",
      400
    );
  }

  // Log audit event for profile update attempt
  await logAuthEvent(
    userId,
    "profile_update_attempt",
    {
      ipAddress: auditInfo.ipAddress,
      user_agent: auditInfo.userAgent,
      success: true, // We'll log the actual result after the update
      updates: Object.keys(updates)
    }
  );

  // Update user in database using service
  const updatedUser = await service.updateMe(
    userId,
    updates,
    auditInfo
  );

  if (!updatedUser) {
    // Log audit event for failed profile update
    await logAuthEvent(
      userId,
      "profile_update_failed",
      {
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: false,
        reason: "database_update_failed",
        updates: Object.keys(updates)
      }
    );
    return ApiResponseHandler.error(
      res,
      "server_error",
      "Failed to update user",
      500
    );
  }

  // Log audit event for successful profile update
  await logAuthEvent(
    userId,
    "profile_update_success",
    {
      ipAddress: auditInfo.ipAddress,
      user_agent: auditInfo.userAgent,
      success: true,
      updates: Object.keys(updates)
    }
  );

  // Return updated user data
  return ApiResponseHandler.success(
    res,
    {
      user: updatedUser.user
    },
    "User updated successfully"
  );
});