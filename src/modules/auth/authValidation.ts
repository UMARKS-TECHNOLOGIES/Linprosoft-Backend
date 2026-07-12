/**
 * Authentication validation schemas using Zod
 * Validates all auth request bodies before they reach controllers
 */

import { z } from "zod";

// Validation constraints
const VALIDATION_CONSTRAINTS = {
  PASSWORD_MIN: 8,
  NAME_MIN: 1,
  NAME_MAX: 50,
  COMPANY_MIN: 2,
  COMPANY_MAX: 100,
  PHONE_MAX: 20,
  LOCATION_MAX: 100,
  FULL_NAME_MAX: 150,
} as const;

/**
 * Reusable validators
 */
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
 * Password validation schema
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
const passwordSchema = nonEmptyString("Password")
  .min(VALIDATION_CONSTRAINTS.PASSWORD_MIN, `Password must be at least ${VALIDATION_CONSTRAINTS.PASSWORD_MIN} characters`)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

/**
 * Full name validation
 */
const fullNameSchema = nonEmptyString("Full name")
  .max(VALIDATION_CONSTRAINTS.FULL_NAME_MAX, `Full name must not exceed ${VALIDATION_CONSTRAINTS.FULL_NAME_MAX} characters`);

/**
 * Role validation
 */
const roleSchema = z.enum(["client", "professional"], "Role must be 'client' or 'professional'");

/**
 * Professional type validation
 */
const professionalTypeSchema = z.enum(["digital", "non_digital"] as const).optional();

/**
 * Signup validation schema
 * Validates signup request body
 */
export const signupSchema = z
  .object({
    full_name: fullNameSchema,
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: passwordSchema,
    role: roleSchema,
    professional_type: professionalTypeSchema,
    phone: trimmedString().max(VALIDATION_CONSTRAINTS.PHONE_MAX, "Phone number is invalid").optional(),
    location: trimmedString().max(VALIDATION_CONSTRAINTS.LOCATION_MAX, "Location is invalid").optional(),
  })
  // Validate passwords match
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  })
  // Validate professional_type is required for professionals
  .refine((data) => data.role !== "professional" || !!data.professional_type, {
    message: "Professional type is required for professionals",
    path: ["professional_type"],
  });

/**
 * Login validation schema
 * Validates login request body
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: nonEmptyString("Password"),
});

/**
 * Verify email validation schema
 * Validates verify email request body
 */
export const verifyEmailSchema = z.object({
  email: emailSchema,
  otp_code: z.string().length(6, "OTP code must be 6 digits").regex(/^\d+$/, "OTP code must contain only digits"),
});

/**
 * Resend OTP validation schema
 * Validates resend OTP request body
 */
export const resendOtpSchema = z.object({
  email: emailSchema,
  purpose: z.enum(["email_verification", "password_reset"] as const, "Purpose must be 'email_verification' or 'password_reset'"),
});

/**
 * Forgot password validation schema
 * Validates forgot password request body
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Verify reset code validation schema
 * Validates verify reset code request body
 */
export const verifyResetCodeSchema = z.object({
  email: emailSchema,
  otp_code: z.string().length(6, "OTP code must be 6 digits").regex(/^\d+$/, "OTP code must contain only digits"),
});

/**
 * Refresh token validation schema
 * Validates refresh token request body
 */
export const refreshTokenSchema = z.object({
  refreshToken: nonEmptyString("Refresh token")
});

/**
 * Reset password validation schema
 * Validates reset password request body
 */
export const resetPasswordSchema = z.object({
  reset_token: nonEmptyString("Reset token"),
  new_password: passwordSchema,
});

/**
 * Type exports for use in controllers/services
 * These are inferred from the schemas
 */
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;