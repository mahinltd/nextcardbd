// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import User from '../models/User.js';
import { ApiError } from '../utils/apiResponse.js';
import { verifyToken } from '../utils/jwtUtils.js';
import logger from '../utils/logger.js';

/**
 * Middleware to protect routes by verifying JWT.
 * Attaches the authenticated user object to req.user.
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Check for token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. If no token, deny access
  if (!token) {
    return next(new ApiError(401, 'Not authorized, no token provided.'));
  }

  try {
    // 3. Verify the token
    const decoded = verifyToken(token, process.env.JWT_SECRET);

    // 4. Find the user from the token's ID
    // We explicitly exclude the password field
    const user = await User.findById(decoded.id).select('-password');

    // 5. Check if user still exists and is not deleted
    if (!user || user.isDeleted) {
      return next(new ApiError(401, 'User not found or has been deactivated.'));
    }

    // 6. Attach user to the request object
    req.user = user;
    next();
  } catch (error) {
    // Handle specific token errors (expired, invalid)
    if (error instanceof ApiError) {
      return next(error);
    }
    logger.error('Auth Middleware Error:', error);
    return next(new ApiError(401, 'Not authorized, token failed.'));
  }
};