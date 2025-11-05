// © NextCartBD - Developed by Mahin Ltd (Tanvir)

/**
 * Standardized API Response
 * Simplifies sending consistent JSON responses
 */
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400; // Status codes 2xx, 3xx are considered success
  }

  static success(res, data, message = 'Success', statusCode = 200) {
    const response = new ApiResponse(statusCode, data, message);
    return res.status(statusCode).json(response);
  }

  static error(res, message = 'Error', statusCode = 500) {
    const response = new ApiResponse(statusCode, null, message);
    return res.status(statusCode).json(response);
  }

  static custom(res, statusCode, data, message) {
    const response = new ApiResponse(statusCode, data, message);
    return res.status(statusCode).json(response);
  }
}

/**
 * Standardized API Error
 * Provides a more detailed error response
 */
class ApiError extends Error {
  constructor(
    statusCode,
    message = 'Something went wrong',
    errors = [],
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiResponse, ApiError };