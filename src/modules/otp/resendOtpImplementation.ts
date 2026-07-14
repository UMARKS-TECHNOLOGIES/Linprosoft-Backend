import * as otpRepository from "./otpRepository";
import bcrypt from "bcryptjs";
import { env } from "../../config/environment";
import { Resend } from "resend";

export type ResendOtpPurpose = "email_verification" | "password_reset";

/**
 * Generate and send OTP using Resend for email delivery.
 * This function replicates the core logic of generateAndSendOtP but uses Resend instead of nodemailer.
 *
 * @param userId - User ID
 * @param email - User email
 * @param purpose - OTP purpose (email_verification or password_reset)
 * @returns Object containing OTP ID
 */
export const resendOtpByApi = async (
  userId: string,
  email: string,
  purpose: ResendOtpPurpose
): Promise<{ otpId: string }> => {
  try {
    // Check if RESEND_API_KEY is configured
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not defined in environment variables");
    }

    // Generate OTP code and hash (same logic as in otpService.generateHashedOtP)
    const simulateInbox = process.env.SIMULATE_INBOX?.toLowerCase() === 'true';
    const simulatedOtpCode = process.env.SIMULATED_OTP_CODE?.trim();

    const plainCodeString = simulateInbox && simulatedOtpCode
      ? simulatedOtpCode
      : (() => {
          const length = env.OTP_LENGTH;
          const min = Math.pow(10, length - 1);
          const max = Math.pow(10, length) - 1;
          const plainCode = Math.floor(Math.random() * (max - min + 1)) + min;
          return plainCode.toString().padStart(length, '0');
        })();

    // Hash the OTP code using bcrypt (same as password hashing)
    const saltRounds = 10; // Should match otpConfig.bcryptSaltRounds
    const codeHash = await bcrypt.hash(plainCodeString, saltRounds);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_SECONDS * 1000);

    // Save OTP to database
    const otpResult = await otpRepository.createOtp(
      userId,
      purpose,
      codeHash,
      expiresAt
    );

    // Send OTP via Resend
    const resend = new Resend(env.RESEND_API_KEY);

    const purposeText = purpose === "email_verification" ? "email verification" : "password reset";

    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: `Your ${purposeText} code`,
      text: `Your ${purposeText} code is: ${plainCodeString}\n\nThis code will expire in ${env.OTP_EXPIRES_SECONDS / 60} minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${purposeText === "email verification" ? "Verify Your Email" : "Password Reset"}</h2>
          <p>Your ${purposeText} code is:</p>
          <div style="background-color: #f4f4f4; border: 1px solid #ddd; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
            <strong>${plainCodeString}</strong>
          </div>
          <p>This code will expire in ${env.OTP_EXPIRES_SECONDS / 60} minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">This is an automated message, please do not reply.</p>
        </div>
      `,
    });

    // If SIMULATE_INBOX is true, also log to console (for consistency with original behavior)
    if (process.env.SIMULATE_INBOX?.toLowerCase() === 'true') {
      console.info(`[SIMULATE_INBOX] ${purposeText} OTP for ${email}: ${plainCodeString}`);
    }

    return { otpId: otpResult.id };
  } catch (error) {
    console.error("Error in resendOtpByApi:", error);
    throw error;
  }
};