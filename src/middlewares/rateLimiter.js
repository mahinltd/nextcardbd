// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import rateLimit from 'express-rate-limit';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Creates a rate limiter middleware with custom options.
 */
const createRateLimiter = (windowMs, maxRequests, message) => {
  return rateLimit({
    windowMs: windowMs, // Time window (e.g., 15 minutes)
    max: maxRequests, // Max requests per IP in that window
    message: {
      success: false,
      message: message,
    },
    handler: (req, res, next, options) => {
      // Send response using standard ApiResponse
      ApiResponse.error(res, options.message.message, options.statusCode);
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
  });
};

// General limiter for most API routes (e.g., 100 requests per 15 mins)
export const generalLimiter = createRateLimiter(
  15 * 60 * 1000,
  100,
  'Too many requests from this IP, please try again after 15 minutes.'
);

// Stricter limiter for Auth routes (login, register, forgot password)
export const authLimiter = createRateLimiter(
  10 * 60 * 1000, // 10 minutes
  10, // 10 attempts
  'Too many authentication attempts. Please try again after 10 minutes.'
);

// Very strict limiter for sensitive email operations (e.g., resend verification)
export const emailLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many email requests. Please try again after 15 minutes.'
);