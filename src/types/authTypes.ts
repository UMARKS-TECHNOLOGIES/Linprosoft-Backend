/**
 * Authentication-related types
 */

import { UserType } from "./userTypes";

/**
 * JWT Payload - Data encoded in JWT token
 * Used for token verification and user context
 */
export interface JwtPayload {
  id: number; // User ID
  email: string; // User email
  userType: UserType; // "professional" or "employer"
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