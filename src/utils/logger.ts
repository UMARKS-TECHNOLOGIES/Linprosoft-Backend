import winston from "winston";
import fs from "fs";
import path from "path";
import { env } from "../config/environment";

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "linkprosoft-backend" },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Console in development
    ...(env.NODE_ENV !== "production"
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({ timestamp, level, message, ...meta }) => {
                  const metaStr = Object.keys(meta).length
                    ? JSON.stringify(meta, null, 2)
                    : "";
                  return `${timestamp} [${level}]: ${message} ${metaStr}`;
                }
              )
            ),
          }),
        ]
      : []),
  ],
});

/**
 * Log authentication events to audit trail
 * @param userId - User ID (can be null/undefined for events before user creation)
 * @param eventType - Type of auth event (login_success, login_failed, otp_sent, etc.)
 * @param metadata - Additional context (IP, user agent, attempt counts, etc.)
 */
export const logAuthEvent = (
  userId: string | null | undefined,
  eventType: string,
  metadata: Record<string, any> = {}
) => {
  logger.info("AUDIT_EVENT", {
    user_id: userId ?? null,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    ...metadata
  });
};

export default logger;