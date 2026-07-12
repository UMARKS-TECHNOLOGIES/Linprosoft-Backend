/**
 * OTP Service
 * Business logic layer for OTP operations
 * Handles OTP generation, validation, and lifecycle management
 */

import * as otpRepository from "./otpRepository";
//import * as otpTypes from "./otpTypes";
import { OtpPurpose } from "./otpTypes";
import bcrypt from "bcryptjs";
import { logAuthEvent } from "../../utils/logger";
//import { OtpEntity, OtpResponseDTO } from "./otpTypes";

/**
 * OTP service configuration
 */
const otpConfig = {
  length: Number(process.env.OTP_LENGTH) || 6,
  expiresInSeconds: Number(process.env.OTP_EXPIRES_SECONDS) || 600, // 10 minutes
  maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
  resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60, // 1 minute
  bcryptSaltRounds: 10 // For hashing OTP codes (same as password hashing strength)
};

/**
 * Generate and hash a new OTP code
 *
 * @returns Object containing plain OTP code and its hash
 */
export const generateHashedOtP = () => {
  // Generate random numeric code
  const min = Math.pow(10, otpConfig.length - 1);
  const max = Math.pow(10, otpConfig.length) - 1;
  const plainCode = Math.floor(Math.random() * (max - min + 1)) + min;
  const plainCodeString = plainCode.toString().padStart(otpConfig.length, '0');

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
export const getOtPExpirationTime = (): Date => {
  return new Date(Date.now() + otpConfig.expiresInSeconds * 1000);
};

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
 * In a real implementation, this would use an email service (SendGrid, SES, etc.)
 * For now, we'll just log it (in production, replace with actual email sending)
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
  // In production, replace this with actual email service call
  // For example: await sendGrid.send({ to: email, from, templateId, dynamicTemplateData: { otpCode } });

  const purposeText = purpose === "email_verification"
    ? "email verification"
    : "password reset";

  console.log(`[OTP] Sending ${purposeText} OTP to ${email}: ${otpCode}`);

  // Log audit event for OTP sent
  await logAuthEvent(
    "", // User ID will be added by caller
    "otp_sent",
    {
      purpose,
      email, // Include email in metadata for logging
      // Note: In a real implementation, we would have the user ID here
      // For now, we'll leave it empty as the caller will add it
    }
  );
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
 * @param otpCode - Plain OTP code to verify
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

    // Check if OTP has expired (should already be filtered by repository, but double-check)
    if (otpEntity.expiresAt < new Date()) {
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
    if (otpEntity.attempts >= otpConfig.maxAttempts) {
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
    const isValid = await bcrypt.compare(otpCode, otpEntity.codeHash);

    if (isValid) {
      // Mark OTP as consumed on successful verification
      await otpRepository.consumeOtp(otpEntity.id);

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
      await otpRepository.incrementOtpAttempts(otpEntity.id);

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
          attempt: otpEntity.attempts + 1,
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
    // This will automatically handle cooldown checking via generateAndSendOtP
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
 * Get OTP configuration
 */
export const getOtpConfig = (): typeof otpConfig => {
  return otpConfig;
};