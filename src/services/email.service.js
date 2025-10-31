import nodemailer from 'nodemailer';
import 'dotenv/config';

// 1. Create a "transporter" object using Gmail and your App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER, // help.nextcardbd@gmail.com
    pass: process.env.EMAIL_APP_PASSWORD, // Your 16-digit App Password
  },
});

/**
 * --- FOR ADMIN ---
 * Sends a new order notification to the admin's email.
 * @param {object} order - The newly created order object.
 */
export const sendNewOrderToAdmin = async (order) => {
  const adminEmail = process.env.ADMIN_RECEIVER_EMAIL; // notifications.nextcardbd@gmail.com
  if (!adminEmail) {
    console.error('Admin receiver email is not set in .env');
    return;
  }

  const mailOptions = {
    from: `"NextCard BD (Admin)" <${process.env.EMAIL_SENDER}>`,
    to: adminEmail,
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
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Admin notification email sent for Order: ${order.orderId}`);
  } catch (error) {
    console.error(`Failed to send admin email for ${order.orderId}:`, error);
  }
};

/**
 * --- FOR CUSTOMER ---
 * Sends an order confirmation email to the customer after TxID submission.
 * @param {object} order - The order object.
 * @param {object} user - The user object (must contain email and name).
 */
export const sendOrderConfirmationToCustomer = async (order, user) => {
  if (!user.email) {
    console.error(`Customer for order ${order.orderId} has no email.`);
    return;
  }

  const mailOptions = {
    from: `"NextCard BD Support" <${process.env.EMAIL_SENDER}>`, // From help.nextcardbd@gmail.com
    to: user.email,
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
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Customer confirmation email sent for Order: ${order.orderId}`);
  } catch (error) {
    console.error(`Failed to send customer email for ${order.orderId}:`, error);
  }
};

/**
 * --- FOR CUSTOMER (Verified) ---
 * Sends an email after payment is verified by admin.
 * @param {object} order - The order object.
 * @param {object} user - The user object.
 */
export const sendPaymentVerifiedToCustomer = async (order, user) => {
  if (!user.email) {
    console.error(`Customer for order ${order.orderId} has no email.`);
    return;
  }

   const mailOptions = {
    from: `"NextCard BD Support" <${process.env.EMAIL_SENDER}>`,
    to: user.email,
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
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Customer "Payment Verified" email sent for Order: ${order.orderId}`);
  } catch (error) {
    console.error(`Failed to send "Payment Verified" email for ${order.orderId}:`, error);
  }
};