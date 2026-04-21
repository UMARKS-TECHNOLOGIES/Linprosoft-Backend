/**
 * User entity types - Represents database user structure
 * Includes both professional and employer user types
 */

// User type discriminator
export type UserType = "professional" | "employer";

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
