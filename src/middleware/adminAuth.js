import { ApiError } from '../utils/apiError.js';
import 'dotenv/config';

/**
 * Middleware to protect admin routes.
 * Checks for a specific API key in the request headers.
 */
export const adminAuth = (req, res, next) => {
  try {
    const apiKey = req.headers['x-admin-api-key'];
    const expectedKey = process.env.ADMIN_API_KEY;

    // 1. Check if ADMIN_API_KEY is set in .env
    if (!expectedKey) {
      console.error('FATAL: ADMIN_API_KEY is not set in .env');
      throw new ApiError(500, 'Admin authentication is not configured');
    }

    // 2. Check if the client sent a key
    if (!apiKey) {
      throw new ApiError(401, 'Unauthorized: Missing admin API key'); // 401 Unauthorized
    }

    // 3. Check if the key is correct
    if (apiKey !== expectedKey) {
      throw new ApiError(403, 'Forbidden: Invalid admin API key'); // 403 Forbidden
    }

    // 4. If all checks pass, proceed to the next middleware/controller
    next();
    
  } catch (error) {
    // Pass any errors to the global error handler
    next(error);
  }
};