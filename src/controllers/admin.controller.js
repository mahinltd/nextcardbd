import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Order } from '../models/order.model.js';
import { User } from '../models/user.model.js'; // <-- 1. Import User model
import { syncProductsFromSupplier } from '../services/supplier.service.js';
// --- 2. Import new email service ---
import { sendPaymentVerifiedToCustomer } from '../services/email.service.js';

/**
 * @desc    Trigger a manual product sync from the supplier
 * @route   POST /api/admin/sync-products
 * @access  Admin
 */
const syncProducts = asyncHandler(async (req, res) => {
  try {
    const syncResult = await syncProductsFromSupplier();
    return res
      .status(200)
      .json(new ApiResponse(200, syncResult, syncResult.summary || 'Product sync triggered successfully.'));
  } catch (error) {
    throw new ApiError(500, 'Product sync failed', error.message);
  }
});

/**
 * @desc    Get all orders that need verification (Status: 'Paid')
 * @route   GET /api/admin/orders
 * @access  Admin
 */
const getOrdersForVerification = asyncHandler(async (req, res) => {
  const orders = await Order.find({ status: 'Paid' })
    .sort({ submittedAt: 1 });

  if (!orders || orders.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], 'No orders are currently awaiting verification'));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, orders, 'Orders awaiting verification retrieved successfully'));
});

/**
 * @desc    Manually verify a payment
 * @route   PATCH /api/admin/orders/:id/verify
 * @access  Admin
 */
const verifyOrderPayment = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const { adminNotes } = req.body;

  const order = await Order.findOne({ orderId: orderId });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  if (order.status !== 'Paid') {
    throw new ApiError(400, `This order cannot be verified. Current status: ${order.status}`);
  }

  // --- 3. Find the customer to send email ---
  const customer = await User.findById(order.userId);
  if (!customer) {
    console.error(`Admin Verify: Customer not found for order ${order.orderId}. Cannot send email.`);
    // We don't stop the process, just log the error
  }

  // 4. Update the order status
  order.status = 'Verified';
  order.verifiedAt = new Date();
  if (adminNotes) {
    order.adminNotes = adminNotes;
  }
  await order.save({ validateBeforeSave: true });

  // --- 5. (NEW STEP) SEND EMAIL to Customer ---
  if (customer) {
    sendPaymentVerifiedToCustomer(order, customer).catch(err => console.error("Customer Verified Email Error:", err));
  }
  // -------------------------------------------

  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Payment successfully verified. Order moved to processing.'));
});

// --- Make sure all 3 functions are exported ---
export { 
  syncProducts,
  getOrdersForVerification, 
  verifyOrderPayment 
};