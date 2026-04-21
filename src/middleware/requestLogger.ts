/**
 * Request Logging Middleware
 * Logs all incoming HTTP requests with timing, status codes, and methods
 * 
 * Features:
 * - Captures request duration
 * - Logs method and path
 * - Logs status code
 * - Uses appropriate log level (info, warn, error) based on status
 * 
 * Log levels:
 * - info: 2xx, 3xx (successful/redirect)
 * - warn: 4xx (client errors)
 * - error: 5xx (server errors)
 */

import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

/**
 * Request logging middleware
 * Must be placed early in middleware chain (before routes)
 * 
 * Usage: app.use(requestLogger);
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Step 1: Record request start time (in milliseconds)
  const startTime = Date.now();

  // Step 2: Store original res.send method
  // We need to hook into response to capture status code and duration
  const originalSend = res.send;

  // Step 3: Override res.send to intercept response
  // This allows us to log after response is ready
  res.send = function (data: any) {
    // Step 4: Calculate request duration (end - start in milliseconds)
    const duration = Date.now() - startTime;

    // Step 5: Format log message
    // Format: [METHOD] [PATH] - [STATUS] - [DURATION]ms
    const logMessage = `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`;

    // Step 6: Log with appropriate level based on status code
    if (res.statusCode >= 500) {
      // Server error: use error level
      logger.error(logMessage);
    } else if (res.statusCode >= 400) {
      // Client error: use warn level
      logger.warn(logMessage);
    } else {
      // Success/redirect: use info level
      logger.info(logMessage);
    }

    // Step 7: Restore original send method and call it
    res.send = originalSend;
    return res.send(data);
  };

  // Step 8: Continue to next middleware
  next();
};
