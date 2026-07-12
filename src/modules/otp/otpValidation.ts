/**
 * OTP validation schemas using Zod
 * Validates all OTP request bodies before they reach controllers
 */

import { z } from "zod";
import { otpPurposeEnum } from "./otpTypes";

// Reusable validators
const trimmedString = () => z.string().trim();
const nonEmptyString = (fieldName: string) =>
  trimmedString().min(1, `${fieldName} cannot be empty or whitespace`);

/**
 * Email validation - used across multiple schemas
 */
const emailSchema = nonEmptyString("Email")
  .email("Invalid email address")
  .toLowerCase();

/**
 * OTP code validation
 * Requirements:
 * - Exactly 6 digits
 * - Numeric only
 */
const otpCodeSchema = nonEmptyString("OTP Code")
  .length(6, "OTP code must be exactly 6 digits")
  .regex(/^[0-9]+$/, "OTP code must contain only digits");

/**
 * Verify email request schema
 * Used for verifying email with OTP
 */
export const verifyEmailSchema = z.object({
  email: emailSchema,
  otp_code: otpCodeSchema,
});

/**
 * Resend OTP request schema
 * Used for requesting a new OTP
 */
export const resendOtpSchema = z.object({
  email: emailSchema,
  purpose: otpPurposeEnum,
});

/**
 * Forgot password request schema
 * Used for initiating password reset
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Verify reset code request schema
 * Used for verifying password reset OTP
 */
export const verifyResetCodeSchema = z.object({
  email: emailSchema,
  otp_code: otpCodeSchema,
});

/**
 * Reset password request schema
 * Used for completing password reset
 */
export const resetPasswordSchema = z.object({
  reset_token: nonEmptyString("Reset Token"),
  new_password: nonEmptyString("New Password")
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
});

/**
 * Type exports for use in controllers/services
 * These are inferred from the schemas
 */
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;