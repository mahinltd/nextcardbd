import jwt from 'jsonwebtoken';
import 'dotenv/config';

/**
 * Generates a JSON Web Token (JWT) for a user.
 * @param {string} userId - The user's MongoDB _id.
 * @param {string} userRole - The user's role (e.g., 'user', 'admin').
 * @returns {string} The generated JWT.
 */
const generateToken = (userId, userRole) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in .env file');
  }

  // Create token payload
  const payload = {
    id: userId,
    role: userRole,
  };

  // Sign the token
  // It will expire in 30 days (you can change this)
  return jwt.sign(payload, secret, {
    expiresIn: '30d',
  });
};

export { generateToken };