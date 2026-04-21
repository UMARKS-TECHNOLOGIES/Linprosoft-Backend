/**
 * Authentication validation schemas using Zod
 * Validates all auth request bodies before they reach controllers
 */

import { z } from "zod";

/**
 * Email validation - used across multiple schemas
 */
const emailSchema = z
  .string()
  .email("Invalid email address")
  .toLowerCase()
  .trim();

/**
 * Password validation schema
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

/**
 * First name validation
 */
const firstNameSchema = z
  .string()
  .min(1, "First name is required")
  .max(50, "First name must not exceed 50 characters")
  .trim();

/**
 * Last name validation
 */
const lastNameSchema = z
  .string()
  .min(1, "Last name is required")
  .max(50, "Last name must not exceed 50 characters")
  .trim();

/**
 * Company name validation (required for employers)
 */
const compNameSchema = z
  .string()
  .min(2, "Company name must be at least 2 characters")
  .max(100, "Company name must not exceed 100 characters")
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
    passwordConfirm: z.string().min(1, "Password confirmation required"),
    userType: z.enum(["professional", "employer"], {
      errorMap: () => ({ message: "User type must be 'professional' or 'employer'" }),
    }),
    compName: compNameSchema,
    phone: z.string().optional(),
    location: z.string().optional(),
  })
  // Validate passwords match
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  })
  // Validate employer has company name
  .refine((data) => {
    if (data.userType === "employer" && !data.compName) {
      return false;
    }
    return true;
  }, {
    message: "Company name is required for employers",
    path: ["compName"],
  });

/**
 * Login validation schema
 * Validates login request body
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password required"),
});

/**
 * Type exports for use in controllers/services
 * These are inferred from the schemas
 */
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
