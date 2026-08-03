/**
 * OTP Service
 * Business logic layer for OTP operations
 * Handles OTP generation, validation, and lifecycle management
 */

import * as otpRepository from "./otpRepository";
import { OtpPurpose } from "./otpTypes";
import bcrypt from "bcryptjs";
import { logAuthEvent } from "../../utils/logger";
import { env } from "../../config/environment";
import { verify } from "jsonwebtoken";
import { updatePassword } from "../auth/authRepository";
import { Resend } from "resend";

/**
 * OTP service configuration
 */
const otpConfig = {
  length: env.OTP_LENGTH,
  expiresInSeconds: env.OTP_EXPIRES_SECONDS, // 10 minutes
  maxAttempts: env.OTP_MAX_ATTEMPTS,
  resendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS, // 1 minute
  bcryptSaltRounds: 10 // For hashing OTP codes (same as password hashing strength)
};


/**
 * Generate and hash a new OTP code
 *
 * @returns Object containing plain OTP code and its hash
 */
export const generateHashedOtP = () => {
  const simulateInbox = process.env.SIMULATE_INBOX?.toLowerCase() === 'true';
  const simulatedOtpCode = process.env.SIMULATED_OTP_CODE?.trim();

  const plainCodeString = simulateInbox && simulatedOtpCode
    ? simulatedOtpCode
    : (() => {
        const min = Math.pow(10, otpConfig.length - 1);
        const max = Math.pow(10, otpConfig.length) - 1;
        const plainCode = Math.floor(Math.random() * (max - min + 1)) + min;
        return plainCode.toString().padStart(otpConfig.length, '0');
      })();

  // Hash the OTP code using bcrypt (same as password hashing)
  const saltRounds = otpConfig.bcryptSaltRounds;
  const codeHash = bcrypt.hashSync(plainCodeString, saltRounds);

  return { plainCode: plainCodeString, codeHash };
};

/**
 * Calculate expiration time for OTP
 *
 * @returns Date object representing expiration time
 */
export const getOtPExpirationTime = ((): Date => {
  return new Date(Date.now() + otpConfig.expiresInSeconds * 1000);
});

/**
 * Check if enough time has passed since last OTP send for resend cooldown
 *
 * @param lastSentAt - Timestamp of last OTP send
 * @returns Boolean indicating if resend is allowed
 */
export const isResendAllowed = (lastSentAt: Date): boolean => {
  if (!lastSentAt) return true;

  const elapsedSeconds = (Date.now() - lastSentAt.getTime()) / 1000;
  return elapsedSeconds >= otpConfig.resendCooldownSeconds;
};

/**
 * Send OTP email
 * Uses nodemailer to send actual emails
 *
 * @param email - Recipient email
 * @param otpCode - OTP code to send
 * @param purpose - Purpose of the OTP (for email template selection)
 */
export const sendOtPEmail = async (
  email: string,
  otpCode: string,
  purpose: OtpPurpose
): Promise<void> => {
  try {
    if (process.env.SIMULATE_INBOX?.toLowerCase() === 'true') {
      const purposeText = purpose === "email_verification"
        ? "email verification"
        : "password reset";

      console.info(`[SIMULATE_INBOX] ${purposeText} OTP for ${email}: ${otpCode}`);
      return;
    }

    const resend = new Resend(env.RESEND_API_KEY);

    const purposeText = purpose === "email_verification"
      ? "email verification"
      : "password reset";

    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: `Your ${purposeText} code`,
      text: `Your ${purposeText} code is: ${otpCode}\n\nThis code will expire in ${otpConfig.expiresInSeconds / 60} minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${purpose === "email_verification" ? "Verify Your Email" : "Password Reset"}</h2>
          <p>Your ${purposeText} code is:</p>
          <div style="background-color: #f4f4f4; border: 1px solid #ddd; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
            <strong>${otpCode}</strong>
          </div>
          <p>This code will expire in ${otpConfig.expiresInSeconds / 60} minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">This is an automated message, please do not reply.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error(`Failed to send OTP email: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Generate and send OTP for email verification or password reset
 * Respects cooldown period to prevent abuse
 *
 * @param userId - User ID
 * @param email - User email
 * @param purpose - OTP purpose (email_verification or password_reset)
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns Object containing OTP ID and whether this is a resend
 */
export const generateAndSendOtP = async (
  userId: string,
  email: string,
  purpose: OtpPurpose,
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{ otpId: string; isResend: boolean }> => {
  try {
    // Check if there's a recent OTP for resend cooldown
    const recentOtp = await otpRepository.findOtpByUserIdAndPurpose(
      userId,
      purpose
    );

    let isResend = false;
    if (recentOtp && !isResendAllowed(recentOtp.createdAt)) {
      throw new Error(`Please wait ${await getResendCooldown(userId, purpose)} seconds before requesting a new OTP`);
    }

    if (recentOtp) {
      isResend = true;
    }

    // Generate OTP code and hash
    const { plainCode, codeHash } = generateHashedOtP();
    const expiresAt = getOtPExpirationTime();

    // Save OTP to database
    const otpResult = await otpRepository.createOtp(
      userId,
      purpose,
      codeHash,
      expiresAt
    );

    // Send OTP via email
    await sendOtPEmail(email, plainCode, purpose);

    // Log audit event for OTP sent
    await logAuthEvent(
      userId,
      "otp_sent",
      {
        purpose,
        ipAddress: auditInfo.ipAddress,
        user_agent: auditInfo.userAgent,
        success: true,
        isResend
      }
    );

    return {
      otpId: otpResult.id,
      isResend
    };
  } catch (error) {
    console.error("Error in generateAndSendOtP:", error);
    throw error;
  }
};

/**
 * Verify OTP code
 *
 * @param userId - User ID
 * @param purpose - OTP purpose
 * * @param otpCode - Plain OTP code to verify
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns Boolean indicating if OTP is valid
 */
export const verifyOtP = async (
  userId: string,
  purpose: OtpPurpose,
  otpCode: string,
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<boolean> => {
  try {
    // Find the latest unconsumed OTP for this user and purpose
    const otpEntity = await otpRepository.findLatestUnconsumedOtp(userId, purpose);

    if (!otpEntity) {
      // No valid OTP found
      await logAuthEvent(
        userId,
        "otp_verification_failed",
        {
          purpose,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "no_valid_otp_found"
        }
      );

      return false;
    }

    // Get the full OTP record (including hash) for verification
    const fullOtpRecord = await otpRepository.findOtpById(otpEntity.id);
    if (!fullOtpRecord) {
      await logAuthEvent(
        userId,
        "otp_verification_failed",
        {
          purpose,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "otp_not_found"
        }
      );

      return false;
    }

    // Check if OTP has expired (should already be filtered by repository, but double-check)
    if (fullOtpRecord.expires_at < new Date()) {
      await logAuthEvent(
        userId,
        "otp_verification_failed",
        {
          purpose,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "otp_expired"
        }
      );

      return false;
    }

    // Check if max attempts exceeded
    if (fullOtpRecord.attempts >= otpConfig.maxAttempts) {
      await logAuthEvent(
        userId,
        "otp_verification_failed",
        {
          purpose,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "max_attempts_exceeded"
        }
      );

      return false;
    }

    // Verify the OTP code against the hash
    const isValid = await bcrypt.compare(otpCode, fullOtpRecord.code_hash);

    if (isValid) {
      // Mark OTP as consumed on successful verification
      await otpRepository.consumeOtp(fullOtpRecord.id);

      // Log audit event for successful OTP verification
      await logAuthEvent(
        userId,
        "otp_verified",
        {
          purpose,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: true
        }
      );
    } else {
      // Increment attempt count on failed verification
      await otpRepository.incrementOtpAttempts(fullOtpRecord.id);

      // Log audit event for failed OTP verification
      await logAuthEvent(
        userId,
        "otp_verification_failed",
        {
          purpose,
          ipAddress: auditInfo.ipAddress,
          user_agent: auditInfo.userAgent,
          success: false,
          reason: "invalid_otp",
          attempt: fullOtpRecord.attempts + 1,
          maxAttempts: otpConfig.maxAttempts
        }
      );
    }

    return isValid;
  } catch (error) {
    console.error("Error in verifyOtP:", error);
    throw error;
  }
};

/**
 * Consume OTP (mark as used)
 *
 * @param otpId - OTP ID
 */
export const consumeOtp = async (
  otpId: string
): Promise<void> => {
  try {
    await otpRepository.consumeOtp(otpId);
  } catch (error) {
    console.error("Error in consumeOtp:", error);
    throw error;
  }
};

/**
 * Resend OTP for email verification or password reset
 * Generates a new OTP and sends it, respecting cooldown period
 *
 * @param userId - User ID
 * @param email - User email
 * @param purpose - OTP purpose
 * @param auditInfo - Optional audit information (IP address, user agent)
 * @returns Object containing new OTP ID
 */
export const resendOtP = async (
  userId: string,
  email: string,
  purpose: OtpPurpose,
  auditInfo: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<{ otpId: string }> => {
  try {
    const result = await generateAndSendOtP(userId, email, purpose, auditInfo);
    return { otpId: result.otpId };
  } catch (error) {
    console.error("Error in resendOtP:", error);
    throw error;
  }
};

/**
 * Get time until OTP can be resent
 *
 * @param userId - User ID
 * @param purpose - OTP purpose
 * @returns Seconds until resend is allowed, or 0 if allowed now
 */
export const getResendCooldown = async (
  userId: string,
  purpose: OtpPurpose
): Promise<number> => {
  try {
    const recentOtp = await otpRepository.findOtpByUserIdAndPurpose(
      userId,
      purpose
    );

    if (!recentOtp) return 0;

    const elapsedSeconds = (Date.now() - recentOtp.createdAt.getTime()) / 1000;
    const remainingSeconds = Math.max(
      0,
      otpConfig.resendCooldownSeconds - Math.floor(elapsedSeconds)
    );

    return remainingSeconds;
  } catch (error) {
    console.error("Error in getResendCooldown:", error);
    return 0;
  }
};

/**
 * Validate a reset token (JWT) for password reset
 *
 * @param token - Reset token to validate
 * @returns Object containing userId if valid, null otherwise
 */
export const validateResetToken = async (
  token: string
): Promise<{ userId: string } | null> => {
  try {
    // Verify the JWT token
    // We use the JWT_SECRET from environment (same as access/refresh tokens)
    // In production, consider using a separate secret for reset tokens
    const decoded = await new Promise<any>((resolve, reject) => {
      verify(token, env.JWT_SECRET, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    // Check if token is for password reset purpose
    if (decoded.purpose !== 'password_reset') {
      return null;
    }

    // Check if token has expired (verified by jwt.verify, but double-check)
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return null;
    }

    // In a production system, we would also check if this token has been used (replay attack protection)
    // This would require storing used tokens or marking them as used in the database
    // For simplicity in this implementation, we rely on the short expiration time (15m)
    // TODO: Implement token usage tracking to prevent replay attacks

    return { userId: decoded.userId };
  } catch (error) {
    // Token is invalid (expired, malformed, wrong signature, etc.)
    return null;
  }
};

/**
 * Reset password using a valid reset token
 *
 * @param token - Valid reset token
 * @param newPassword - New password to set
 * @returns Boolean indicating success
 */
export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<boolean> => {
  try {
    // Validate the reset token to get userId
    const tokenData = await validateResetToken(token);
    if (!tokenData) {
      throw new Error('Invalid or expired reset token');
    }

    const userId = tokenData.userId;

    // Validate new password meets requirements (basic check)
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    // Additional password policy checks could go here

    // Hash the new password using bcrypt (same cost as OTP hashing)
    const saltRounds = 10; // Match the bcrypt salt rounds used elsewhere
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password in the database
    const success = await updatePassword(userId, hashedPassword);

    if (!success) {
      throw new Error('Failed to update password');
    }

    // In a production system, we would also:
    // 1. Invalidate all existing refresh tokens for the user (force logout everywhere)
    // 2. Mark the reset token as used to prevent replay attacks
    // For simplicity in this implementation, we rely on token expiration
    // TODO: Implement token revocation and used-token tracking

    // Log audit event for successful password reset
    await logAuthEvent(
      userId,
      "password_reset",
      {
        success: true
      }
    );

    return true;
  } catch (error) {
    console.error("Error in resetPassword:", error);
    // Log audit event for failed password reset attempt
    // Note: we might not have userId here if token validation failed
    // but we can try to decode the token without verification to get userId for logging
    try {
      const decoded = jwtDecode(token);
      if (decoded && typeof decoded === 'object' && 'userId' in decoded) {
        await logAuthEvent(
          decoded.userId as string,
          "password_reset",
          {
            success: false,
            reason: error instanceof Error ? error.message : String(error)
          }
        );
      }
    } catch (e) {
      // Ignore errors in logging
    }

    throw error;
  }
};

/**
 * Get OTP configuration
 */
export const getOtpConfig = (): typeof otpConfig => {
  return otpConfig;
};

// Helper function to decode JWT without verification (for logging purposes only)
function jwtDecode(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
}