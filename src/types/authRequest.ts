/**
 * Auth request/response DTOs
 * Used for type-safe API communication
 */

import { Request } from "express";
import { UserResponseDTO } from "./userTypes";
import { JwtPayload } from "./authTypes";

/**
 * Extended Express Request with authenticated user
 * Used in protected routes
 */
export interface AuthRequest extends Request {
  user?: JwtPayload; // Set by auth middleware
}

/**
 * Signup request body
 */
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  userType: "professional" | "employer";
  compName?: string;
  phone?: string;
  location?: string;
}

/**
 * Signup response body
 */
export interface SignupResponse {
  success: true;
  message: string;
  data: {
    user: UserResponseDTO;
  };
  timestamp: string;
}

/**
 * Login request body
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response body
 */
export interface LoginResponse {
  success: true;
  message: string;
  data: {
    user: UserResponseDTO;
  };
  timestamp: string;
}

/**
 * Verify auth response (protected endpoint)
 */
export interface VerifyAuthResponse {
  success: true;
  message: string;
  data: {
    user: UserResponseDTO;
  };
  timestamp: string;
}

/**
 * Logout response
 */
export interface LogoutResponse {
  success: true;
  message: string;
  timestamp: string;
}
