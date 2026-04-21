
import winston from "winston";
import fs from "fs";
import path from "path";

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
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
    ...(process.env.NODE_ENV !== "production"
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

export default logger;
