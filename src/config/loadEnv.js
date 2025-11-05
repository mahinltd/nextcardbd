// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import dotenv from 'dotenv';
import path from 'path';

/**
 * Loads environment variables from .env file.
 * It's crucial to run this before any other configuration or app logic.
 */
export const loadEnv = () => {
  const envPath = path.resolve(process.cwd(), '.env');
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.error('Error loading .env file:', result.error.message);
    console.warn('Warning: .env file not found or failed to load. Using system environment variables.');
  }

  // Optionally log loaded variables in dev mode (be careful with sensitive data)
  if (process.env.NODE_ENV === 'development') {
    // console.log('Environment variables loaded successfully.');
  }
};