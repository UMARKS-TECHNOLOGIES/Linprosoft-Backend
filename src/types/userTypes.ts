/**
 * User entity types - Represents database user structure
 * Includes both professional and employer user types
 */

// User type discriminator
export type UserType = "professional" | "employer" | "admin";

/**
 * Database User Entity - Full user record with password hash
 * Note: Never expose this directly to frontend
 */
export interface User {
  id: number;
  email: string;
  password: string; // Hashed password - NEVER expose to client
  firstName: string;
  lastName: string;
  userType: UserType;
  compName?: string; // Company name (required only for employers)
  location?: string;
  phone?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * Database User Row 
 */

export interface UserRow {
  id: number;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_type: UserType;
  comp_name: string | null;
  location: string | null;
  phone: string | null;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/** Mapper function from DB row to API DTO*/
export const toUserResponseDTO = (user: UserRow): UserResponseDTO => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  userType: user.user_type,
  compName: user.comp_name ?? undefined,
  location: user.location ?? undefined,
  phone: user.phone ?? undefined,
  isVerified: user.is_verified,
  createdAt: user.created_at,
});

/**
 * User Response DTO - Safe user data for API responses
 * Excludes sensitive fields like password
 */
export interface UserResponseDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  compName?: string;
  location?: string;
  phone?: string;
  isVerified: boolean;
  createdAt: Date;
}

/**
 * Create User Request - What client sends during signup
 * Note: Validation happens via Zod schema
 */
export interface CreateUserDTO {
  name: string; // Will be split into firstName/lastName
  email: string;
  password: string;
  passwordConfirm: string;
  userType: UserType;
  compName?: string;
  location?: string;
  phone?: string;
}

/**
 * Update User Request - Partial user updates
 */
export interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  compName?: string;
}

/**
 * Helper function to convert database User to safe DTO
 * Removes password and internal fields
 */
export const toUserDTO = (user: User): UserResponseDTO => {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    userType: user.userType,
    compName: user.compName,
    location: user.location,
    phone: user.phone,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
};
