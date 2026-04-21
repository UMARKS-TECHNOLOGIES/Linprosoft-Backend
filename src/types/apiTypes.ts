/**
 * Global API response types
 * Standardized response format for all endpoints
 */

/**
 * Standard API Success Response
 * All successful endpoints should return this format
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data?: T;
  timestamp: string;
}

/**
 * Standard API Error Response
 * All errors should be caught and return this format
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  ...(process.env.NODE_ENV === "development" && { stack?: string });
}

/**
 * Paginated Response - For listing endpoints
 */
export interface ApiPaginatedResponse<T = any> {
  success: true;
  message: string;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp: string;
}

/**
 * Validation Error Details
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Response with validation errors
 */
export interface ApiValidationErrorResponse {
  success: false;
  error: "validation_error";
  message: string;
  errors: ValidationError[];
  timestamp: string;
}

/**
 * Combined error response type
 */
export type ApiResponse<T = any> = 
  | ApiSuccessResponse<T> 
  | ApiErrorResponse 
  | ApiValidationErrorResponse;
