// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import { ApiResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Get Manual Payment Configuration
 * Fetches the manual payment details from environment variables
 * to show them on the frontend checkout page.
 */
export const getPaymentMethods = (req, res, next) => {
  try {
    const paymentMethods = {
      currency: process.env.CURRENCY || 'BDT',
      supported: process.env.PAYMENT_METHODS ? process.env.PAYMENT_METHODS.split(',') : [],
      
      bkash: {
        number: process.env.BKASH_NUMBER,
        type: process.env.BKASH_ACCOUNT_TYPE,
      },
      nagad: {
        number: process.env.NAGAD_NUMBER,
        type: process.env.NAGAD_ACCOUNT_TYPE,
      },
      rocket: {
        number: process.env.ROCKET_NUMBER,
        type: process.env.ROCKET_ACCOUNT_TYPE,
      },
      bank: {
        name: process.env.BANK_NAME,
        branch: process.env.BANK_BRANCH,
        accountName: process.env.BANK_ACCOUNT_NAME,
        accountNumber: process.env.BANK_ACCOUNT_NUMBER,
        type: process.env.BANK_ACCOUNT_TYPE,
      }
    };

    ApiResponse.success(res, paymentMethods, 'Payment methods retrieved successfully.');

  } catch (error) {
    logger.error('Error fetching payment methods:', error);
    next(new ApiError(500, 'Could not retrieve payment configuration.'));
  }
};