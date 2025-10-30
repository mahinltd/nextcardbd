import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Order } from '../models/order.model.js';
import { Product } from '../models/product.model.js';
import { generateOrderId } from '../utils/generateOrderId.js';

/**
 * @desc    Create a new order
 * @route   POST /api/orders
 * @access  Private (User must be logged in)
 */
const createOrder = asyncHandler(async (req, res) => {
  // We get 'items' from the body
  const { items } = req.body;
  
  // We get 'userId' from the 'protect' middleware (req.user)
  const userId = req.user._id;

  // 1. Validation
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Order items (cart) cannot be empty');
  }

  let totalAmount = 0;
  const processedItems = [];

  // 2. Process items: Check stock and calculate total amount from DB prices
  for (const item of items) {
    if (!item.productId || !item.quantity) {
      throw new ApiError(400, `Invalid item data: ${JSON.stringify(item)}`);
    }

    const product = await Product.findById(item.productId);
    if (!product) {
      throw new ApiError(404, `Product not found: ${item.productId}`);
    }
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Not enough stock for ${product.name}. Available: ${product.stock}`);
    }

    totalAmount += product.sellPrice * item.quantity;
    processedItems.push({
      productId: product._id,
      quantity: item.quantity,
      price: product.sellPrice,
    });
  }
  
  // 3. Generate a unique Order ID
  let orderId = '';
  let isOrderIdUnique = false;
  for (let i = 0; i < 5; i++) {
    orderId = generateOrderId();
    const existingOrder = await Order.findOne({ orderId });
    if (!existingOrder) {
      isOrderIdUnique = true;
      break;
    }
  }
  if (!isOrderIdUnique) {
    throw new ApiError(500, 'Failed to generate a unique order ID. Please try again.');
  }

  // 4. Create and save the new order (now linked to userId)
  const newOrder = await Order.create({
    orderId,
    userId: userId, // <-- This is the new change
    items: processedItems,
    totalAmount,
    status: 'Pending',
  });

  if (!newOrder) {
    throw new ApiError(500, 'Failed to create the order');
  }

  return res
    .status(201)
    .json(new ApiResponse(201, newOrder, 'Order created successfully. Awaiting payment.'));
});

/**
 * @desc    Get order details by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    orderId: req.params.id,
    userId: req.user._id // <-- User can only get their OWN order
  }).populate('items.productId', 'name images'); 

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Order retrieved successfully'));
});

/**
 * @desc    Get all orders for the logged-in user
 * @route   GET /api/orders/myorders
 * @access  Private
 */
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
  
  return res
    .status(200)
    .json(new ApiResponse(200, orders, 'My orders retrieved successfully'));
});

export { createOrder, getOrderById, getMyOrders };