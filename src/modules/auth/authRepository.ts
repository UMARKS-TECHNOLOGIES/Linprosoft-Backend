/**
 * Authentication Repository
 * Data access layer for authentication operations
 * Handles all direct database queries for auth module
 */

import pool from "../../config/db";
import { User, UserResponseDTO, toUserDTO } from "../../types/userTypes";

/**
 * Find user by email
 * Used during login and signup validation
 * 
 * @param email - User email address
 * @returns Full user object with password (for comparison) or null if not found
 */
export const findbyEmail = async (email: string): Promise<User | null> => {
  try {
    const query = `
      SELECT id, email, password, first_name, last_name, user_type, 
             comp_name, location, phone, is_verified, created_at, updated_at, deleted_at
      FROM users 
      WHERE email = $1 AND deleted_at IS NULL
    `;
    const result = await pool.query(query, [email.toLowerCase()]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Database error in findbyEmail:", error);
    throw error;
  }
};

/**
 * Create new user
 * Used during signup process
 * 
 * @param email - User email
 * @param password - Hashed password
 * @param firstName - User first name
 * @param lastName - User last name
 * @param userType - "professional" or "employer"
 * @param compName - Company name (required for employers)
 * @returns Created user as DTO (excludes password)
 */
export const createUser = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  userType: "professional" | "employer",
  compName?: string
): Promise<UserResponseDTO> => {
  try {
    const query = `
      INSERT INTO users (email, password, first_name, last_name, user_type, comp_name, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6, false)
      RETURNING id, email, first_name, last_name, user_type, comp_name, location, phone, is_verified, created_at, updated_at
    `;

    const result = await pool.query(query, [
      email.toLowerCase(),
      password,
      firstName,
      lastName,
      userType,
      compName || null,
    ]);

    const user: any = result.rows[0];

    // Convert database format to DTO (camelCase)
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: user.user_type,
      compName: user.comp_name,
      location: user.location,
      phone: user.phone,
      isVerified: user.is_verified,
      createdAt: user.created_at,
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
 * @param id - User ID
 * @returns User data as DTO (excludes password)
 */
export const findById = async (id: number): Promise<UserResponseDTO | null> => {
  try {
    const query = `
      SELECT id, email, first_name, last_name, user_type, comp_name, location, phone, is_verified, created_at
      FROM users 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const result = await pool.query(query, [id]);

    if (!result.rows[0]) return null;

    const user: any = result.rows[0];

    // Convert database format to DTO
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: user.user_type,
      compName: user.comp_name,
      location: user.location,
      phone: user.phone,
      isVerified: user.is_verified,
      createdAt: user.created_at,
    };
  } catch (error) {
    console.error("Database error in findById:", error);
    throw error;
  }
};
