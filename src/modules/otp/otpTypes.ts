/**
 * OTP-related types
 */

import { z } from "zod";

/**
 * OTP Purpose - distinguishes between email verification and password reset
 */
export const otpPurposeEnum = z.enum([
  "email_verification",
  "password_reset"
]);

export type OtpPurpose = z.infer<typeof otpPurposeEnum>;

/**
 * OTP Entity - Represents an OTP record in the database
 */
export interface OtpEntity {
  id: string; // UUID
  userId: string; // UUID
  codeHash: string; // Hashed OTP (never plaintext)
  purpose: OtpPurpose;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

/**
 * OTP Database Row - Matches the database column names (snake_case)
 */
export interface OtpRow {
  id: string;
  user_id: string;
  code_hash: string;
  purpose: OtpPurpose;
  attempts: number;
  max_attempts: number;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

/**
 * OTP Response DTO - Safe data for API responses
 */
export interface OtpResponseDTO {
  id: string;
  userId: string;
  purpose: OtpPurpose;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  createdAt: Date;
  // Note: codeHash is never returned in responses for security
}

/**
 * Mapper function from DB row to API DTO
 */
export const toOtpResponseDTO = (row: OtpRow): OtpResponseDTO => ({
  id: row.id,
  userId: row.user_id,
  purpose: row.purpose,
  attempts: row.attempts,
  maxAttempts: row.max_attempts,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
});

/**
 * Generate a numeric OTP code of specified length
 * @param length - Length of the OTP code (default: 6)
 * @returns Random numeric string
 */
export const generateOtPCode = (length: number = 6): string => {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
};