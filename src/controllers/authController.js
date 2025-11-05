// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import User from '../models/User.js';
import Token from '../models/Token.js';
import { ApiResponse, ApiError } from '../utils/apiResponse.js';
import { generateAccessToken } from '../utils/jwtUtils.js';
import { sendEmail, sendAdminNotification } from '../services/emailService.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';

// Helper function to read and prepare email templates
const readTemplate = async (templateName, replacements) => {
  try {
    const templatePath = path.resolve(process.cwd(), `src/templates/${templateName}`);
    let html = await fs.readFile(templatePath, 'utf-8');
    
    // Replace placeholders like {{USERNAME}} and {{LINK}}
    Object.keys(replacements).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, replacements[key]);
    });
    return html;

  } catch (error) {
    logger.error(`Error reading email template ${templateName}:`, error);
    throw new ApiError(500, 'Could not generate email content.');
  }
};

// Helper function to create and send a verification email
const sendVerificationEmail = async (user) => {
  if (process.env.ENABLE_EMAIL_VERIFICATION !== 'true') {
    logger.warn(`Email verification is disabled. Auto-verifying user: ${user.email}`);
    user.isVerified = true;
    await user.save({ validateBeforeSave: false });
    return;
  }

  // Create verification token
  const verifyToken = crypto.randomBytes(32).toString('hex');
  await new Token({
    userId: user._id,
    token: verifyToken,
    type: 'verifyEmail',
  }).save();

  // Construct verification link
  const verifyUrl = `${process.env.APP_URL}/verify-email?token=${verifyToken}`;
  
  // Prepare email
  const htmlBody = await readTemplate('verifyEmail.html', {
    USERNAME: user.username,
    LINK: verifyUrl
  });

  // Send email
  await sendEmail(
    user.email,
    'Verify Your Email - NexCartBD',
    htmlBody
  );
};


// --- Controller Functions ---

/**
 * 1. Register User
 */
export const register = async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const message = existingUser.email === email
        ? 'A user with this email already exists.'
        : 'A user with this username already exists.';
      return next(new ApiError(409, message)); // 409 Conflict
    }

    // Create new user
    const newUser = new User({
      username,
      email,
      password,
      // Roles will default to ['customer']
    });
    await newUser.save();
    
    // Send verification email
    await sendVerificationEmail(newUser);

    // Send notification to admin
    await sendAdminNotification(
      'New User Registration',
      `<p>A new user has registered on NexCartBD:</p><ul><li>Username: ${username}</li><li>Email: ${email}</li></ul>`
    );

    ApiResponse.success(
      res,
      { userId: newUser._id, email: newUser.email },
      'Registration successful. Please check your email to verify your account.',
      201
    );

  } catch (error) {
    next(error);
  }
};

/**
 * 2. Verify Email
 */
export const verifyEmail = async (req, res, next) => {
  const { token } = req.params;

  try {
    // Find the token
    const verificationToken = await Token.findOne({ token, type: 'verifyEmail' });
    if (!verificationToken) {
      return next(new ApiError(404, 'Invalid or expired verification token.'));
    }

    // Find the user
    const user = await User.findById(verificationToken.userId);
    if (!user) {
      return next(new ApiError(404, 'User associated with this token not found.'));
    }

    // Check if already verified
    if (user.isVerified) {
      await Token.deleteOne({ _id: verificationToken._id }); // Clean up token
      return ApiResponse.success(res, null, 'Account already verified. You can log in.');
    }

    // Verify user
    user.isVerified = true;
    await user.save();

    // Delete the token
    await Token.deleteOne({ _id: verificationToken._id });

    ApiResponse.success(res, null, 'Email verified successfully. You can now log in.');

  } catch (error) {
    next(error);
  }
};

/**
 * 3. Login User
 */
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next(new ApiError(401, 'Invalid credentials.')); // 401 Unauthorized
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new ApiError(401, 'Invalid credentials.'));
    }

    // Check if user is verified
    if (!user.isVerified && process.env.ENABLE_EMAIL_VERIFICATION === 'true') {
      return next(new ApiError(403, 'Account not verified. Please check your email.')); // 403 Forbidden
    }

    // Generate JWT
    const accessToken = generateAccessToken(user._id, user.roles);

    // Prepare user data to send back (excluding password)
    const userData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    };

    ApiResponse.success(
      res,
      { token: accessToken, user: userData },
      'Login successful.'
    );

  } catch (error) {
    next(error);
  }
};

/**
 * 4. Forgot Password
 */
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Security: Don't reveal if user exists. Send success response anyway.
      logger.warn(`Password reset attempt for non-existent user: ${email}`);
      return ApiResponse.success(res, null, 'If a user with this email exists, a reset link has been sent.');
    }

    // Create reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    await new Token({
      userId: user._id,
      token: resetToken,
      type: 'resetPassword',
    }).save();

    // Construct reset link
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    
    // Prepare email
    const htmlBody = await readTemplate('resetPassword.html', {
      USERNAME: user.username,
      LINK: resetUrl
    });

    // Send email
    await sendEmail(
      user.email,
      'Password Reset Request - NexCartBD',
      htmlBody
    );

    ApiResponse.success(res, null, 'If a user with this email exists, a reset link has been sent.');

  } catch (error) {
    next(error);
  }
};

/**
 * 5. Reset Password
 */
export const resetPassword = async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Find the token
    const passwordToken = await Token.findOne({ token, type: 'resetPassword' });
    if (!passwordToken) {
      return next(new ApiError(404, 'Invalid or expired password reset token.'));
    }

    // Find the user
    const user = await User.findById(passwordToken.userId);
    if (!user) {
      return next(new ApiError(404, 'User associated with this token not found.'));
    }

    // Update password (User model's 'pre-save' hook will hash it)
    user.password = password;
    await user.save();

    // Delete the token
    await Token.deleteOne({ _id: passwordToken._id });

    ApiResponse.success(res, null, 'Password reset successfully. You can now log in.');

  } catch (error) {
    next(error);
  }
};

/**
 * 6. Resend Verification Email
 */
export const resendVerificationEmail = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return next(new ApiError(404, 'User with this email not found.'));
    }

    if (user.isVerified) {
      return next(new ApiError(400, 'This account is already verified.'));
    }

    // Delete old verification tokens
    await Token.deleteMany({ userId: user._id, type: 'verifyEmail' });
    
    // Send new verification email
    await sendVerificationEmail(user);

    ApiResponse.success(res, null, 'A new verification email has been sent.');

  } catch (error) {
    next(error);
  }
};