// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import { Resend } from 'resend';
import logger from '../utils/logger.js';
import { ApiError } from '../utils/apiResponse.js';

let resend;

// Initialize Resend client
try {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not defined in .env');
  }
  resend = new Resend(process.env.RESEND_API_KEY);
  logger.info('Resend email service initialized.');
} catch (error) {
  logger.error('Failed to initialize Resend service:', error.message);
  // We don't exit the process, but email sending will fail.
}

/**
 * Sends an email using the Resend service.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The email subject line.
 * @param {string} htmlBody - The HTML content of the email.
 * @param {string} fromEmail - (Optional) The 'from' email. Defaults to CUSTOMER_FROM_EMAIL.
 * @returns {Promise<object>} - The response from the Resend API.
 */
export const sendEmail = async (to, subject, htmlBody, fromEmail = null) => {
  if (!resend) {
    logger.error('Resend service is not initialized. Cannot send email.');
    throw new ApiError(500, 'Email service is not configured.');
  }

  const from = fromEmail || process.env.CUSTOMER_FROM_EMAIL;
  if (!from) {
    logger.error('CUSTOMER_FROM_EMAIL is not set in .env.');
    throw new ApiError(500, 'Email sender address is not configured.');
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `NexCartBD <${from}>`,
      to: [to],
      subject: subject,
      html: htmlBody,
    });

    if (error) {
      logger.error('Failed to send email:', error);
      throw new ApiError(500, `Failed to send email: ${error.message}`);
    }

    logger.info(`Email sent successfully to ${to} with ID: ${data.id}`);
    return data;
  } catch (error) {
    logger.error('Error in sendEmail function:', error);
    if (!(error instanceof ApiError)) {
      throw new ApiError(500, 'An unexpected error occurred while sending email.');
    }
    throw error;
  }
};

// --- Specific Email Sending Functions ---

/**
 * Sends an email notification to the admin.
 */
export const sendAdminNotification = async (subject, htmlBody) => {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (adminEmail) {
    await sendEmail(adminEmail, subject, htmlBody);
  } else {
    logger.warn('ADMIN_NOTIFY_EMAIL not set. Skipping admin notification.');
  }
};