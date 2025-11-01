import { Resend } from 'resend';
import 'dotenv/config';

// 1. Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// ---CONFIGURATION---
const TEST_SENDER_EMAIL = 'onboarding@resend.dev';
const ADMIN_RECEIVER_EMAIL = process.env.ADMIN_RECEIVER_EMAIL;
const PRODUCTION_SENDER_EMAIL = 'support@nextcardbd.com'; // TODO: Change this later
const REPLY_TO_EMAIL = 'help.nextcardbd@gmail.com';
const isDomainVerified = (SENDER_EMAIL !== 'onboarding@resend.dev');

// Helper function to decide WHERE to send the email
const getRecipientEmail = (customerEmail) => {
  if (isDomainVerified) {
    return customerEmail;
  }
  return ADMIN_RECEIVER_EMAIL; // Send ALL emails to admin for testing
};

/**
 * --- FOR ADMIN ---
 * Sends a new order notification to the admin's email.
 * (Used for BOTH Online Payment and COD)
 */
export const sendNewOrderToAdmin = async (order) => {
  if (!ADMIN_RECEIVER_EMAIL) {
    console.error('Admin receiver email is not set in .env');
    return;
  }

  // Customize subject based on payment method
  const subject = (order.paymentDetails.method === 'COD')
    ? `[New COD Order] Order #${order.orderId} - ৳${order.totalAmount}`
    : `[New Order Alert] Order #${order.orderId} - ৳${order.totalAmount}`;

  try {
    await resend.emails.send({
      from: `NextCard BD (Admin) <${TEST_SENDER_EMAIL}>`,
      to: [ADMIN_RECEIVER_EMAIL],
      reply_to: REPLY_TO_EMAIL,
      subject: subject,
      html: `
        <h2>New Order Received!</h2>
        <p>A new order has been submitted.</p>
        <ul>
          <li><strong>Order ID:</strong> ${order.orderId}</li>
          <li><strong>Total Amount:</strong> ৳${order.totalAmount}</li>
          <li><strong>Payment Method:</strong> ${order.paymentDetails.method}</li>
          <li><strong>Status:</strong> ${order.status}</li>
          <li><strong>TxID:</strong> ${order.paymentDetails?.transactionId || 'N/A'}</li>
        </ul>
        <p>Please check the admin panel for details.</p>
      `,
    });
    console.log(`Admin notification email sent for Order: ${order.orderId}`);
  } catch (error) {
    console.error(`Failed to send admin email for ${order.orderId}:`, error);
  }
};

/**
 * --- (NEW) FOR CUSTOMER (COD Order) ---
 * Sends a confirmation email for a new COD order.
 */
export const sendCodOrderConfirmationToCustomer = async (order, user) => {
  const recipientEmail = getRecipientEmail(user.email);
  if (!recipientEmail) {
    console.error(`Customer email recipient is not set.`);
    return;
  }

  try {
    await resend.emails.send({
      from: `NextCard BD Support <${TEST_SENDER_EMAIL}>`,
      to: [recipientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: `Your NextCard BD Order #${order.orderId} is Confirmed! (COD)`,
      html: `
        <h2>Thank You for Your Order, ${user.name}!</h2>
        <p>Your <strong>Cash on Delivery (COD)</strong> order has been confirmed and is now being processed.</p>
        <p>Our delivery agent will contact you soon. Please keep the exact amount (৳${order.totalAmount}) ready.</p>
        <hr />
        <h3>Order Summary</h3>
        <ul>
          <li><strong>Order ID:</strong> ${order.orderId}</li>
          <li><strong>Total Amount:</strong> ৳${order.totalAmount}</li>
          <li><strong>Payment Method:</strong> Cash on Delivery</li>
          <li><strong>Status:</strong> ${order.status}</li>
        </ul>
      `,
    });
    console.log(`Customer COD confirmation email sent for Order: ${order.orderId}`);
  } catch (error) {
    console.error(`Failed to send customer COD email for ${order.orderId}:`, error);
  }
};


/**
 * --- FOR CUSTOMER (Online Payment) ---
 * Sends an order confirmation email after TxID submission.
 */
export const sendOrderConfirmationToCustomer = async (order, user) => {
  const recipientEmail = getRecipientEmail(user.email);
  if (!recipientEmail) {
    console.error(`Customer email recipient is not set.`);
    return;
  }

  try {
    await resend.emails.send({
      from: `NextCard BD Support <${TEST_SENDER_EMAIL}>`,
      to: [recipientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: `Your NextCard BD Order #${order.orderId} is Awaiting Verification`,
      html: `
        <h2>Thank You for Your Order, ${user.name}!</h2>
        <p>We have received your payment submission. Your order is now being manually verified.</p>
        <p>(This is a test email. If you are the admin, you are receiving this on behalf of the customer: ${user.email})</p>
        <hr />
        <h3>Order Summary</h3>
        <ul>
          <li><strong>Order ID:</strong> ${order.orderId}</li>
          <li><strong>Total Amount:</strong> ৳${order.totalAmount}</li>
          <li><strong>Status:</strong> ${order.status}</li>
        </ul>
      `,
    });
    console.log(`Customer confirmation email sent for Order: ${order.orderId}`);
  } catch (error) {
    console.error(`Failed to send customer email for ${order.orderId}:`, error);
  }
};

/**
 * --- FOR CUSTOMER (Verified) ---
 * Sends an email after payment is verified by admin.
 */
export const sendPaymentVerifiedToCustomer = async (order, user) => {
  const recipientEmail = getRecipientEmail(user.email);
  if (!recipientEmail) {
    console.error(`Customer email recipient is not set.`);
    return;
  }

  try {
    await resend.emails.send({
      from: `NextCard BD Support <${TEST_SENDER_EMAIL}>`,
      to: [recipientEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: `Your NextCard BD Order #${order.orderId} has been Confirmed!`,
      html: `
        <h2>Great News, ${user.name}!</h2>
        <p>Your payment for Order #${order.orderId} has been successfully verified by our team.</p>
        <p>(This is a test email. If you are the admin, you are receiving this on behalf of the customer: ${user.email})</p>
        <hr />
        <h3>Order Details</h3>
        <ul>
          <li><strong>Order ID:</strong> ${order.orderId}</li>
          <li><strong>Total Amount:</strong> ৳${order.totalAmount}</li>
          <li><strong>Status:</strong> ${order.status}</li>
        </ul>
      `,
    });
    console.log(`Customer "Payment Verified" email sent for Order: ${order.orderId}`);
  } catch (error) {
    console.error(`Failed to send "Payment Verified" email for ${order.orderId}:`, error);
  }
};