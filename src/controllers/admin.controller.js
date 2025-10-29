import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Order } from '../models/order.model.js';

/**
 * @desc    Get all orders that need verification (Status: 'Paid')
 * @route   GET /api/admin/orders
 * @access  Admin
 */
const getOrdersForVerification = asyncHandler(async (req, res) => {
  // Find all orders that are 'Paid' but not yet 'Verified'
  const orders = await Order.find({ status: 'Paid' })
    .sort({ submittedAt: 1 }); // Show oldest paid orders first

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
  const { adminNotes } = req.body; // Optional notes from admin

  // Find by our custom 'orderId'
  const order = await Order.findOne({ orderId: orderId });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if the order is in the correct state to be verified
  if (order.status !== 'Paid') {
    throw new ApiError(400, `This order cannot be verified. Current status: ${order.status}`);
  }

  // Update the order status
  order.status = 'Verified'; // This is the verification step
  order.verifiedAt = new Date();
  if (adminNotes) {
    order.adminNotes = adminNotes;
  }

  await order.save({ validateBeforeSave: true });

  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Payment successfully verified. Order moved to processing.'));
});

export { getOrdersForVerification, verifyOrderPayment };