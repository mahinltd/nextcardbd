import { ApiError } from '../utils/apiError.js';
import 'dotenv/config';

/**
 * Global error handling middleware.
 * Catches all errors passed by 'next(err)' and formats them
 * into a standardized JSON response using the ApiError class.
 */
const errorHandler = (err, req, res, next) => {
  // Check if the error is already an instance of our custom ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      data: null,
    });
  }

  // If it's an unexpected error, log it and send a generic 500 response
  console.error('UNHANDLED ERROR: ', err);

  // Handle Mongoose validation errors (optional but good)
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => el.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid data provided',
      errors: errors,
      data: null,
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    return res.status(409).json({ // 409 Conflict
      success: false,
      message: `Duplicate value entered for ${Object.keys(err.keyValue)} field.`,
      errors: [],
      data: null,
    });
  }

  // Generic internal server error
  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    // Only show detailed error in development mode
    errors: process.env.NODE_ENV === 'development' ? [err.message] : [],
    data: null,
  });
};

export { errorHandler };