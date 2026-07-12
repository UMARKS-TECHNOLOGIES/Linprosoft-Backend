import pool from "../../config/db";
import { OtpPurpose, OtpRow, OtpResponseDTO, toOtpResponseDTO } from "./otpTypes";

/**
 * Update an existing OTP record
 * Used for resending OTP or updating properties
 *
 * @param otpId - OTP ID
 * @param updates - Object containing fields to update
 * @returns Updated OTP as DTO
 */
export const updateOtp = async (
  otpId: string,
  updates: Partial<{
    codeHash: string;
    expiresAt: Date;
    attempts: number;
  }>
): Promise<OtpResponseDTO> => {
  try {
    // Build dynamic SET clause based on provided updates
    const setClauses = [];
    const values: any[] = [];
    let index = 1;

    if (updates.codeHash !== undefined) {
      setClauses.push(`code_hash = $${index++}`);
      values.push(updates.codeHash);
    }

    if (updates.expiresAt !== undefined) {
      setClauses.push(`expires_at = $${index++}`);
      values.push(updates.expiresAt);
    }

    if (updates.attempts !== undefined) {
      setClauses.push(`attempts = $${index++}`);
      values.push(updates.attempts);
    }

    if (setClauses.length === 0) {
      // No updates to make, return current OTP
      const otp = await findOtpById(otpId);
      if (!otp) throw new Error(`OTP not found with id: ${otpId}`);
      return toOtpResponseDTO(otp);
    }

    // Add ID for WHERE clause
    values.push(otpId);

    const query = `
      UPDATE otp_codes
      SET ${setClauses.join(", ")}
      WHERE id = $${index}
      RETURNING id, user_id, purpose, attempts, max_attempts, expires_at, consumed_at, created_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`OTP not found with id: ${otpId}`);
    }

    const otp: OtpRow = result.rows[0];
    return toOtpResponseDTO(otp);
  } catch (error) {
    console.error("Database error in updateOtp:", error);
    throw error;
  }
};

/**
 * Delete OTPs for a user and purpose
 * Used during password reset cleanup
 *
 * @param userId - User ID
 * @param purpose - OTP purpose
 */
export const deleteOtpsByUserIdAndPurpose = async (
  userId: string,
  purpose: OtpPurpose
): Promise<void> => {
  try {
    const query = `
      DELETE FROM otp_codes
      WHERE user_id = $1 AND purpose = $2
    `;

    await pool.query(query, [userId, purpose]);
  } catch (error) {
    console.error("Database error in deleteOtpsByUserIdAndPurpose:", error);
    throw error;
  }
};

/**
 * Find OTP by ID
 * Used to fetch a single OTP record by its ID
 *
 * @param otpId - OTP ID
 * @returns OTP row or null if not found
 */
export const findOtpById = async (otpId: string): Promise<OtpRow | null> => {
  try {
    const query = `
      SELECT id, user_id, purpose, attempts, max_attempts, expires_at, consumed_at, created_at
      FROM otp_codes
      WHERE id = $1
    `;

    const result = await pool.query(query, [otpId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error("Database error in findOtpById:", error);
    throw error;
  }
};

/**
 * Create a new OTP record
 * Used when generating a new OTP for verification or password reset
 *
 * @param userId - User ID
 * @param purpose - OTP purpose (email_verification or password_reset)
 * @param codeHash - Hashed OTP code
 * @param expiresAt - Expiration timestamp
 * @returns Created OTP as DTO
 */
export const createOtp = async (
  userId: string,
  purpose: OtpPurpose,
  codeHash: string,
  expiresAt: Date
): Promise<OtpResponseDTO> => {
  try {
    const query = `
      INSERT INTO otp_codes (
        user_id, purpose, code_hash, attempts, max_attempts, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, purpose, attempts, max_attempts, expires_at, consumed_at, created_at
    `;

    const result = await pool.query(query, [
      userId,
      purpose,
      codeHash,
      0, // attempts - start at 0
      5, // max_attempts - default from config, but we can hardcode or import from config
      expiresAt
    ]);

    if (result.rows.length === 0) {
      throw new Error('Failed to create OTP');
    }

    const otp: OtpRow = result.rows[0];
    return toOtpResponseDTO(otp);
  } catch (error) {
    console.error("Database error in createOtp:", error);
    throw error;
  }
};

/**
 * Find OTP by user ID and purpose
 * Returns the most recent OTP (by created_at) for the given user and purpose
 *
 * @param userId - User ID
 * @param purpose - OTP purpose
 * @returns OTP DOT or null if not found
 */
export const findOtpByUserIdAndPurpose = async (
  userId: string,
  purpose: OtpPurpose
): Promise<OtpResponseDTO | null> => {
  try {
    const query = `
      SELECT id, user_id, purpose, attempts, max_attempts, expires_at, consumed_at, created_at
      FROM otp_codes
      WHERE user_id = $1 AND purpose = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [userId, purpose]);

    if (result.rows.length === 0) {
      return null;
    }

    const otp: OtpRow = result.rows[0];
    return toOtpResponseDTO(otp);
  } catch (error) {
    console.error("Database error in findOtpByUserIdAndPurpose:", error);
    throw error;
  }
};

/**
 * Find the latest unconsumed OTP for a user and purpose
 * Returns the most recent OTP that has not been consumed (consumed_at IS NULL)
 *
 * @param userId - User ID
 * @param purpose - OTP purpose
 * @returns OTP DTO or null if not found
 */
export const findLatestUnconsumedOtp = async (
  userId: string,
  purpose: OtpPurpose
): Promise<OtpResponseDTO | null> => {
  try {
    const query = `
      SELECT id, user_id, purpose, attempts, max_attempts, expires_at, consumed_at, created_at
      FROM otp_codes
      WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [userId, purpose]);

    if (result.rows.length === 0) {
      return null;
    }

    const otp: OtpRow = result.rows[0];
    return toOtpResponseDTO(otp);
  } catch (error) {
    console.error("Database error in findLatestUnconsumedOtp:", error);
    throw error;
  }
};

/**
 * Consume OTP (mark as used)
 * Sets consumed_at to the current timestamp
 *
 * @param otpId - OTP ID
 */
export const consumeOtp = async (otpId: string): Promise<void> => {
  try {
    const query = `
      UPDATE otp_codes
      SET consumed_at = NOW()
      WHERE id = $1
    `;

    await pool.query(query, [otpId]);
  } catch (error) {
    console.error("Database error in consumeOtp:", error);
    throw error;
  }
};

/**
 * Increment OTP attempts
 * Increments the attempts counter by 1
 *
 * @param otpId - OTP ID
 */
export const incrementOtpAttempts = async (otpId: string): Promise<void> => {
  try {
    const query = `
      UPDATE otp_codes
      SET attempts = attempts + 1
      WHERE id = $1
    `;

    await pool.query(query, [otpId]);
  } catch (error) {
    console.error("Database error in incrementOtpAttempts:", error);
    throw error;
  }
};