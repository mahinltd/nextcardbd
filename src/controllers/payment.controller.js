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
 * @desc    Get all payment details FOR THE SELECTED METHOD
 * @route   GET /api/orders/:id/payment-details
 * @access  Public
 */
// --- We rename the function route for clarity ---
const getPaymentDetails = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  
  const order = await Order.findOne({ orderId: orderId });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.status !== 'Pending') {
    throw new ApiError(400, `This order is already ${order.status.toLowerCase()}`);
  }

  // --- THIS IS THE NEW LOGIC ---
  const selectedMethod = order.paymentDetails.method;
  let paymentInfo = {
    amount: order.totalAmount,
    reference: order.orderId,
    method: selectedMethod, // e.g., "bKash" or "Bank"
    details: {}, // This object will hold specific info
  };

  if (selectedMethod === 'bKash' || selectedMethod === 'Nagad' || selectedMethod === 'Rocket') {
    // --- 1. Customer selected MFS (bKash/Nagad) ---
    const primaryNumber = process.env[`RECEIVER_NUMBER_${selectedMethod.toUpperCase()}`];
    
    const qrText = `
      NextCard BD Payment
      To: ${primaryNumber}
      Amount: ${order.totalAmount}
      Ref: ${order.orderId}
    `.trim().replace(/\s+/g, '\n');

    const qrCodeDataUrl = await generateQrCodeDataUri(qrText);
    
    paymentInfo.details = {
      type: 'mfs',
      qrCode: qrCodeDataUrl,
      paymentNumber: primaryNumber,
    };

  } else if (selectedMethod === 'Bank' || selectedMethod === 'Card') {
    // --- 2. Customer selected Bank/Card ---
    paymentInfo.details = {
      type: 'bank',
      bankName: process.env.BANK_NAME,
      branchName: process.env.BANK_BRANCH_NAME,
      accountName: process.env.BANK_ACCOUNT_NAME,
      accountNumber: process.env.BANK_ACCOUNT_NUMBER,
    };
  } else {
    // Handle other cases like COD (though they shouldn't land here)
    throw new ApiError(400, 'Payment details are not applicable for this order type.');
  }
  // --- END OF NEW LOGIC ---

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
  const { transactionId } = req.body; // We only need TxID

  if (!transactionId) {
    throw new ApiError(400, 'Transaction ID (transactionId) is required');
  }

  const order = await Order.findOne({ orderId: orderId });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  if (order.status !== 'Pending') {
    throw new ApiError(400, `This order cannot be paid for. Status: ${order.status}`);
  }
  
  const existingTx = await Order.findOne({ 'paymentDetails.transactionId': transactionId });
  if (existingTx) {
    throw new ApiError(409, 'This Transaction ID has already been used.');
  }
  
  const customer = await User.findById(order.userId);
  if (!customer) {
    throw new ApiError(404, 'Customer associated with this order not found.');
  }

  // Update the order
  order.status = 'Paid';
  order.paymentDetails.transactionId = transactionId.trim();
  order.paymentDetails.submittedAt = new Date();
  
  // Add receiver number if it was MFS
  const method = order.paymentDetails.method;
  if (method === 'bKash' || method === 'Nagad' || method === 'Rocket') {
     order.paymentDetails.receiverNumber = process.env[`RECEIVER_NUMBER_${method.toUpperCase()}`];
  }

  await order.save({ validateBeforeSave: true });

  // SEND EMAILS
  sendNewOrderToAdmin(order).catch(err => console.error("Admin Email Error:", err));
  sendOrderConfirmationToCustomer(order, customer).catch(err => console.error("Customer Email Error:", err));

  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Payment submitted successfully. Awaiting verification.'));
});

// --- Make sure to export the correct function name ---
export { getPaymentDetails, submitPayment };