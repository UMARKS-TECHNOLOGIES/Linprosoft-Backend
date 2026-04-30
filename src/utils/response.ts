/**
 * Response wrapper utility
 * Standardizes all API responses to ensure consistent format
 * 
 * Usage:
 *   ApiResponseHandler.success(res, data, "Message", 200)
 *   ApiResponseHandler.created(res, data, "Created")
 *   ApiResponseHandler.error(res, error, message, statusCode)
 */

import { Response } from "express";
import { ApiSuccessResponse, ApiErrorResponse, ApiPaginatedResponse } from "../types/apiTypes";
import { env } from "../config/environment";

/**
 * Response handler class with static methods for consistent responses
 */
export class ApiResponseHandler {
  /**
   * Send success response
   * Standard response format for all successful operations
   * 
   * @param res - Express response object
   * @param data - Response data (optional)
   * @param message - Success message
   * @param statusCode - HTTP status code (default: 200)
   */
  static success<T>(
    res: Response,
    data?: T,
    message: string = "Success",
    statusCode: number = 200
  ): Response {
    const response: ApiSuccessResponse<T> = {
      success: true,
      message,
      ...(data && { data }),
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send created (201) response
   * Shortcut for resource creation endpoints
   * 
   * @param res - Express response object
   * @param data - Created resource data
   * @param message - Success message
   */
  static created<T>(
    res: Response,
    data: T,
    message: string = "Resource created successfully"
  ): Response {
    return this.success(res, data, message, 201);
  }
/**
 * 
 * @param res - Express Response object
 * @param data - Updated response data
 * @param message Success message
 * @returns 200
 */
  static updated<T>(
    res: Response,
    data: T,
    message: string = "Resource updated successfully"
  ): Response {
    return this.success(res, data, message, 200);
  }

  /**
   * 
   * @param res - Response object
   * @param message - Deleted resource data
   * @returns 200
   */
  static deleted(
    res: Response,
    message: string = "Resource deleted successfully"
  ): Response {
    return this.success(res, undefined, message, 200);
  }
  /**
   * Send paginated response
   * For list endpoints that return paginated data
   * 
   * @param res - Express response object
   * @param items - Array of items
   * @param total - Total number of items in database
   * @param page - Current page number (1-indexed)
   * @param limit - Items per page
   * @param message - Success message
   */
  static paginated<T>(
    res: Response,
    items: T[],
    total: number,
    page: number,
    limit: number,
    message: string = "Success"
  ): Response {
    const totalPages = Math.ceil(total / limit);

    const response: ApiPaginatedResponse<T> = {
      success: true,
      message,
      data: {
        items,
        total,
        page,
        limit,
        totalPages,
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  }

  /**
   * Send error response
   * Standardized error format for all error scenarios
   * 
   * @param res - Express response object
   * @param error - Error type/category
   * @param message - Error message
   * @param statusCode - HTTP status code
   */
  static error(
    res: Response,
    error: string,
    message: string,
    statusCode: number = 500
  ): Response {
    const response: ApiErrorResponse = {
      success: false,
      error,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      // Only include stack in development environment
      ...(env.NODE_ENV === "development" && { 
        stack: new Error().stack 
      }),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   * For request validation failures
   * 
   * @param res - Express response object
   * @param message - Validation error message
   * @param errors - Array of field-specific errors
   */
  static validationError(
    res: Response,
    message: string,
    errors: Array<{ field: string; message: string }>
  ): Response {
    return res.status(400).json({
      success: false,
      error: "validation_error",
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }
}
