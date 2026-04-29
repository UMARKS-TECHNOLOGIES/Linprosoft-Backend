/**
 * Authentication Service
 * Business logic layer for authentication
 * Handles signup, login, and token operations
 */

import bcrypt from "bcryptjs";
import * as repo from "./authRepository";
import { AppError } from "../../utils/appError";
import { createAccessToken, createRefreshToken } from "../../utils/jwt";
import { SignupInput, LoginInput } from "./authValidation";
import { toUserResponseDTO } from "../../types/userTypes";

/**
 * Signup service
 * Creates a new user account with validation
 * 
 * Process:
 * 1. Check if user already exists
 * 2. Hash password
 * 3. Create user in database
 * 4. Generate JWT token
 * 5. Return user data and token
 * 
 * @param input - Validated signup input from Zod schema
 * @returns User DTO and JWT token
 * @throws AppError if user exists or validation fails
 */
export const signup = async (input: SignupInput) => {
  const { email, password, firstName, lastName, userType, compName } = input;

  // Step 1: Check if user already exists (duplicate email)
  const existing = await repo.findbyEmail(email);
  if (existing) {
    throw new AppError("User with this email already exists", 409);
  }

  // Step 2: Hash password using bcrypt
  // Salt rounds: 12 (good balance between security and performance)
  const hashedPassword = await bcrypt.hash(password, 12);

  // Step 3: Create user in database
  // Repository returns user as DTO (no password)
  const user = await repo.createUser(
    email,
    hashedPassword,
    firstName,
    lastName,
    userType,
    compName
  );

  // Step 4: Generate access and refresh tokens
  const accessToken = createAccessToken({ id: user.id, email: user.email, userType });
  const refreshToken = createRefreshToken({ id: user.id, email: user.email, userType });

  // Step 5: Return user and tokens
  return { user, accessToken, refreshToken };
};

/**
 * Login service
 * Authenticates user and generates session token
 * 
 * Process:
 * 1. Find user by email
 * 2. Verify password
 * 3. Generate JWT token
 * 4. Return user data and token
 * 
 * @param input - Validated login input from Zod schema
 * @returns User DTO and JWT token
 * @throws AppError if credentials are invalid
 */
export const login = async (input: LoginInput) => {
  const { email, password } = input;

  // Step 1: Find user by email
  const user = await repo.findbyEmail(email);

  if (!user) {
    // Intentionally vague for security (don't reveal if email exists)
    throw new AppError("Invalid email or password", 401);
  }

  // Step 2: Verify password using bcrypt
  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    throw new AppError("Invalid email or password", 401);
  }

  // Step 3: Generate JWT token
  // Convert user to DTO for token (exclude password)
  const userDTO = toUserResponseDTO(user);

  const accessToken = createAccessToken({ id: user.id, email: user.email, userType: user.user_type });
  const refreshToken = createRefreshToken({ id: user.id, email: user.email, userType: user.user_type });

  // Step 4: Return user DTO and both tokens
  return { user: userDTO, accessToken, refreshToken };
};
