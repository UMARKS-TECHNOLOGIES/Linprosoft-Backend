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
 * First name validation
 */
const firstNameSchema = nonEmptyString("First name")
  .max(VALIDATION_CONSTRAINTS.NAME_MAX, `First name must not exceed ${VALIDATION_CONSTRAINTS.NAME_MAX} characters`);

/**
 * Last name validation
 */
const lastNameSchema = nonEmptyString("Last name")
  .max(VALIDATION_CONSTRAINTS.NAME_MAX, `Last name must not exceed ${VALIDATION_CONSTRAINTS.NAME_MAX} characters`);

/**
 * Company name validation (required for employers)
 */
const compNameSchema = trimmedString()
  .min(VALIDATION_CONSTRAINTS.COMPANY_MIN, `Company name must be at least ${VALIDATION_CONSTRAINTS.COMPANY_MIN} characters`)
  .max(VALIDATION_CONSTRAINTS.COMPANY_MAX, `Company name must not exceed ${VALIDATION_CONSTRAINTS.COMPANY_MAX} characters`)
  .optional();

/**
 * Signup validation schema
 * Validates signup request body
 */
export const signupSchema = z
  .object({
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: passwordSchema,
    userType: z.enum(["professional", "employer"], "User type must be 'professional' or 'employer'"),
    compName: compNameSchema,
    phone: trimmedString().max(VALIDATION_CONSTRAINTS.PHONE_MAX, "Phone number is invalid").optional(),
    location: trimmedString().max(VALIDATION_CONSTRAINTS.LOCATION_MAX, "Location is invalid").optional(),
  })
  // Validate passwords match
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  })
  // Validate employer has company name
  .refine((data) => data.userType !== "employer" || !!data.compName?.trim(), {
    message: "Company name is required for employers",
    path: ["compName"],
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
 * Type exports for use in controllers/services
 * These are inferred from the schemas
 */
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
