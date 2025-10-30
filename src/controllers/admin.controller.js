import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Order } from '../models/order.model.js';
import { syncProductsFromSupplier } from '../services/supplier.service.js'; // <-- 1. Import new service

/**
 * @desc    Trigger a manual product sync from the supplier
 * @route   POST /api/admin/sync-products
 * @access  Admin
 */
const syncProducts = asyncHandler(async (req, res) => {
  try {
    // Run the sync service
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

  order.status = 'Verified';
  order.verifiedAt = new Date();
  if (adminNotes) {
    order.adminNotes = adminNotes;
  }
  await order.save({ validateBeforeSave: true });

  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Payment successfully verified. Order moved to processing.'));
});

// --- Make sure all 3 functions are exported ---
export { 
  syncProducts, // <-- 2. Export new function
  getOrdersForVerification, 
  verifyOrderPayment 
};