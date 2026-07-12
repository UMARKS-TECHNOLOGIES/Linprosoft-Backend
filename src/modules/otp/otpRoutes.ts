/**
 * OTP Routes
 * Route definitions for OTP operations
 */

import { Router } from "express";
import * as controller from "./otpController";

const router = Router();

/**
 * POST /api/auth/verify-email
 * Verify email with OTP code
 */
router.post("/verify-email", controller.verifyEmail);

/**
 * POST /api/auth/resend-otp
 * Resend OTP for email verification or password reset
 */
router.post("/resend-otp", controller.resendOtp);

/**
 * POST /api/auth/forgot-password
 * Initiate password reset process
 */
router.post("/forgot-password", controller.forgotPassword);

/**
 * POST /api/auth/verify-reset-code
 * Verify password reset OTP code
 */
router.post("/verify-reset-code", controller.verifyResetCode);

/**
 * POST /api/auth/reset-password
 * Complete password reset process
 */
router.post("/reset-password", controller.resetPassword);

export default router;