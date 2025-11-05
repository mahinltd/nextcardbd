// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import { ApiError } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Middleware to check for Admin roles (admin or superadmin).
 * This middleware MUST run AFTER the 'protect' middleware.
 */
export const checkAdminRole = (req, res, next) => {
  if (req.user && (req.user.roles.includes('admin') || req.user.roles.includes('superadmin'))) {
    next();
  } else {
    return next(new ApiError(403, 'Forbidden. Admin access required.'));
  }
};

/**
 * Middleware to check for the custom admin secret header.
 * This is an extra layer of security for all admin routes.
 */
export const checkAdminHeader = (req, res, next) => {
  const adminHeaderKey = req.headers['x-nextcardbd-admin'];
  const expectedKey = process.env.X_NEXTCARDBD_ADMIN;

  if (!expectedKey) {
    logger.error('X_NEXTCARDBD_ADMIN secret is not set in .env');
    return next(new ApiError(500, 'Admin security configuration error.'));
  }

  if (!adminHeaderKey || adminHeaderKey !== expectedKey) {
    return next(new ApiError(401, 'Unauthorized. Missing or invalid admin security token.'));
  }

  next();
};

/**
 * Combined Admin Access Middleware.
 * Use this in adminRoutes.js to apply all admin checks at once.
 * It assumes 'protect' (JWT check) has already been applied.
 *
 * Usage: router.use(adminAccess, ...);
 */
export const adminAccess = [
  checkAdminRole,
  checkAdminHeader
];