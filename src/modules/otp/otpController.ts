/**
 * OTP Controller
 * HTTP request handlers for OTP operations
 */

import { Request, Response } from "express";
import * as otpService from "./otpService";
import catchAsync from "../../utils/catchAsync";
import { ApiResponseHandler } from "../../utils/response";
import * as otpValidation from "./otpValidation";
import { findByEmail } from "../auth/authRepository";

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

  // Step 2: Find user by email to get userId
  const user = await findByEmail(input.email);
  if (!user) {
    // For security, always return success message even if email doesn't exist
    // This prevents email enumeration attacks
    return ApiResponseHandler.success(
      res,
      null,
      "If the email exists in our system and the OTP is correct, your email has been verified"
    );
  }

  // Step 3: Verify the OTP code
  const isValid = await otpService.verifyOtP(
    user.id,
    "email_verification",
    input.otp_code,
    {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    }
  );

  // Step 4: Return appropriate response
  if (isValid) {
    return ApiResponseHandler.success(
      res,
      null,
      "Email verified successfully"
    );
  } else {
    return ApiResponseHandler.error(
      res,
      "invalid_otp",
      "Invalid or expired OTP code",
      400
    );
  }
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

  // Step 2: Find user by email to get userId
  const user = await findByEmail(input.email);
  if (!user) {
    // For security, always return success message even if email doesn't exist
    // This prevents email enumeration attacks
    return ApiResponseHandler.success(
      res,
      null,
      "If the email exists in our system, a new OTP has been sent"
    );
  }

  // Step 3: Resend OTP
  await otpService.resendOtP(
    user.id,
    input.email,
    input.purpose
  );

  // Step 4: Always return generic success message for security
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

  // Step 2: Find user by email to get userId
  const user = await findByEmail(input.email);
  if (!user) {
    // For security, always return success message even if email doesn't exist
    // This prevents email enumeration attacks
    return ApiResponseHandler.success(
      res,
      null,
      "If the email exists in our system, a password reset OTP has been sent"
    );
  }

  // Step 3: Generate and send OTP
  await otpService.generateAndSendOtP(
    user.id,
    input.email,
    "password_reset"
  );

  // Step 4: Always return generic success message for security
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

  // Step 2: Find user by email to get userId
  const user = await findByEmail(input.email);
  if (!user) {
    // For security, always return success message even if email doesn't exist
    // This prevents email enumeration attacks
    return ApiResponseHandler.success(
      res,
      { resetToken: "placeholder-reset-token", email: input.email },
      "Reset code verification endpoint - implementation pending"
    );
  }

  // Step 3: Verify the OTP code
  const isValid = await otpService.verifyOtP(
    user.id,
    "password_reset",
    input.otp_code,
    {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    }
  );

  // Step 4: Return appropriate response
  if (isValid) {
    // In a real implementation, we would generate and return a reset token
    // For now, returning a placeholder
    return ApiResponseHandler.success(
      res,
      { resetToken: "valid-reset-token", email: input.email },
      "Reset code verified successfully"
    );
  } else {
    return ApiResponseHandler.error(
      res,
      "invalid_otp",
      "Invalid or expired OTP code",
      400
    );
  }
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
  const input = otpValidation.resetPasswordSchema.parse(req.body);

  const resetToken = await otpService.validateResetToken(input.reset_token);
  if (!resetToken) {
    return ApiResponseHandler.error(
      res,
      "invalid_reset_token",
      "Invalid or expired reset token",
      400
    );
  }

  await otpService.resetPassword(resetToken.userId, input.new_password);

  return ApiResponseHandler.success(
    res,
    null,
    "Password reset successfully"
  );
});