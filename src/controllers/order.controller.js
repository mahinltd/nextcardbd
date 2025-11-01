import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Order } from '../models/order.model.js';
import { Product } from '../models/product.model.js';
import { generateOrderId } from '../utils/generateOrderId.js';

/**
 * @desc    Create a new order (with Shipping Address)
 * @route   POST /api/orders
 * @access  Private (User must be logged in)
 */
const createOrder = asyncHandler(async (req, res) => {
  // --- 1. Get all required data from body and user ---
  const { items, paymentMethod, shippingAddress } = req.body;
  const userId = req.user._id;

  // --- 2. Validation ---
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Order items (cart) cannot be empty');
  }
  if (!paymentMethod) {
    throw new ApiError(400, 'Payment method is required');
  }
  if (
    !shippingAddress ||
    !shippingAddress.name ||
    !shippingAddress.phone ||
    !shippingAddress.address
  ) {
    throw new ApiError(400, 'Shipping address (name, phone, address) is required');
  }

  let totalAmount = 0;
  const processedItems = [];

  // --- 3. Process items: Check stock and calculate total amount ---
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

    const itemPrice = product.sellPrice * item.quantity;
    totalAmount += itemPrice;

    processedItems.push({
      productId: product._id,
      name: item.name || product.name, // Use name from cart (e.g., with Size)
      image: item.image || (product.images.length > 0 ? product.images[0] : ''),
      quantity: item.quantity,
      price: product.sellPrice, // Store the price per unit
    });
  }
  
  // --- 4. Generate a unique Order ID ---
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

  // --- 5. Set status based on paymentMethod ---
  const orderStatus = (paymentMethod === 'COD') ? 'Processing' : 'Pending';
  
  // --- 6. Create and save the new order ---
  const newOrder = await Order.create({
    orderId,
    userId: userId,
    shippingAddress: shippingAddress, // <-- SAVE THE SHIPPING ADDRESS
    items: processedItems,
    totalAmount: totalAmount,
    status: orderStatus,
    paymentDetails: { 
      method: paymentMethod 
    },
  });

  if (!newOrder) {
    throw new ApiError(500, 'Failed to create the order');
  }

  return res
    .status(201)
    .json(new ApiResponse(201, newOrder, 'Order created successfully.'));
});


// --- (The following functions remain unchanged) ---

/**
 * @desc    Get order details by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    orderId: req.params.id,
    userId: req.user._id 
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