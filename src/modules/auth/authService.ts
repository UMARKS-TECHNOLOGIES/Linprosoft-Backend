/**
 * Authentication Service
 * Business logic layer for authentication operations
 * Handles user registration, login, verification, password reset, etc.
 */

import * as repo from "./authRepository";
import * as otpRepository from "../otp/otpRepository";
import * as otpService from "../otp/otpService";
import { generateAccessToken, generateRefreshToken, verifyToken } from "../../utils/jwt";
import { OtpPurpose } from "../otp/otpTypes";
import { logAuthEvent } from "../../utils/logger";
import { UserResponseDTO } from "../../types/userTypes";
import { AppError } from "../../utils/appError";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Register a new user account
 * Step 1: Create user with is_email_verified = false
 * Step 2: Generate and store OTP for email verification
 * Step 3: Send OTP email
 *
 * @param userData - User registration data
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns User data (minimal, no tokens yet)
 */
export const signup = async (
  userData: {
    email: string;
    password: string;
    full_name: string;
    role: "client" | "professional";
    professional_type?: "digital" | "non_digital" | null;
    phone?: string;
    location?: string;
  },
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{ user: UserResponseDTO }> => {
  try {
    // Check if user already exists (for audit logging)
    const existingUser = await repo.findByEmail(userData.email);

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user with is_email_verified = false
    const user = await repo.createUser(
      userData.email,
      hashedPassword,
      userData.full_name,
      userData.role,
      userData.professional_type ?? null,
      false, // isEmailVerified - starts as false
      userData.phone ?? null,
      userData.location ?? null
    );

    // Generate and send OTP for email verification
    const { plainCode, codeHash } = otpService.generateHashedOtP();
    const expiresAt = otpService.getOtPExpirationTime();

    // Save OTP to database
    await otpRepository.createOtp(
      user.id,
      "email_verification",
      codeHash,
      expiresAt
    );

    // Send OTP via email
    await otpService.sendOtPEmail(
      userData.email,
      plainCode,
      "email_verification"
    );

    // Log audit event for signup
    await logAuthEvent(
      user.id,
      "signup",
      {
        email: userData.email,
        role: userData.role,
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: true,
        existing_user: !!existingUser
      }
    );

    // Return minimal user data (no tokens yet - user must verify email first)
    return { user };
  } catch (error) {
    console.error("Error in signup:", error);

    // Log error for monitoring
    await logAuthEvent(
      null, // No user ID yet
      "signup_error",
      {
        email: userData.email,
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    );

    throw error;
  }
};

/**
 * Verify email with OTP code
 * Step 1: Validate OTP against stored hash
 * Step 2: Check expiration and attempts
 * Step 3: On success: mark OTP as consumed, set is_email_verified = true
 * Step 4: Generate access and refresh tokens
 * Step 5: Store refresh token in database
 * Step 6: Return user data and tokens
 *
 * @param email - User email
 * @param otpCode - Plain OTP code to verify
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns Object containing accessToken, refreshToken, and user data
 */
export const verifyEmail = async (
  email: string,
  otpCode: string,
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: UserResponseDTO;
}> => {
  try {
    // Find user by email
    const user = await repo.findByEmail(email);

    if (!user) {
      // Log audit event for failed verification (user not found)
      await logAuthEvent(
        null, // No user ID
        "email_verification_failed",
        {
          email,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "user_not_found"
        }
      );

      throw new AppError("Invalid email or OTP code", 400);
    }

    // Verify OTP code
    const isValid = await otpService.verifyOtP(
      user.id,
      "email_verification",
      otpCode,
      auditInfo
    );

    if (!isValid) {
      // Log audit event for failed verification
      await logAuthEvent(
        user.id,
        "email_verification_failed",
        {
          email,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "invalid_otp"
        }
      );

      throw new AppError("Invalid email or OTP code", 400);
    }

    // Update user to set is_email_verified = true
    const updatedUser = await repo.updateUserFields(user.id, {
      is_email_verified: true
    });

    if (!updatedUser) {
      throw new AppError("Failed to update user verification status", 500);
    }

    // Generate access and refresh tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const refreshToken = await generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Store refresh token in database
    await repo.storeRefreshToken(
      user.id,
      refreshToken,
      {
        userAgent: auditInfo.userAgent,
        ipAddress: auditInfo.ipAddress
      }
    );

    // Log audit event for successful email verification
    await logAuthEvent(
      user.id,
      "email_verified",
      {
        email,
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: true
      }
    );

    return {
      accessToken,
      refreshToken,
      user: updatedUser
    };
  } catch (error) {
    console.error("Error in verifyEmail:", error);
    throw error;
  }
};

/**
 * Login user with email and password
 * Step 1: Verify email exists and password matches
 * Step 2: Check is_email_verified (return specific error if not)
 * Step 3: Generate tokens
 * Step 4: Store refresh token
 * Step 5: Update last login timestamp
 * Step 6: Return user data and tokens
 *
 * @param credentials - Email and password
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns Object containing accessToken, refreshToken, and user data
 */
export const login = async (
  credentials: {
    email: string;
    password: string;
  },
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: UserResponseDTO;
}> => {
  try {
    // Find user by email (includes password hash)
    const userRow = await repo.findByEmail(credentials.email);

    if (!userRow) {
      // Log audit event for failed login (user not found)
      await logAuthEvent(
        null, // No user ID
        "login_failed",
        {
          email: credentials.email,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "user_not_found"
        }
      );

      // Return generic error to prevent email enumeration
      throw new AppError("Invalid email or password", 401);
    }

    // Check if password matches
    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      userRow.password_hash
    );

    if (!isPasswordValid) {
      // Log audit event for failed login (wrong password)
      await logAuthEvent(
        null, // No user ID yet (security: don't reveal if user exists)
        "login_failed",
        {
          email: credentials.email,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "invalid_password"
        }
      );

      // Return generic error to prevent email enumeration
      throw new AppError("Invalid email or password", 401);
    }

    // Get full user data (without password)
    const user = await repo.findById(userRow.id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Check if email is verified
    if (!user.is_email_verified) {
      // Log audit event for failed login (email not verified)
      await logAuthEvent(
        user.id,
        "login_failed",
        {
          email: credentials.email,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "email_not_verified"
        }
      );

      throw new AppError("Email not verified. Please verify your email before logging in.", 403);
    }

    // Generate access and refresh tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const refreshToken = await generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Store refresh token in database
    await repo.storeRefreshToken(
      user.id,
      refreshToken,
      {
        userAgent: auditInfo.userAgent,
        ipAddress: auditInfo.ipAddress
      }
    );

    // Update last login timestamp
    await repo.updateUserLastLogin(user.id);

    // Log audit event for successful login
    await logAuthEvent(
      user.id,
      "login_success",
      {
        email: credentials.email,
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: true
      }
    );

    return {
      accessToken,
      refreshToken,
      user
    };
  } catch (error) {
    console.error("Error in login:", error);
    throw error;
  }
};

/**
 * Resend OTP for email verification or password reset
 * Generates a new OTP and sends it, respecting cooldown period
 *
 * @param email - User email
 * @param purpose - OTP purpose (email_verification or password_reset)
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns Object containing new OTP ID
 */
export const resendOtP = async (
  email: string,
  purpose: OtpPurpose,
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{ otpId: string }> => {
  try {
    // Find user by email
    const user = await repo.findByEmail(email);

    if (!user) {
      // For security, don't reveal if user exists
      // But still log the attempt for monitoring
      await logAuthEvent(
        null, // No user ID
        `resend_otp_${purpose}`,
        {
          email,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "user_not_found"
        }
      );

      throw new AppError("If the email exists in our system, a new OTP has been sent", 400);
    }

    // Generate and send OTP (this will handle cooldown checking)
    const result = await otpService.generateAndSendOtP(
      user.id,
      user.email, // We don't have email in user object, need to get it from userRow
      purpose,
      auditInfo
    );

    // Log audit event for OTP resent
    await logAuthEvent(
      user.id,
      `otp_resend_${purpose}`,
      {
        purpose,
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: true,
        isResend: true
      }
    );

    return { otpId: result.otpId };
  } catch (error) {
    console.error("Error in resendOtP:", error);

    // Log error for monitoring
    await logAuthEvent(
      null, // No user ID
      `resend_otp_${purpose}_error`,
      {
        email,
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    );

    throw error;
  }
};

/**
 * Initiate password reset process
 * Always returns success message for security (prevents email enumeration)
 *
 * @param email - User's email
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns Always returns success message for security
 */
export const forgotPassword = async (
  email: string,
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{ message: string }> => {
  try {
    // For security, we don't reveal if the user exists
    const user = await repo.findByEmail(email.toLowerCase().trim());

    if (user) {
      // Check if we can send OTP (cooldown period)
      const recentOtp = await otpRepository.findOtpByUserIdAndPurpose(
        user.id,
        "password_reset"
      );

      if (recentOtp && !otpService.isResendAllowed(recentOtp.createdAt)) {
        // Still in cooldown period - for security, we still return success
        // but log the actual reason
        const secondsLeft = await otpService.getResendCooldown(
          user.id,
          "password_reset"
        );
        await logAuthEvent(
          user.id,
          "forgot_password_rate_limited",
          {
            purpose: "password_reset",
            ipAddress: auditInfo.ipAddress,
            user_agent: auditInfo.userAgent,
            success: false,
            reason: "cooldown_active",
            seconds_left: secondsLeft
          }
        );

        // Return generic success message to prevent enumeration
        return { message: "If the email exists in our system, a password reset OTP has been sent" };
      }

      // Generate and send OTP for password reset
      const { plainCode, codeHash } = otpService.generateHashedOtP();
      const expiresAt = otpService.getOtPExpirationTime();

      // Update existing OTP record or create new one
      let otpResult;
      if (recentOtp) {
        // Update existing OTP
        otpResult = await otpRepository.updateOtp(
          recentOtp.id,
          {
            codeHash,
            expiresAt,
            attempts: 0 // Reset attempts on resend
          }
        );
      } else {
        // Create new OTP
        otpResult = await otpRepository.createOtp(
          user.id,
          "password_reset",
          codeHash,
          expiresAt
        );
      }
      if (!otpResult) {
        await logAuthEvent(
          user.id,
          "otp_creation_failed",
          {
            purpose: "password_reset",
            ipAddress: auditInfo.ipAddress,
            user_agent: auditInfo.userAgent,
            success: false,
            reason: "otp_storage_failed"
          }
        );
      }

      // Send OTP email
      await otpService.sendOtPEmail(
        user.email,
        plainCode,
        "password_reset"
      );

      // Log audit event for OTP sent
      await logAuthEvent(
        user.id,
        "forgot_password_otp_sent",
        {
          purpose: "password_reset",
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: true
        }
      );
    } else {
      // Log attempt for non-existent user (for security monitoring)
      await logAuthEvent(
        null, // No user ID
        "forgot_password_attempt_for_non_existent_user",
        {
          email,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "user_not_found"
        }
      );
    }

    // Always return the same message to prevent email enumeration
    return { message: "If the email exists in our system, a password reset OTP has been sent" };
  } catch (error) {
    console.error("Error in forgotPassword:", error);

    // Log error for monitoring (but don't expose details to client)
    await logAuthEvent(
      null, // No user ID
      "forgot_password_error",
      {
        email,
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: false,
        reason: "system_error",
        error: error instanceof Error ? error.message : "Unknown error"
      }
    );

    // Still return generic message for security
    return { message: "If the email exists in our system, a password reset OTP has been sent" };
  }
};

/**
 * Verify password reset OTP code
 * Step 1: Validate OTP (purpose: password_reset)
 * Step 2: On success: generate short-lived reset token
 * Step 3: Store in password_reset_tokens table
 * Step 4: Return reset token
 *
 * @param email - User email
 * @param otpCode - Plain OTP code to verify
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns Object containing resetToken on success
 */
export const verifyResetCode = async (
  email: string,
  otpCode: string,
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{ resetToken: string }> => {
  try {
    // Find user by email
    const user = await repo.findByEmail(email);

    if (!user) {
      // Log audit event for failed verification (user not found)
      await logAuthEvent(
        null, // No user ID
        "verify_reset_code_failed",
        {
          email,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "user_not_found"
        }
      );

      throw new AppError("Invalid email or OTP code", 400);
    }

    // Verify OTP code for password reset purpose
    const isValid = await otpService.verifyOtP(
      user.id,
      "password_reset",
      otpCode,
      auditInfo
    );

    if (!isValid) {
      // Log audit event for failed verification
      await logAuthEvent(
        user.id,
        "verify_reset_code_failed",
        {
          email,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "invalid_otp"
        }
      );

      throw new AppError("Invalid email or OTP code", 400);
    }

    // Generate short-lived reset token (10-15 minutes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token in database
    await repo.storePasswordResetToken(
      user.id,
      resetToken,
      expiresAt
    );

    // Log audit event for successful reset code verification
    await logAuthEvent(
      user.id,
      "reset_code_verified",
      {
        email,
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: true
      }
    );

    return { resetToken };
  } catch (error) {
    console.error("Error in verifyResetCode:", error);
    throw error;
  }
};

/**
 * Complete password reset process
 * Step 1: Validate reset token exists and not expired
 * Step 2: Update password hash
 * Step 3: Revoke all refresh tokens for user (force logout)
 * Step 4: Delete used reset token and OTP record
 * Step 5: Return success
 *
 * @param resetToken - Reset token from verify-reset-code
 * @param newPassword - New password to set
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns Success message
 */
export const resetPassword = async (
  resetToken: string,
  newPassword: string,
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{ message: string }> => {
  try {
    // Find and validate password reset token
    const resetTokenRecord = await repo.findPasswordResetTokenByToken(resetToken);

    if (!resetTokenRecord) {
      // Log audit event for invalid/expired reset token
      await logAuthEvent(
        null, // No user ID
        "reset_password_failed",
        {
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "invalid_or_expired_token"
        }
      );

      throw new AppError("Invalid or expired reset token", 400);
    }

    // Check if token has expired
    if (resetTokenRecord.expires_at < new Date()) {
      // Log audit event for expired reset token
      await logAuthEvent(
        resetTokenRecord.user_id,
        "reset_password_failed",
        {
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "token_expired"
        }
      );

      throw new AppError("Invalid or expired reset token", 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user's password
    const passwordUpdated = await repo.updatePassword(
      resetTokenRecord.user_id,
      hashedPassword
    );

    if (!passwordUpdated) {
      throw new AppError("Failed to update password", 500);
    }

    // Revoke all refresh tokens for user (force logout everywhere)
    await repo.revokeAllRefreshTokensForUser(resetTokenRecord.user_id);

    // Mark password reset token as used
    await repo.markPasswordResetTokenAsUsed(resetToken);

    // Delete associated OTP record (optional cleanup)
    await otpRepository.deleteOtpsByUserIdAndPurpose(
      resetTokenRecord.user_id,
      "password_reset"
    );

    // Log audit event for successful password reset
    await logAuthEvent(
      resetTokenRecord.user_id,
      "password_reset_completed",
      {
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: true
      }
    );

    return { message: "Password reset successful" };
  } catch (error) {
    console.error("Error in resetPassword:", error);
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 * Step 1: Validate refresh token exists in database and not revoked
 * Step 2: Generate new access token
 * Step 3: Rotate refresh token (revoke old, create new)
 * Step 4: Return new access token
 *
 * @param refreshToken - Refresh token
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns Object containing new accessToken
 */
export const refreshToken = async (
  refreshToken: string,
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    // Find and validate refresh token
    const tokenRecord = await repo.findRefreshTokenByToken(refreshToken);

    if (!tokenRecord) {
      // Log audit event for invalid refresh token
      await logAuthEvent(
        null, // No user ID
        "token_refresh_failed",
        {
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "invalid_token"
        }
      );

      throw new AppError("Invalid refresh token", 401);
    }

    // Verify the refresh token's JWT signature and payload
    const payload = verifyToken(refreshToken);
    // jwt.verify returns string | object; we expect an object with id, email, role
    if (typeof payload === 'string' || payload === null || typeof payload !== 'object') {
      await logAuthEvent(
        null,
        "token_refresh_failed",
        {
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "invalid_token_payload"
        }
      );
      throw new AppError("Invalid refresh token", 401);
    }
    // Now payload is an object; we can safely access its properties
    // Get user data from token payload
    const user = await repo.findById((payload as { id: string }).id);

    if (!user) {
      throw new AppError("Invalid refresh token", 401);
    }

    // Verify that the token payload matches our records
    if (user.id !== tokenRecord.user_id) {
      throw new AppError("Invalid refresh token", 401);
    }

    // Additional verification: check that email and role in token match user record
    const payloadTyped = payload as { id: string; email: string; role: string };
    if (payloadTyped.email !== user.email || payloadTyped.role !== user.role) {
      throw new AppError("Invalid refresh token", 401);
    }

    // Check if token is revoked
    if (tokenRecord.revoked_at !== null) {
      // Log audit event for revoked refresh token
      await logAuthEvent(
        tokenRecord.user_id,
        "token_refresh_failed",
        {
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "token_revoked"
        }
      );

      throw new AppError("Invalid refresh token", 401);
    }

    // Check if token has expired
    if (tokenRecord.expires_at < new Date()) {
      // Log audit event for expired refresh token
      await logAuthEvent(
        tokenRecord.user_id,
        "token_refresh_failed",
        {
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "token_expired"
        }
      );

      throw new AppError("Invalid refresh token", 401);
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Generate new refresh token for rotation
    const newRefreshToken = await generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Revoke old refresh token
    await repo.revokeRefreshToken(refreshToken);

    // Store new refresh token in database (rotation)
    await repo.storeRefreshToken(
      user.id,
      newRefreshToken,
      {
        userAgent: auditInfo.userAgent,
        ipAddress: auditInfo.ipAddress
      }
    );

    // Log audit event for successful token refresh
    await logAuthEvent(
      user.id,
      "token_refreshed",
      {
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: true
      }
    );

    return { accessToken, refreshToken: newRefreshToken };
  } catch (error) {
    console.error("Error in refreshToken:", error);
    throw error;
  }
};

/**
 * Logout user by revoking refresh token
 *
 * @param refreshToken - Refresh token to revoke
 * @param userId - User ID (from auth middleware)
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns Success confirmation
 */
export const logout = async (
  refreshToken: string,
  userId: string,
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<void> => {
  try {
    // Find and validate refresh token
    const tokenRecord = await repo.findRefreshTokenByToken(refreshToken);

    // Only proceed if token exists and belongs to the user
    if (tokenRecord && tokenRecord.user_id === userId) {
      // Revoke refresh token
      await repo.revokeRefreshToken(refreshToken);

      // Log audit event for logout
      await logAuthEvent(
        userId,
        "logout",
        {
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: true
        }
      );
    } else {
      // Log audit event for logout attempt with invalid token
      await logAuthEvent(
        userId,
        "logout_failed",
        {
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "invalid_token"
        }
      );

      throw new AppError("Invalid session", 401);
    }
  } catch (error) {
    console.error("Error in logout:", error);
    throw error;
  }
};

/**
 * Verify current session and return user data
 *
 * @param userId - User ID (from auth middleware)
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns User data
 */
export const verify = async (
  userId: string,
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{ user: UserResponseDTO }> => {
  try {
    // Get user data
    const user = await repo.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Log audit event for session verification
    await logAuthEvent(
      userId,
      "session_verified",
      {
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: true
      }
    );

    return { user };
  } catch (error) {
    console.error("Error in verify session:", error);
    throw error;
  }
};

/**
 * Get current user profile
 *
 * @param userId - User ID (from auth middleware)
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns User profile data
 */
export const getMe = async (
  userId: string,
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{ user: UserResponseDTO }> => {
  try {
    // Get user data
    const user = await repo.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Log audit event for profile access
    await logAuthEvent(
      userId,
      "profile_accessed",
      {
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: true
      }
    );

    return { user };
  } catch (error) {
    console.error("Error in getMe:", error);
    throw error;
  }
};

/**
 * Update current user profile
 *
 * @param userId - User ID (from auth middleware)
 * @param updates - Fields to update (fullName, professionalType, phone, location)
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns Updated user profile data
 */
export const updateMe = async (
  userId: string,
  updates: {
    fullName?: string;
    professionalType?: "digital" | "non_digital" | null;
    phone?: string;
    location?: string;
  },
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{ user: UserResponseDTO }> => {
  try {
    // Get current user data
    const user = await repo.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Prepare update object
    const updateData: any = {};

    if (updates.fullName !== undefined) {
      updateData.full_name = updates.fullName;
    }

    if (updates.professionalType !== undefined) {
      // Only professionals can update professional_type
      if (user.role !== "professional") {
        throw new AppError("Only professionals can update professional type", 403);
      }
      updateData.professional_type = updates.professionalType;
    }

    if (updates.phone !== undefined) {
      updateData.phone = updates.phone;
    }

    if (updates.location !== undefined) {
      updateData.location = updates.location;
    }

    // Check if any valid updates provided
    if (Object.keys(updateData).length === 0) {
      throw new AppError("No valid fields to update", 400);
    }

    // Log audit event for profile update attempt
    await logAuthEvent(
      userId,
      "profile_update_attempt",
      {
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: true, // We'll log the actual result after the update
        updates: Object.keys(updateData)
      }
    );

    // Update user in database
    const updatedUser = await repo.updateUserFields(userId, updateData);

    if (!updatedUser) {
      // Log audit event for failed profile update
      await logAuthEvent(
        userId,
        "profile_update_failed",
        {
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "database_update_failed",
          updates: Object.keys(updateData)
        }
      );
      throw new AppError("Failed to update user", 500);
    }

    // Log audit event for successful profile update
    await logAuthEvent(
      userId,
      "profile_update_success",
      {
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: true,
        updates: Object.keys(updateData)
      }
    );

    return { user: updatedUser };
  } catch (error) {
    console.error("Error in updateMe:", error);
    throw error;
  }
};