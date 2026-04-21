
import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { AppError } from "../utils/appError";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  
  // Log error with context
  const errorLog = {
    timestamp: new Date().toISOString(),
    statusCode: err.statusCode,
    message: err.message,
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.user?.id,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  // Add email context for auth errors (without exposing sensitive details)
  if ((err.statusCode === 401 || err.statusCode === 409) && req.body?.email) {
    errorLog.email = req.body.email;
  }
  
  if (err.statusCode >= 500) {
    logger.error("Server Error", errorLog);
  } else if (err.statusCode === 401 || err.statusCode === 409) {
    // Authentication and conflict errors should be logged as warnings
    logger.warn("Authentication Error", errorLog);
  } else {
    logger.warn("Client Error", errorLog);
  }
  
  // Operational errors (expected)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.status,
      message: err.message,
      statusCode: err.statusCode,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Programming errors (unexpected)
  logger.error("Unhandled Error", { error: err, ...errorLog });
  
  res.status(500).json({
    success: false,
    error: "error",
    message: process.env.NODE_ENV === "production"
      ? "Something went wrong, please try again later"
      : err.message,
    statusCode: 500,
    timestamp: new Date().toISOString(),
  });
};

// 404 handler
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    success: false,
    error: "fail",
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
  });
};
