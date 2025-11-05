// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import { ApiError, ApiResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Global Error Handling Middleware.
 * This catches all errors passed to next() and formats them into a standard JSON response.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Log the error
  logger.error(
    `[${statusCode}] - ${message} - ${req.originalUrl} - ${req.method} - ${
      req.ip
    }`,
    {
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      errors: err.errors,
    }
  );

  // Handle specific Mongoose errors
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const validationErrors = Object.values(err.errors).map((e) => e.message);
    message = `Validation Failed: ${validationErrors.join(', ')}`;
    return ApiResponse.error(res, message, statusCode);
  }
  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409; // Conflict
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    message = `Duplicate field value. The ${field} '${value}' already exists.`;
  }

  // Handle errors from express-validator
  if (err instanceof ApiError) {
    return ApiResponse.custom(res, err.statusCode, err.data, err.message);
  }
  
  // Handle validation errors (e.g., from express-validator)
  if (Array.isArray(err.errors) && err.errors.length > 0) {
     statusCode = 422; // Unprocessable Entity
     message = "Validation failed.";
     return res.status(statusCode).json({
       success: false,
       message,
       errors: err.errors
     });
  }

  // Final fallback response
  return ApiResponse.error(res, message, statusCode);
};

export { errorHandler };