// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import logger from '../utils/logger.js';

/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * This defines which frontend domains are allowed to access our backend API.
 */

// Define the domains that are allowed to make requests to our API
const allowedOrigins = [
  // Production Frontend Domain
  process.env.APP_URL, // From .env: https://nextcardbd.mahinltd.tech

  // Development Domains
  'http://localhost:5173', // For React/Vite dev
  'http://localhost:3000', // For React (CRA) dev
];

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    // Or if the origin is in our allowed list
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS Error: Blocked origin -> ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allows cookies/tokens to be sent
  optionsSuccessStatus: 200, // For legacy browsers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};
