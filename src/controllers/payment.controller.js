import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Order } from '../models/order.model.js';
import { User } from '../models/user.model.js'; // <-- 1. Import User model
import { generateQrCodeDataUri } from '../services/qr.service.js';
// --- 2. Import new email services ---
import { 
  sendNewOrderToAdmin, 
  sendOrderConfirmationToCustomer 
} from '../services/email.service.js';
import 'dotenv/config';

/**
 * @desc    Generate payment QR code for an order
 * @route   GET /api/orders/:id/payment-qr
 * @access  Public
 */
const getPaymentQrCode = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  
  const order = await Order.findOne({ orderId: orderId });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.status !== 'Pending') {
    throw new ApiError(400, `This order is already ${order.status.toLowerCase()}`);
  }

  const receiverNumber = process.env.RECEIVER_NUMBER_BKASH || process.env.RECEIVER_NUMBER_NAGAD || 'N/A';
  
  const qrText = `
    NextCard BD Payment
    To: ${receiverNumber}
    Amount: ${order.totalAmount}
    Ref: ${order.orderId}
    Please send and submit TxID after payment.
  `.trim().replace(/\s+/g, '\n');

  const qrCodeDataUrl = await generateQrCodeDataUri(qrText);

  const paymentInfo = {
    receiverNumber: receiverNumber,
    amount: order.totalAmount,
    reference: order.orderId,
    qrCodeDataUrl: qrCodeDataUrl,
    allReceiverNumbers: {
      bKash: process.env.RECEIVER_NUMBER_BKASH,
      Nagad: process.env.RECEIVER_NUMBER_NAGAD,
      Rocket: process.env.RECEIVER_NUMBER_ROCKET,
    }
  };

  return res
    .status(200)
    .json(new ApiResponse(200, paymentInfo, 'Payment details generated successfully'));
});


/**
 * @desc    Submit Transaction ID (TxID) for manual verification
 * @route   POST /api/orders/:id/payment
 * @access  Public (but we find the user associated with the order)
 */
const submitPayment = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const { transactionId, method } = req.body;

  if (!transactionId || !method) {
    throw new ApiError(400, 'Transaction ID (transactionId) and Method (method) are required');
  }

  // 1. Find the order
  const order = await Order.findOne({ orderId: orderId });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.status !== 'Pending') {
    throw new ApiError(400, `This order cannot be paid for. Status: ${order.status}`);
  }
  
  // 2. Check for duplicate TxID
  const existingTx = await Order.findOne({ 'paymentDetails.transactionId': transactionId });
  if (existingTx) {
    throw new ApiError(409, 'This Transaction ID has already been used.');
  }
  
  // 3. Find the customer who placed this order
  const customer = await User.findById(order.userId);
  if (!customer) {
    // This should not happen if our order system is working correctly
    throw new ApiError(404, 'Customer associated with this order not found.');
  }

  // 4. Get the correct receiver number
  let receiverNumber = '';
  if (method === 'bKash') receiverNumber = process.env.RECEIVER_NUMBER_BKASH;
  else if (method === 'Nagad') receiverNumber = process.env.RECEIVER_NUMBER_NAGAD;
  else if (method === 'Rocket') receiverNumber = process.env.RECEIVER_NUMBER_ROCKET;
  else throw new ApiError(400, 'Invalid payment method selected');

  // 5. Update the order
  order.status = 'Paid'; // Update status for admin verification
  order.paymentDetails = {
    method: method,
    receiverNumber: receiverNumber,
    transactionId: transactionId.trim(),
    submittedAt: new Date(),
  };

  await order.save({ validateBeforeSave: true });

  // --- 6. (NEW STEP) SEND EMAILS ---
  // We don't need to wait for emails to be sent to respond to the user
  // This happens in the background
  sendNewOrderToAdmin(order).catch(err => console.error("Admin Email Error:", err));
  sendOrderConfirmationToCustomer(order, customer).catch(err => console.error("Customer Email Error:", err));
  // ---------------------------------

  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Payment submitted successfully. Awaiting verification.'));
});

export { getPaymentQrCode, submitPayment };