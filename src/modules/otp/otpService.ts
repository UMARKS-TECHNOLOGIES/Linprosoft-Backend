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
import nodemailer from "nodemailer";

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
 * Create nodemailer transporter
 */
const createTransport = () => {
  return nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE, // true for 465, false for other ports
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });
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
    const transport = createTransport();

    const purposeText = purpose === "email_verification"
      ? "email verification"
      : "password reset";

    const mailOptions = {
      from: env.EMAIL_FROM,
      to: email,
      subject: `Your ${purposeText} code`,
      text: `Your ${purposeText} code is: ${otpCode}\n\nThis code will expire in ${otpConfig.expiresInSeconds / 60} minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${purposeText === "email verification" ? "Verify Your Email" : "Password Reset"}</h2>
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
    };

    await transport.sendMail(mailOptions);

    // Close the transporter
    transport.close();
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