// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendVerificationEmail,
} from '../controllers/authController.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { authLimiter, emailLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// --- Validation Chains ---
const validateEmail = body('email').isEmail().withMessage('Please enter a valid email address.').normalizeEmail();
const validatePassword = body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.');
const validateUsername = body('username')
  .isLength({ min: 3 })
  .withMessage('Username must be at least 3 characters long.')
  .matches(/^[a-zA-Z0-9_]+$/)
  .withMessage('Username can only contain letters, numbers, and underscores.');

// --- Authentication Routes ---

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter, // Apply rate limiting
  [validateUsername, validateEmail, validatePassword], // Validate input
  handleValidationErrors, // Handle any errors from validation
  register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login a user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  [validateEmail, body('password').notEmpty().withMessage('Password is required.')],
  handleValidationErrors,
  login
);

/**
 * @route   GET /api/v1/auth/verify-email/:token
 * @desc    Verify user's email address
 * @access  Public
 */
router.get('/verify-email/:token', verifyEmail);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend the email verification link
 * @access  Public
 */
router.post(
  '/resend-verification',
  emailLimiter, // Stricter rate limit
  [validateEmail],
  handleValidationErrors,
  resendVerificationEmail
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request a password reset link
 * @access  Public
 */
router.post(
  '/forgot-password',
  emailLimiter,
  [validateEmail],
  handleValidationErrors,
  forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password/:token
 * @desc    Reset user's password using the token
 * @access  Public
 */
router.post(
  '/reset-password/:token',
  authLimiter,
  [validatePassword],
  handleValidationErrors,
  resetPassword
);

export default router;