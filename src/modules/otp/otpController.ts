/**
 * OTP Controller
 * HTTP request handlers for OTP operations
 */

import { Request, Response } from "express";
import * as otpService from "./otpService";
import catchAsync from "../../utils/catchAsync";
import { ApiResponseHandler } from "../../utils/response";
import * as otpValidation from "./otpValidation";
import logger from "../../utils/logger";

/**
 * POST /api/auth/verify-email
 * Verify email with OTP code
 *
 * Request body:
 *   - email: string (valid email)
 *   - otp_code: string (6-digit OTP)
 *
 * Response:
 *   - Success: Returns success message
 *   - Error: Appropriate error response
 */
export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  // Step 1: Validate input against Zod schema
  const input = otpValidation.verifyEmailSchema.parse(req.body);

  // Step 2: Verify OTP
  // Note: This implementation needs to be updated to work with email instead of userId
  // For now, returning placeholder - actual implementation would:
  // 1. Look up user by email
  // 2. Verify the OTP for email_verification purpose
  // 3. Mark email as verified and generate tokens

  return ApiResponseHandler.success(
    res,
    null,
    "Email verification endpoint - implementation pending"
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
 *   - Always returns success message for security (prevents email enumeration)
 */
export const resendOtp = catchAsync(async (req: Request, res: Response) => {
  // Step 1: Validate input against Zod schema
  const input = otpValidation.resendOtpSchema.parse(req.body);

  // Step 2: For security, always return success (even if email doesn't exist)
  // In a real implementation, we would:
  // 1. Look up user by email
  // 2. If user exists, generate and send new OTP
  // 3. Always return the same message to prevent email enumeration

  try {
    // Attempt to resend OTP (will fail silently if user doesn't exist)
    // Note: This would need to be updated to work with email lookup
    await otpService.resendOtP(
      "", // Would need userId from email lookup
      req.body.email,
      input.purpose
    );
  } catch (error) {
    // Ignore errors for security - always return success
    logger.warn(`Error in resendOtp (intentionally ignored for security): ${error.message}`);
  }

  // Step 3: Always return generic success message
  return ApiResponseHandler.success(
    res,
    null,
    "If the email exists in our system, a new OTP has been sent"
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
 *   - Always returns success message for security (prevents email enumeration)
 */
export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  // Step 1: Validate input against Zod schema
  const input = otpValidation.forgotPasswordSchema.parse(req.body);

  // Step 2: For security, always return success (even if email doesn't exist)
  // In a real implementation, we would:
  // 1. Look up user by email
  // 2. If user exists, generate and send password reset OTP
  // 3. Always return the same message to prevent email enumeration

  try {
    // Attempt to send password reset OTP (will fail silently if user doesn't exist)
    await otpService.generateAndSendOtP(
      "", // Would need userId from email lookup
      req.body.email,
      "password_reset"
    );
  } catch (error) {
    // Ignore errors for security - always return success
    logger.warn(`Error in forgotPassword (intentionally ignored for security): ${error.message}`);
  }

  // Step 3: Always return generic success message
  return ApiResponseHandler.success(
    res,
    null,
    "If the email exists in our system, a password reset OTP has been sent"
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
   *   - Success: Returns reset token for password reset
   *   - Error: Appropriate error response
   */
  export const verifyResetCode = catchAsync(async (req: Request, res: Response) => {
    // Step 1: Validate input against Zod schema
    const input = otpValidation.verifyResetCodeSchema.parse(req.body);

    // Step 2: Verify OTP
    // Note: This would need to be implemented to work with email lookup
    // Actual implementation would:
    // 1. Look up user by email
    // 2. Verify the OTP for password_reset purpose
    // 3. Generate and return a reset token

    return ApiResponseHandler.success(
      res,
      { resetToken: "placeholder-reset-token" },
      "Reset code verification endpoint - implementation pending"
    );
  });

  /**
   * POST /api/auth/reset-password
   * Complete password reset process
   *
   * Request body:
   *   - reset_token: string (from verify-reset-code response)
   *   - new_password: string (must meet password requirements)
   *
   * Response:
   *   - Success: Returns success message
   *   - Error: Appropriate error response
   */
  export const resetPassword = catchAsync(async (req: Request, res: Response) => {
    // Step 1: Validate input against Zod schema
    const input = otpValidation.resetPasswordSchema.parse(req.body);

    // Step 2: Process reset (placeholder implementation)
    // Actual implementation would:
    // 1. Validate the reset token
    // 2. Update the user's password
    // 3. Invalidate existing sessions

    return ApiResponseHandler.success(
      res,
      null,
      "Password reset endpoint - implementation pending"
    );
  });