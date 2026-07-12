import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3000),

  DATABASE_URL: z
    .string()
    .trim()
    .min(1, "DATABASE_URL is required"),

  JWT_SECRET: z
    .string()
    .trim()
    .min(1, "JWT_SECRET is required"),

  REFRESH_TOKEN_SECRET: z
    .string()
    .trim()
    .min(1, "REFRESH_TOKEN_SECRET is required"),

  FRONTEND_URL: z
    .string()
    .trim()
    .url()
    .default("http://localhost:5173"),

  ACCESS_TOKEN_EXPIRES_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(1800),

  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .default(7),

  LOG_LEVEL: z
    .string()
    .trim()
    .default("info"),

  // OTP Configuration
  OTP_LENGTH: z.number().default(6),
  OTP_EXPIRES_SECONDS: z.number().default(600), // 10 minutes
  OTP_MAX_ATTEMPTS: z.number().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.number().default(60), // 1 minute

  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: z.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.object({
    login: z.number().default(5),
    forgotPassword: z.number().default(3),
    verifyOtp: z.number().default(10),
  }).default({ login: 5, forgotPassword: 3, verifyOtp: 10 }),

  // Paystack Integration (Phase 4 MVP)
  PAYSTACK_PUBLIC_KEY: z
    .string()
    .trim()
    .min(1, "PAYSTACK_PUBLIC_KEY is required for payment integration"),

  PAYSTACK_SECRET_KEY: z
    .string()
    .trim()
    .min(1, "PAYSTACK_SECRET_KEY is required for payment integration"),

  PAYSTACK_WEBHOOK_SECRET: z
    .string()
    .trim()
    .min(1, "PAYSTACK_WEBHOOK_SECRET is required for webhook signature verification"),
});

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;
export type Environment = typeof env;