// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import { validationResult } from 'express-validator';
import { ApiError } from '../utils/apiResponse.js';

/**
 * Middleware to handle validation errors from express-validator.
 *
 * This should be placed after your validation chains in the route definition.
 * e.g., router.post('/register', [validateEmail, validatePassword], handleValidationErrors, authController.register);
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors to be more user-friendly
    const extractedErrors = errors.array().map((err) => {
      return {
        field: err.path,
        message: err.msg,
      };
    });

    // Pass the errors to the global error handler
    // We use ApiError to send a 422 (Unprocessable Entity) status
    return next(new ApiError(422, 'Validation failed. Please check your input.', extractedErrors));
  }

  // No errors, proceed to the next middleware (e.g., the controller)
  next();
};