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
