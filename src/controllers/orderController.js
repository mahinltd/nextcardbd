// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { ApiError, ApiResponse } from '../utils/apiResponse.js';
import { sendEmail, sendAdminNotification } from '../services/emailService.js';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';

// Helper function to read and prepare email templates
const readOrderTemplate = async (templateName, replacements) => {
  try {
    const templatePath = path.resolve(process.cwd(), `src/templates/${templateName}`);
    let html = await fs.readFile(templatePath, 'utf-8');
    Object.keys(replacements).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, replacements[key]);
    });
    return html;
  } catch (error) {
    logger.error(`Error reading email template ${templateName}:`, error);
    throw new ApiError(500, 'Could not generate email content.');
  }
};

// Helper: Generate a unique Order ID (e.g., NCBD-20251105-1001)
const generateOrderId = async () => {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, ''); // 20251105
  
  // Find count of orders from today to get the next sequence number
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todayOrderCount = await Order.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
  const sequence = (todayOrderCount + 1).toString().padStart(4, '0'); // 0001
  
  return `NCBD-${yyyymmdd}-${sequence}`;
};

// ===============================================
// CUSTOMER CONTROLLERS
// ===============================================

/**
 * 1. Create New Order (Customer)
 * --- THIS FUNCTION IS NOW FIXED ---
 */
export const createOrder = async (req, res, next) => {
  const {
    orderItems,
    shippingAddress,
    paymentDetails,
    totalAmount, // <-- We now also accept the grand total
  } = req.body;

  try {
    const user = req.user; // From 'protect' middleware

    if (!orderItems || orderItems.length === 0) {
      return next(new ApiError(400, 'No order items provided.'));
    }

    let calculatedProductTotal = 0; // Renamed for clarity
    const itemsToSave = [];

    // Loop through items to get fresh price/buyPrice from DB
    for (const item of orderItems) {
      // --- FIX 1: Robust Product ID checking ---
      // Check for 'productId' (from your last fix) OR 'product' (from my previous fix)
      const productId = item.productId || item.product; 
      
      if (!productId) {
         return next(new ApiError(400, 'Product ID is missing from one or more items.'));
      }
      
      const product = await Product.findById(productId);
      if (!product) {
        return next(new ApiError(404, `Product not found: ${productId}`));
      }
      
      const price = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
      calculatedProductTotal += price * item.quantity;
      
      itemsToSave.push({
        product: productId, // Save the correct ID
        title: product.title_en,
        quantity: item.quantity,
        price: price,
        buyPrice: product.buyPrice,
        color: item.color,
        size: item.size,
      });
    }

    // --- FIX 2: Correct Price Validation (Including Shipping) ---
    
    // Get the grand total (including shipping) sent from the frontend
    const frontendGrandTotal = totalAmount || paymentDetails.amount;
    
    // Calculate the shipping cost based on the difference
    const calculatedShippingCost = frontendGrandTotal - calculatedProductTotal;

    // Security Check 1: Ensure user isn't cheating (e.g., total 800 for 999 product)
    if (calculatedShippingCost < 0) {
        logger.warn(`Price mismatch for user ${user.email}. Products: ${calculatedProductTotal}, Total Paid: ${frontendGrandTotal}`);
        return next(new ApiError(400, 'Payment amount is less than the product total.'));
    }

    // Security Check 2: Ensure the payment amount matches the (now verified) grand total
    // (e.g., 1129 === 1129)
    if (frontendGrandTotal !== paymentDetails.amount) {
        logger.warn(`Price mismatch for user ${user.email}. Grand Total: ${frontendGrandTotal}, Payment Amount: ${paymentDetails.amount}`);
        return next(new ApiError(400, 'Total amount and payment amount do not match.'));
    }
    // --- END OF FIX 2 ---

    // Create the order
    const newOrder = new Order({
      orderId: await generateOrderId(),
      user: user._id,
      items: itemsToSave,
      shippingAddress,
      paymentDetails,
      totalAmount: frontendGrandTotal, // <-- Save the correct Grand Total
      // totalBuyAmount and totalProfit will be calculated by pre-save hook
      // orderStatus and shippingUpdates will be set by pre-save hook
    });

    const savedOrder = await newOrder.save();

    // Send confirmation email to customer
    const customerHtml = await readOrderTemplate('orderConfirmation.html', {
      CUSTOMER_NAME: shippingAddress.fullName,
      ORDER_ID: savedOrder.orderId,
      ORDER_STATUS: savedOrder.orderStatus,
    });
    await sendEmail(
      user.email,
      `Your NexCartBD Order is Confirmed! (ID: ${savedOrder.orderId})`,
      customerHtml
    );

    // Send notification email to admin
    await sendAdminNotification(
      `New Order Received: ${savedOrder.orderId}`,
      `<p>A new order has been placed by ${user.email}.</p>
       <p>Order ID: ${savedOrder.orderId}</p>
       <p>Amount: ${savedOrder.totalAmount} BDT</p>
       <p>Payment Method: ${savedOrder.paymentDetails.paymentMethod}</p>
       <p>TnxID: ${savedOrder.paymentDetails.transactionId}</p>
       <p>Please log in to the admin panel to verify.</p>`
    );

    ApiResponse.success(res, savedOrder, 'Order placed successfully.', 201);

  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get My Orders (Customer)
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .select('orderId orderStatus totalAmount createdAt') // Select only summary fields
      .sort({ createdAt: -1 });
      
    ApiResponse.success(res, orders, 'Your orders retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get My Order By ID (Customer)
 */
export const getMyOrderById = async (req, res, next) => {
  const { id } = req.params;
  
  try {
    const order = await Order.findOne({ _id: id, user: req.user._id })
      .populate('items.product', 'title_en images slug'); // Populate product info
      
    if (!order) {
      return next(new ApiError(404, 'Order not found or you do not have permission to view it.'));
    }
    
    ApiResponse.success(res, order, 'Order details retrieved.');
  } catch (error) {
    next(error);
  }
};

// ===============================================
// ADMIN CONTROLLERS
// ===============================================

/**
 * 4. Get All Orders (Admin)
 */
export const getAllOrders = async (req, res, next) => {
  try {
    // Add pagination later if needed
    const orders = await Order.find()
      .populate('user', 'username email') // Get user email
      .sort({ createdAt: -1 });
      
    ApiResponse.success(res, orders, 'All orders retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Verify Payment (Admin)
 */
export const verifyPayment = async (req, res, next) => {
  const { id } = req.params;

  try {
    const order = await Order.findById(id).populate('user', 'email username');
    if (!order) {
      return next(new ApiError(404, 'Order not found.'));
    }

    if (order.paymentDetails.paymentStatus === 'Verified') {
      return next(new ApiError(400, 'This payment has already been verified.'));
    }

    // Update payment status
    order.paymentDetails.paymentStatus = 'Verified';
    order.paymentDetails.verifiedAt = new Date();
    
    // Update order status
    order.orderStatus = 'Processing';
    
    // Add shipping update
    order.shippingUpdates.push({ status: 'Packaging', notes: 'Payment verified by admin.' });

    const savedOrder = await order.save();
    
    // Send email to customer
    const customerHtml = await readOrderTemplate('shippingUpdate.html', {
      CUSTOMER_NAME: order.shippingAddress.fullName,
      ORDER_ID: order.orderId,
      STATUS: 'Packaging (Payment Verified)',
    });
    await sendEmail(
      order.user.email,
      `Payment Verified - Your Order ${order.orderId} is Processing`,
      customerHtml
    );

    ApiResponse.success(res, savedOrder, 'Payment verified. Order status updated to Processing.');

  } catch (error) {
    next(error);
  }
};

/**
 * 6. Update Shipping Status (Admin)
 */
export const updateShippingStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status, notes } = req.body; // e.g., status: "Shipped", notes: "Tracking ID: 12345"

  try {
    const order = await Order.findById(id).populate('user', 'email username');
    if (!order) {
      return next(new ApiError(404, 'Order not found.'));
    }

    // Add the new shipping update
    order.shippingUpdates.push({ status, notes });
    
    // Update the main order status
    // Simple logic: last shipping update is the new order status
    order.orderStatus = status;

    const savedOrder = await order.save();
    
    // Send email to customer
    const customerHtml = await readOrderTemplate('shippingUpdate.html', {
      CUSTOMER_NAME: order.shippingAddress.fullName,
      ORDER_ID: order.orderId,
      STATUS: `${status}${notes ? ` (${notes})` : ''}`,
    });
    await sendEmail(
      order.user.email,
      `Your Order ${order.orderId} has been ${status}!`,
      customerHtml
    );

    ApiResponse.success(res, savedOrder, 'Shipping status updated successfully.');

  } catch (error) {
    next(error);
  }
};

/**
 * 7. Get Orders for Calendar (Admin)
 * (Simplified version - returns orders in a list)
 */
export const getOrdersForCalendar = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query; // Expect ISO dates
    const query = {};
    
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const orders = await Order.find(query)
      .select('orderId totalAmount orderStatus createdAt')
      .sort({ createdAt: -1 });

    ApiResponse.success(res, orders, 'Orders retrieved for date range.');
  } catch (error) {
    next(error);
  }
};
