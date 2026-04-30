
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import logger from "../utils/logger";
import { env } from "../config/environment";

// Status code constants
const STATUS_CODES = {
  UNAUTHORIZED: 401,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;

interface ErrorLog {
  timestamp: string;
  statusCode: number;
  message: string;
  method: string;
  path: string;
  query: any;
  userId?: string;
  email?: string;
  stack?: string;
}

interface AppErrorObject extends Error {
  statusCode?: number;
  isOperational?: boolean;
  error?: string;
}

/**
 * Build error log object with request context
 */
const buildErrorLog = (
  err: AppErrorObject,
  req: Request
): ErrorLog => {
  const statusCode = err.statusCode || STATUS_CODES.INTERNAL_ERROR;
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    statusCode,
    message: err.message,
    method: req.method,
    path: req.path,
    query: req.query,
    userId: (req as any).user?.id,
  };

  // Add email context for auth errors (without exposing sensitive details)
  if (
    (statusCode === STATUS_CODES.UNAUTHORIZED ||
      statusCode === STATUS_CODES.CONFLICT) &&
    req.body?.email
  ) {
    errorLog.email = req.body.email;
  }

  // Include stack trace in development
  if (env.NODE_ENV === "development" && err.stack) {
    errorLog.stack = err.stack;
  }

  return errorLog;
};

/**
 * Log error based on status code and error type
 */
const logError = (err: AppErrorObject, errorLog: ErrorLog): void => {
  const { statusCode, isOperational } = err;

  if (statusCode && statusCode >= STATUS_CODES.INTERNAL_ERROR) {
    logger.error("Server Error", errorLog);
  } else if (
    statusCode === STATUS_CODES.UNAUTHORIZED ||
    statusCode === STATUS_CODES.CONFLICT
  ) {
    logger.warn("Authentication Error", errorLog);
  } else {
    logger.warn("Client Error", errorLog);
  }

  // Log unhandled errors separately
  if (!isOperational) {
    logger.error("Unhandled Error", { error: err, ...errorLog });
  }
};

/**
 * Build error response object
 */
const buildErrorResponse = (
  err: AppErrorObject,
  statusCode: number,
  timestamp: string
) => {
  const isProduction = env.NODE_ENV === "production";

  return {
    success: false,
    error: err.error || (statusCode >= STATUS_CODES.INTERNAL_ERROR ? "error" : "fail"),
    message: isProduction && statusCode >= STATUS_CODES.INTERNAL_ERROR
      ? "Something went wrong, please try again later"
      : err.message,
    statusCode,
    timestamp,
  };
};

export const errorHandler = (
  err: AppErrorObject,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const normalizedError: AppErrorObject = err instanceof ZodError
    ? {
        ...err,
        message: err.issues.map((issue) => issue.message).join(", "),
        statusCode: 400,
        error: "validation_error",
        isOperational: true,
      }
    : err;

  const statusCode = normalizedError.statusCode || STATUS_CODES.INTERNAL_ERROR;
  const timestamp = new Date().toISOString();

  // Build error context
  const errorLog = buildErrorLog({ ...normalizedError, statusCode }, req);

  // Log the error
  logError({ ...normalizedError, statusCode }, errorLog);

  // Send response
  const responseBody = buildErrorResponse(normalizedError, statusCode, timestamp);
  res.status(statusCode).json(responseBody);
};

// 404 handler
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  res.status(404).json({
    success: false,
    error: "fail",
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
  });
};
