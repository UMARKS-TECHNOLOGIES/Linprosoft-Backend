/**
 * Authentication Repository
 * Data access layer for authentication operations
 * Handles all direct database queries for auth module
 */

import pool from "../../config/db";
import { createHash } from "crypto";
import { UserRow, UserResponseDTO } from "../../types/userTypes";

const hashToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

/**
 * Find user by email
 * Used during login and signup validation
 *
 * @param email - User email address
 * @returns Full user object with password (for comparison) or null if not found
 */
export const findByEmail = async (email: string): Promise<UserRow | null> => {
  try {
    // Note: Updated to match new schema with phone and location columns
    const query = `
      SELECT id, email, password_hash, full_name, auth_provider,
             role, professional_type, is_email_verified, is_active,
             onboarding_step, phone, location, created_at, updated_at, google_id
      FROM users
      WHERE email = $1
    `;
    const result = await pool.query(query, [email.toLowerCase()]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Database error in findByEmail:", error);
    throw error;
  }
};

/**
 * Create new user
 * Used during signup process
 *
 * @param email - User email
 * @param password - Hashed password
 * @param fullName - User full name
 * @param userType - "professional" or "employer"
 * @param professionalType - Professional type (digital/non_digital, null for employers)
 * @param isEmailVerified - Email verification status
 * @param phone - User phone number
 * @param location - User location
 * @returns Created user as DTO (excludes password)
 */
export const createUser = async (
  email: string,
  password: string,
  fullName: string,
  userType: "professional" | "employer",
  professionalType: "digital" | "non_digital" | null,
  isEmailVerified: boolean = false,
  phone: string | null = null,
  location: string | null = null,
  googleId: string | null = null
): Promise<UserResponseDTO> => {
  try {
    const query = `
      INSERT INTO users (
        email, password_hash, full_name, auth_provider, role,
        professional_type, is_email_verified, is_active, onboarding_step,
        phone, location, google_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, email, full_name, auth_provider, role,
                professional_type, is_email_verified, is_active, onboarding_step,
                phone, location, created_at, updated_at, google_id
    `;

    const result = await pool.query(query, [
      email.toLowerCase(),
      password,
      fullName,
      "email", // auth_provider - default to email for now
      userType,
      professionalType,
      isEmailVerified,
      true, // is_active - default to true for new users
      0,    // onboarding_step - start at 0
      phone,
      location,
      googleId
    ]);

    const user: any = result.rows[0];

    // Convert database format to DTO
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      auth_provider: user.auth_provider,
      role: user.role,
      professional_type: user.professional_type,
      is_email_verified: user.is_email_verified,
      is_active: user.is_active,
      onboarding_step: user.onboarding_step,
      phone: user.phone,
      location: user.location,
      created_at: user.created_at,
      updated_at: user.updated_at,
      google_id: user.google_id
    };
  } catch (error) {
    console.error("Database error in createUser:", error);
    throw error;
  }
};

/**
 * Find user by ID (for session/token verification)
 * Used in auth middleware to fetch user details
 *
 * @param id - User ID (UUID string)
 * @returns User data as DTO (excludes password)
 */
export const findById = async (id: string): Promise<UserResponseDTO | null> => {
  try {
    const query = `
      SELECT id, email, full_name, auth_provider, role,
             professional_type, is_email_verified, is_active,
             onboarding_step, phone, location, created_at, updated_at, google_id
      FROM users
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);

    if (!result.rows[0]) return null;

    const user: any = result.rows[0];

    // Convert database format to DTO
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      auth_provider: user.auth_provider,
      role: user.role,
      professional_type: user.professional_type,
      is_email_verified: user.is_email_verified,
      is_active: user.is_active,
      onboarding_step: user.onboarding_step,
      phone: user.phone,
      location: user.location,
      created_at: user.created_at,
      updated_at: user.updated_at,
      google_id: user.google_id
    };
  } catch (error) {
    console.error("Database error in findById:", error);
    throw error;
  }
};

/**
 * Update specific user fields
 * Used for updating verification status, onboarding progress, etc.
 *
 * @param id - User ID (UUID string)
 * @param updates - Object containing fields to update
 * @returns Updated user data or null if not found
 */
export const updateUserFields = async (
  id: string,
  updates: Partial<{
    is_email_verified: boolean;
    is_active: boolean;
    onboarding_step: number;
    last_login_at: Date;
    full_name: string;
    auth_provider: "email" | "google" | "apple";
    role: "employer" | "professional";
    professional_type: "digital" | "non_digital" | null;
    phone: string;
    location: string;
    google_id: string | null;
  }>
): Promise<UserResponseDTO | null> => {
  try {
    // Build dynamic SET clause based on provided updates
    const setClauses = [];
    const values: any[] = [];
    let index = 1;

    if (updates.is_email_verified !== undefined) {
      setClauses.push(`is_email_verified = $${index++}`);
      values.push(updates.is_email_verified);
    }

    if (updates.is_active !== undefined) {
      setClauses.push(`is_active = $${index++}`);
      values.push(updates.is_active);
    }

    if (updates.onboarding_step !== undefined) {
      setClauses.push(`onboarding_step = $${index++}`);
      values.push(updates.onboarding_step);
    }

    if (updates.last_login_at !== undefined) {
      setClauses.push(`last_login_at = $${index++}`);
      values.push(updates.last_login_at);
    }

    if (updates.full_name !== undefined) {
      setClauses.push(`full_name = $${index++}`);
      values.push(updates.full_name);
    }

    if (updates.auth_provider !== undefined) {
      setClauses.push(`auth_provider = $${index++}`);
      values.push(updates.auth_provider);
    }

    if (updates.role !== undefined) {
      setClauses.push(`role = $${index++}`);
      values.push(updates.role);
    }

    if (updates.professional_type !== undefined) {
      setClauses.push(`professional_type = $${index++}`);
      values.push(updates.professional_type);
    }

    if (updates.phone !== undefined) {
      setClauses.push(`phone = $${index++}`);
      values.push(updates.phone);
    }

    if (updates.location !== undefined) {
      setClauses.push(`location = $${index++}`);
      values.push(updates.location);
    }

    if (updates.google_id !== undefined) {
      setClauses.push(`google_id = $${index++}`);
      values.push(updates.google_id);
    }

    if (setClauses.length === 0) {
      // No updates to make
      return await findById(id);
    }

    // Add ID for WHERE clause
    values.push(id);

    const query = `
      UPDATE users
      SET ${setClauses.join(", ")}
      WHERE id = $${index}
      RETURNING id, email, full_name, auth_provider, role,
                professional_type, is_email_verified, is_active,
                onboarding_step, phone, location, created_at, updated_at, google_id
    `;

    const result = await pool.query(query, values);

    if (!result.rows[0]) return null;

    const user: any = result.rows[0];

    // Convert database format to DTO
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      auth_provider: user.auth_provider,
      role: user.role,
      professional_type: user.professional_type,
      is_email_verified: user.is_email_verified,
      is_active: user.is_active,
      onboarding_step: user.onboarding_step,
      phone: user.phone,
      location: user.location,
      created_at: user.created_at,
      updated_at: user.updated_at,
      google_id: user.google_id
    };
  } catch (error) {
    console.error("Database error in updateUserFields:", error);
    throw error;
  }
};

/**
 * Update user's last login timestamp
 * Simple wrapper for updating last_login_at field
 *
 * @param id - User ID (UUID string)
 * @returns Updated user data or null if not found
 */
export const updateUserLastLogin = async (id: string): Promise<UserResponseDTO | null> => {
  return await updateUserFields(id, {
    last_login_at: new Date()
  });
};

/**
 * Store hashed refresh token with metadata
 *
 * @param userId - User ID (UUID string)
 * @param token - Hashed refresh token
 * @param metadata - Optional metadata (userAgent, ipAddress)
 * @returns Storage confirmation
 */
export const storeRefreshToken = async (
  userId: string,
  token: string,
  metadata: {
    userAgent?: string;
    ipAddress?: string;
  } = {}
): Promise<void> => {
  try {
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const query = `
      INSERT INTO refresh_tokens (
        user_id, token_hash, user_agent, ip_address, expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
    `;

    await pool.query(query, [
      userId,
      tokenHash,
      metadata.userAgent || null,
      metadata.ipAddress || null,
      expiresAt
    ]);
  } catch (error) {
    console.error("Database error in storeRefreshToken:", error);
    throw error;
  }
};

/**
 * Find and validate refresh token
 *
 * @param token - Hash of refreshtoken to look for
 * @returns Token record with metadata or null if not found/revoked
 */
export const findRefreshTokenByToken = async (
  token: string
): Promise<{
  id: string;
  user_id: string;
  token_hash: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
} | null> => {
  try {
    const tokenHash = hashToken(token);
    const query = `
      SELECT id, user_id, token_hash, user_agent, ip_address, expires_at, revoked_at, created_at
      FROM refresh_tokens
      WHERE token_hash = $1
    `;

    const result = await pool.query(query, [tokenHash]);

    if (result.rows.length === 0) return null;

    const tokenRecord: any = result.rows[0];

    return {
      id: tokenRecord.id,
      user_id: tokenRecord.user_id,
      token_hash: tokenRecord.token_hash,
      user_agent: tokenRecord.user_agent,
      ip_address: tokenRecord.ip_address,
      expires_at: tokenRecord.expires_at,
      revoked_at: tokenRecord.revoked_at,
      created_at: tokenRecord.created_at
    };
  } catch (error) {
    console.error("Database error in findRefreshTokenByToken:", error);
    throw error;
  }
};

/**
 * Mark refresh token as revoked
 *
 * @param token - Hash of refresh token to revoke
 */
export const revokeRefreshToken = async (token: string): Promise<void> => {
  try {
    const tokenHash = hashToken(token);
    const query = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token_hash = $1
    `;

    await pool.query(query, [tokenHash]);
  } catch (error) {
    console.error("Database error in revokeRefreshToken:", error);
    throw error;
  }
};

/**
 * Revoke all refresh tokens for a user
 * Used during password reset to force logout everywhere
 *
 * @param userId - User ID (UUID string)
 */
export const revokeAllRefreshTokensForUser = async (userId: string): Promise<void> => {
  try {
    const query = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = $1
    `;

    await pool.query(query, [userId]);
  } catch (error) {
    console.error("Database error in revokeAllRefreshTokensForUser:", error);
    throw error;
  }
};

/**
 * Store hashed password reset token
 *
 * @param userId - User ID (UUID string)
 * @param token - Hashed reset token
 * @param expiresAt - Expiration timestamp
 * @returns Storage confirmation
 */
export const storePasswordResetToken = async (
  userId: string,
  token: string,
  expiresAt: Date
): Promise<void> => {
  try {
    const tokenHash = hashToken(token);
    const query = `
      INSERT INTO password_reset_tokens (
        user_id, token_hash, expires_at
      )
      VALUES ($1, $2, $3)
    `;

    await pool.query(query, [userId, tokenHash, expiresAt]);
  } catch (error) {
    console.error("Database error in storePasswordResetToken:", error);
    throw error;
  }
};

/**
 * Find and validate password reset token
 *
 * @param token - Hash of reset token to look for
 * @returns Token record or null if not found/expired/used
 */
export const findPasswordResetTokenByToken = async (
  token: string
): Promise<{
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
} | null> => {
  try {
    const tokenHash = hashToken(token);
    const query = `
      SELECT id, user_id, token_hash, expires_at, used_at, created_at
      FROM password_reset_tokens
      WHERE token_hash = $1 AND used_at IS NULL
    `;

    const result = await pool.query(query, [tokenHash]);

    if (result.rows.length === 0) return null;

    const tokenRecord: any = result.rows[0];

    return {
      id: tokenRecord.id,
      user_id: tokenRecord.user_id,
      token_hash: tokenRecord.token_hash,
      expires_at: tokenRecord.expires_at,
      used_at: tokenRecord.used_at,
      created_at: tokenRecord.created_at
    };
  } catch (error) {
    console.error("Database error in findPasswordResetTokenByToken:", error);
    throw error;
  }
};

/**
 * Mark password reset token as used
 *
 * @param token - Hash of reset token to mark as used
 */
export const markPasswordResetTokenAsUsed = async (token: string): Promise<void> => {
  try {
    const tokenHash = hashToken(token);
    const query = `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE token_hash = $1
    `;

    await pool.query(query, [tokenHash]);
  } catch (error) {
    console.error("Database error in markPasswordResetTokenAsUsed:", error);
    throw error;
  }
};

/**
 * Update user's password hash
 *
 * @param userId - User ID (UUID string)
 * @param hashedPassword - Hashed password
 * @returns Update success indicator
 */
export const updatePassword = async (
  userId: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `;

    const result = await pool.query(query, [hashedPassword, userId]);
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("Database error in updatePassword:", error);
    throw error;
  }
};

/**
 * Delete all OTPs for a user
 * Used during successful verification to clean up
 *
 * @param userId - User ID (UUID string)
 */
export const deleteOtpsForUser = async (userId: string): Promise<void> => {
  try {
    const query = `
      DELETE FROM otp_codes
      WHERE user_id = $1
    `;

    await pool.query(query, [userId]);
  } catch (error) {
    console.error("Database error in deleteOtpsForUser:", error);
    throw error;
  }
};
