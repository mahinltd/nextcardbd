import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Order } from '../models/order.model.js';
import { generateQrCodeDataUri } from '../services/qr.service.js';
import 'dotenv/config';

/**
 * @desc    Generate payment QR code for an order
 * @route   GET /api/orders/:id/payment-qr
 * @access  Public
 */
const getPaymentQrCode = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  
  // 1. Find the order by its 'orderId' (e.g., ORD-12345)
  const order = await Order.findOne({ orderId: orderId });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.status !== 'Pending') {
    throw new ApiError(400, `This order is already ${order.status.toLowerCase()}`);
  }

  // 2. Get a receiver number (default to bKash or first available)
  const receiverNumber = process.env.RECEIVER_NUMBER_BKASH || process.env.RECEIVER_NUMBER_NAGAD || 'N/A';
  
  // 3. Create the text payload for the QR code as per your plan
  const qrText = `
    NextCard BD Payment
    To: ${receiverNumber}
    Amount: ${order.totalAmount}
    Ref: ${order.orderId}
    Please send and submit TxID after payment.
  `.trim().replace(/\s+/g, '\n'); // Clean up whitespace

  // 4. Generate the QR code data URI
  const qrCodeDataUrl = await generateQrCodeDataUri(qrText);

  // 5. Send back all info needed for the payment page
  const paymentInfo = {
    receiverNumber: receiverNumber,
    amount: order.totalAmount,
    reference: order.orderId,
    qrCodeDataUrl: qrCodeDataUrl,
    // Send all available numbers for the "Pay by Number" option
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
 * @access  Public
 */
const submitPayment = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const { transactionId, method } = req.body; // e.g., method: "bKash"

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
  
  // 2. Check for duplicate TxID (Security Rule)
  const existingTx = await Order.findOne({ 'paymentDetails.transactionId': transactionId });
  if (existingTx) {
    throw new ApiError(409, 'This Transaction ID has already been used. Please check and try again.'); // 409 Conflict
  }
  
  // 3. Get the correct receiver number for the chosen method
  let receiverNumber = '';
  if (method === 'bKash') receiverNumber = process.env.RECEIVER_NUMBER_BKASH;
  else if (method === 'Nagad') receiverNumber = process.env.RECEIVER_NUMBER_NAGAD;
  else if (method === 'Rocket') receiverNumber = process.env.RECEIVER_NUMBER_ROCKET;
  else throw new ApiError(400, 'Invalid payment method selected');

  // 4. Update the order
  order.status = 'Paid'; // Update status for admin verification
  order.paymentDetails = {
    method: method,
    receiverNumber: receiverNumber,
    transactionId: transactionId.trim(),
    submittedAt: new Date(),
  };

  await order.save({ validateBeforeSave: true });

  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Payment submitted successfully. Awaiting verification.'));
});

export { getPaymentQrCode, submitPayment };