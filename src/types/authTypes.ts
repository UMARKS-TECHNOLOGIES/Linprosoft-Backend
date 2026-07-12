import { UserType } from "../types/userTypes";

/**
 * Authentication-related types
 */

/**
 * JWT Payload - Data encoded in JWT token
 * Used for token verification and user context
 * Note: id fis stored as UUID string in database
 */
export interface JwtPayload {
  id: string; // User ID as UUID string
  email: string; // User email
  role: UserType; // "client" or "professional"
  iat?: number; // Issued at (unix timestamp)
  exp?: number; // Expiration (unix timestamp)
}

/**
 * Auth Response - Standard response from auth endpoints
 */
export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: any; // UserResponseDTO
  };
  timestamp: string;
}