import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Order } from '../models/order.model.js';
import { Product } from '../models/product.model.js';
import { generateOrderId } from '../utils/generateOrderId.js';

/**
 * @desc    Create a new order
 * @route   POST /api/orders
 * @access  Public
 */
const createOrder = asyncHandler(async (req, res) => {
  const { customerDetails, items } = req.body;

  // 1. Validation
  if (!customerDetails || !customerDetails.name || !customerDetails.phone || !customerDetails.address) {
    throw new ApiError(400, 'Customer details (name, phone, address) are required');
  }
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

    // Add to total amount using the secure sellPrice from the DB
    totalAmount += product.sellPrice * item.quantity;

    processedItems.push({
      productId: product._id,
      quantity: item.quantity,
      price: product.sellPrice, // Store the price at the time of order
    });
  }
  
  // 3. Generate a unique Order ID
  // We'll try a few times in case of a rare collision
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

  // 4. Create and save the new order
  const newOrder = await Order.create({
    orderId,
    customerDetails,
    items: processedItems,
    totalAmount,
    status: 'Pending',
  });

  if (!newOrder) {
    throw new ApiError(500, 'Failed to create the order');
  }

  // 5. Respond with the created order (frontend needs this)
  return res
    .status(201)
    .json(new ApiResponse(201, newOrder, 'Order created successfully. Awaiting payment.'));
});

/**
 * @desc    Get order details by ID
 * @route   GET /api/orders/:id
 * @access  Public (or secured)
 */
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    // Find by our custom 'orderId' (e.g., ORD-12345), NOT the database '_id'
    orderId: req.params.id, 
  }).populate('items.productId', 'name images'); // Show product name/image

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Order retrieved successfully'));
});

export { createOrder, getOrderById };