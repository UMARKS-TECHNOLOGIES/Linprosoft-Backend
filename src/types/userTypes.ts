/**
 * Authentication-related types
 */

/**
 * User type discriminator
 * Values: employer (service seeker), professional (service provider)
 */
export type UserType = "employer" | "professional";

/**
 * Professional type discriminator
 * Values: digital (tech/online services), non_digital (offline/physical services)
 * Null for employer users
 */
export type ProfessionalType = "digital" | "non_digital" | null;

/**
 * Authentication provider
 * Values: email, google, apple (for social logins)
 */
export type AuthProvider = "email" | "google" | "apple";

/**
 * Database User Entity - Full user record with password hash
 * Note: Never expose this directly to frontend
 */
export interface User {
  id: string; // UUID as string
  full_name: string;
  email: string;
  password_hash?: string; // Hashed password - null for social login
  auth_provider: AuthProvider;
  role: UserType;
  professional_type: ProfessionalType;
  is_email_verified: boolean;
  is_active: boolean;
  onboarding_step: number;
  phone: number;
  location: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Database User Row - Matches actual database column names (snake_case)
 */
export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  auth_provider: string; // Maps to AuthProvider enum
  role: string; // Maps to UserType enum
  professional_type: string | null; // Maps to ProfessionalType enum
  is_email_verified: boolean;
  is_active: boolean;
  onboarding_step: number;
  phone: number;
  location: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Mapper function from DB row to User domain model
 */
export const toUser = (row: UserRow): User => ({
  id: row.id,
  full_name: row.full_name,
  email: row.email,
  password_hash: row.password_hash,
  auth_provider: row.auth_provider as AuthProvider,
  role: row.role as UserType,
  professional_type: (row.professional_type ?? null) as ProfessionalType,
  is_email_verified: row.is_email_verified,
  is_active: row.is_active,
  onboarding_step: row.onboarding_step,
  phone: row.phone,
  location: row.location,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

/**
 * Mapper function from User domain model to DB row
 */
export const toUserRow = (user: User): UserRow => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  password_hash: user.password_hash ?? '',
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
});

/**
 * User Response DTO - Safe user data for API responses
 * Excludes sensitive fields like password_hash
 */
export interface UserResponseDTO {
  id: string;
  full_name: string;
  email: string;
  auth_provider: AuthProvider;
  role: UserType;
  professional_type: ProfessionalType;
  is_email_verified: boolean;
  is_active: boolean;
  onboarding_step: number;
  phone: number;
  location: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Helper function to convert database User to safe DTO
 * Removes password and internal fields
 */
export const toUserResponseDTO = (user: User): UserResponseDTO => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
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
});

/**
 * Create User Request - What client sends during signup
 * Note: Validation happens via Zod schema
 */
export interface CreateUserDTO {
  full_name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  role: UserType;
  professional_type?: ProfessionalType; // Required for professionals
}

/**
 * Update User Request - Partial user updates
 */
export interface UpdateUserDTO {
  full_name?: string;
  professional_type?: ProfessionalType;
}