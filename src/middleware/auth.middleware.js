import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import 'dotenv/config';

/**
 * Middleware to protect routes that require user authentication.
 * It verifies the JWT token from the Authorization header.
 * If valid, it attaches the user object (without password) to req.user.
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check if token exists in header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 2. Get token from header (e.g., "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // 3. Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4. Find user by ID from token payload
      // We select '-password' to remove the password from the req.user object
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        // User might have been deleted after token was issued
        throw new ApiError(401, 'Not authorized, user not found');
      }

      // 5. Proceed to the next middleware or controller
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      // This will catch expired tokens or invalid signatures
      throw new ApiError(401, 'Not authorized, token failed');
    }
  }

  // If token wasn't in the header at all
  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }
});