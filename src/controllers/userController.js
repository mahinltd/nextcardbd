// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import User from '../models/User.js';
import { ApiError, ApiResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * 1. Get User Profile (Customer)
 * Gets the profile of the currently logged-in user.
 */
export const getUserProfile = async (req, res, next) => {
  try {
    // req.user is attached by the 'protect' middleware
    const user = req.user;

    // Send all user data except password
    const userProfile = {
      _id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };

    ApiResponse.success(res, userProfile, 'Profile retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Update User Profile (Customer)
 * Allows the user to update their phone or password.
 */
export const updateUserProfile = async (req, res, next) => {
  const { phone, password } = req.body;

  try {
    // Get user from 'protect' middleware
    const user = await User.findById(req.user._id);

    if (phone) {
      user.phone = phone;
    }

    if (password) {
      if (password.length < 6) {
        return next(new ApiError(400, 'Password must be at least 6 characters long.'));
      }
      user.password = password; // pre-save hook will hash it
    }

    const updatedUser = await user.save();

    const userProfile = {
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      phone: updatedUser.phone,
    };

    ApiResponse.success(res, userProfile, 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};