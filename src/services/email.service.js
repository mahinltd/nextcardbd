import { Resend } from 'resend';
import 'dotenv/config';

// 1. Initialize Resend with your API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// This is the "verified sender" Resend provides for free plan testing
const SENDER_EMAIL = 'onboarding@resend.dev';

// This is your actual email for replies
const REPLY_TO_EMAIL = 'help.nextcardbd@gmail.com';

/**
 * --- FOR ADMIN ---
 * Sends a new order notification to the admin's email.
 */
export const sendNewOrderToAdmin = async (order) => {
  const adminEmail = process.env.ADMIN_RECEIVER_EMAIL;
  if (!adminEmail) {
    console.error('Admin receiver email is not set in .env');
    return;
  }

  try {
    await resend.emails.send({
      from: `NextCard BD (Admin) <${SENDER_EMAIL}>`,
      to: [adminEmail],
      reply_to: REPLY_TO_EMAIL,
      subject: `[New Order Alert] Order #${order.orderId} - ৳${order.totalAmount}`,
      html: `
        <h2>New Order Received!</h2>
        <p>A new order has been submitted and is awaiting payment verification.</p>
        <ul>
          <li><strong>Order ID:</strong> ${order.orderId}</li>
          <li><strong>Total Amount:</strong> ৳${order.totalAmount}</li>
          <li><strong>Status:</strong> ${order.status}</li>
          <li><strong>TxID:</strong> ${order.paymentDetails?.transactionId || 'N/A'}</li>
          <li><strong>Method:</strong> ${order.paymentDetails?.method || 'N/A'}</li>
        </ul>
        <p>Please log in to the admin panel to verify this payment.</p>
      `,
    });
    console.log(`Admin notification email sent for Order: ${order.orderId}`);
  } catch (error) {
    console.error(`Failed to send admin email for ${order.orderId}:`, error);
  }
};

/**
 * --- FOR CUSTOMER ---
 * Sends an order confirmation email to the customer after TxID submission.
 */
export const sendOrderConfirmationToCustomer = async (order, user) => {
  if (!user.email) {
    console.error(`Customer for order ${order.orderId} has no email.`);
    return;
  }

  try {
    await resend.emails.send({
      from: `NextCard BD Support <${SENDER_EMAIL}>`,
      to: [user.email],
      reply_to: REPLY_TO_EMAIL,
      subject: `Your NextCard BD Order #${order.orderId} is Awaiting Verification`,
      html: `
        <h2>Thank You for Your Order, ${user.name}!</h2>
        <p>We have received your payment submission. Your order is now being manually verified.</p>
        <p>You will receive another email as soon as your payment is confirmed.</p>
        <hr />
        <h3>Order Summary</h3>
        <ul>
          <li><strong>Order ID:</strong> ${order.orderId}</li>
          <li><strong>Total Amount:</strong> ৳${order.totalAmount}</li>
          <li><strong>Status:</strong> ${order.status}</li>
          <li><strong>Transaction ID:</strong> ${order.paymentDetails?.transactionId}</li>
        </ul>
        <p>Thank you for shopping with NextCard BD!</p>
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
  if (!user.email) {
    console.error(`Customer for order ${order.orderId} has no email.`);
    return;
  }

  try {
    await resend.emails.send({
      from: `NextCard BD Support <${SENDER_EMAIL}>`,
      to: [user.email],
      reply_to: REPLY_TO_EMAIL,
      subject: `Your NextCard BD Order #${order.orderId} has been Confirmed!`,
      html: `
        <h2>Great News, ${user.name}!</h2>
        <p>Your payment for Order #${order.orderId} has been successfully verified by our team.</p>
        <p>Your order is now being processed and will be shipped soon.</p>
        <hr />
        <h3>Order Details</h3>
        <ul>
          <li><strong>Order ID:</strong> ${order.orderId}</li>
          <li><strong>Total Amount:</strong> ৳${order.totalAmount}</li>
          <li><strong>Status:</strong> ${order.status}</li>
        </ul>
        <p>Thank you for shopping with NextCard BD!</p>
      `,
    });
    console.log(`Customer "Payment Verified" email sent for Order: ${order.orderId}`);
  } catch (error) {
    console.error(`Failed to send "Payment Verified" email for ${order.orderId}:`, error);
  }
};