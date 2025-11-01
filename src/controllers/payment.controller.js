import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Order } from '../models/order.model.js';
import { User } from '../models/user.model.js';
import { generateQrCodeDataUri } from '../services/qr.service.js';
import { 
  sendNewOrderToAdmin, 
  sendOrderConfirmationToCustomer 
} from '../services/email.service.js';
import 'dotenv/config';

/**
 * @desc    Get all payment details for an order (MFS, Bank, QR)
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

  // --- 1. Get Mobile Banking (MFS) Details ---
  const receiverNumber = process.env.RECEIVER_NUMBER_BKASH || process.env.RECEIVER_NUMBER_NAGAD || 'N/A';
  
  const qrText = `
    NextCard BD Payment
    To: ${receiverNumber}
    Amount: ${order.totalAmount}
    Ref: ${order.orderId}
    Please send and submit TxID after payment.
  `.trim().replace(/\s+/g, '\n');

  const qrCodeDataUrl = await generateQrCodeDataUri(qrText);
  
  const mobileBankingDetails = {
    bKash: process.env.RECEIVER_NUMBER_BKASH,
    Nagad: process.env.RECEIVER_NUMBER_NAGAD,
    Rocket: process.env.RECEIVER_NUMBER_ROCKET,
  };

  // --- 2. (NEW) Get Bank Transfer Details ---
  const bankDetails = {
    bankName: process.env.BANK_NAME,
    branchName: process.env.BANK_BRANCH_NAME,
    accountName: process.env.BANK_ACCOUNT_NAME,
    accountNumber: process.env.BANK_ACCOUNT_NUMBER,
  };
  // --- END OF NEW ---

  // 5. Send back all info needed for the payment page
  const paymentInfo = {
    amount: order.totalAmount,
    reference: order.orderId,
    qrCodeDataUrl: qrCodeDataUrl,
    mobileBanking: mobileBankingDetails,
    bankTransfer: bankDetails, // <-- ADDED BANK DETAILS TO RESPONSE
  };

  return res
    .status(200)
    .json(new ApiResponse(200, paymentInfo, 'Payment details generated successfully'));
});


/**
 * @desc    Submit Transaction ID (TxID) for manual verification
 * @route   POST /api/orders/:id/payment
 * @access  Public
 */
const submitPayment = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const { transactionId, method } = req.body; // method can now be 'bKash', 'Bank', 'Card'

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
    throw new ApiError(404, 'Customer associated with this order not found.');
  }

  // 4. Update the order
  order.status = 'Paid'; // Update status for admin verification
  order.paymentDetails = {
    method: method,
    // receiverNumber is optional now, only applies to MFS
    receiverNumber: (method === 'bKash' || method === 'Nagad' || method === 'Rocket') 
                      ? process.env[`RECEIVER_NUMBER_${method.toUpperCase()}`] 
                      : null,
    transactionId: transactionId.trim(),
    submittedAt: new Date(),
  };

  await order.save({ validateBeforeSave: true });

  // 5. SEND EMAILS
  sendNewOrderToAdmin(order).catch(err => console.error("Admin Email Error:", err));
  sendOrderConfirmationToCustomer(order, customer).catch(err => console.error("Customer Email Error:", err));

  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Payment submitted successfully. Awaiting verification.'));
});

export { getPaymentQrCode, submitPayment };