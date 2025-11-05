// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import jwt from 'jsonwebtoken';
import { ApiError } from './apiResponse.js';

/**
 * Generates a JSON Web Token (JWT)
 * @param {object} payload - The payload to sign (e.g., user ID, roles)
 * @param {string} secret - The secret key from .env
 * @param {string} expiresIn - The token expiry duration (e.g., '7d')
 * @returns {string} - The generated JWT
 */
export const generateToken = (payload, secret, expiresIn) => {
  if (!secret) {
    throw new ApiError(500, 'JWT_SECRET is not defined in .env');
  }
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn,
  });
};

/**
 * Generates a standard 7-day user access token.
 * @param {mongoose.Schema.Types.ObjectId} userId - The user's MongoDB ID.
 * @param {string[]} roles - The user's roles.
 * @returns {string} - The generated JWT.
 */
export const generateAccessToken = (userId, roles) => {
  const payload = {
    id: userId,
    roles: roles,
  };
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.TOKEN_EXPIRE_DAYS
    ? `${process.env.TOKEN_EXPIRE_DAYS}d`
    : '7d';

  return generateToken(payload, secret, expiresIn);
};

/**
 * Verifies a JSON Web Token (JWT)
 * @param {string} token - The JWT to verify
 * @param {string} secret - The secret key from .env
 * @returns {object} - The decoded payload
 */
export const verifyToken = (token, secret) => {
  if (!secret) {
    throw new ApiError(500, 'JWT_SECRET is not defined in .env');
  }
  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token');
    }
    throw new ApiError(401, 'Token verification failed');
  }
};