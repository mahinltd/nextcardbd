import crypto from 'crypto';

/**
 * Generates a human-readable, unique order ID.
 * Format: ORD-XXXXX (e.g., ORD-4EFA1)
 * Generates 5 random uppercase alphanumeric characters.
 */
export const generateOrderId = () => {
  // Generate 3 random bytes, which will give us 6 hex characters
  const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase();
  
  // We only need 5 chars, so we take the first 5
  const shortId = randomChars.substring(0, 5);
  
  return `ORD-${shortId}`;
};