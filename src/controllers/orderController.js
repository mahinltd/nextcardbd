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
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const todayOrderCount = await Order.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
  const sequence = (todayOrderCount + 1).toString().padStart(4, '0');
  return `NCBD-${yyyymmdd}-${sequence}`;
};

// ===============================================
// CUSTOMER CONTROLLERS
// ===============================================

/**
 * 1. Create New Order (Customer)
 * --- FIXED: Now saves shippingCost ---
 */
export const createOrder = async (req, res, next) => {
  const {
    orderItems,
    shippingAddress,
    paymentDetails,
    totalAmount,
  } = req.body;

  try {
    const user = req.user; 

    if (!orderItems || orderItems.length === 0) {
      return next(new ApiError(400, 'No order items provided.'));
    }

    let calculatedProductTotal = 0; 
    const itemsToSave = [];

    for (const item of orderItems) {
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
        product: productId,
        title: product.title_en,
        quantity: item.quantity,
        price: price,
        buyPrice: product.buyPrice,
        color: item.color,
        size: item.size,
      });
    }

    const frontendGrandTotal = totalAmount || paymentDetails.amount;
    const calculatedShippingCost = frontendGrandTotal - calculatedProductTotal;

    if (calculatedShippingCost < 0) {
        logger.warn(`Price mismatch for user ${user.email}. Products: ${calculatedProductTotal}, Total Paid: ${frontendGrandTotal}`);
        return next(new ApiError(400, 'Payment amount is less than the product total.'));
    }

    if (frontendGrandTotal !== paymentDetails.amount) {
        logger.warn(`Price mismatch for user ${user.email}. Grand Total: ${frontendGrandTotal}, Payment Amount: ${paymentDetails.amount}`);
        return next(new ApiError(400, 'Total amount and payment amount do not match.'));
    }

    // Create the order
    const newOrder = new Order({
      orderId: await generateOrderId(),
      user: user._id,
      items: itemsToSave,
      shippingAddress,
      paymentDetails,
      totalAmount: frontendGrandTotal, 
      shippingCost: calculatedShippingCost, // <-- 🔴 SHIPPING COST FIX
    });

    const savedOrder = await newOrder.save();

    // ... (Email sending code remains the same) ...
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
      .select('orderId orderStatus totalAmount createdAt') 
      .sort({ createdAt: -1 });
      
    ApiResponse.success(res, orders, 'Your orders retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get My Order By ID (Customer)
 * --- FIXED: Correct populate syntax ---
 */
export const getMyOrderById = async (req, res, next) => {
  const { id } = req.params;
  
  try {
    const order = await Order.findOne({ _id: id, user: req.user._id })
      .populate({
          path: 'items.product', // <-- 🔴 POPULATE FIX
          select: 'title_en title_bn images slug'
      });
      
    if (!order) {
      return next(new ApiError(404, 'Order not found or you do not have permission to view it.'));
    }
    
    ApiResponse.success(res, order, 'Order details retrieved.');
  } catch (error) {
    next(error);
  }
};


// --- 🔴 NEW FUNCTION (This will fix the server crash) 🔴 ---
/**
 * 3.5. Cancel My Order (Customer)
 * A customer can cancel their own order if it's not yet shipped.
 */
export const cancelOrder = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    // Find the order and ensure it belongs to this user
    const order = await Order.findOne({ _id: id, user: userId });

    if (!order) {
      return next(new ApiError(404, 'Order not found.'));
    }

    // --- Business Logic ---
    // We only allow cancellation if the order is pending or processing.
    const cancellableStatuses = ['Awaiting Verification', 'Processing', 'Packaging', 'On Hold'];
    
    if (order.orderStatus === 'Cancelled') {
      return next(new ApiError(400, 'This order has already been cancelled.'));
    }

    if (!cancellableStatuses.includes(order.orderStatus)) {
      return next(new ApiError(400, `Cannot cancel order. It has already been ${order.orderStatus}.`));
    }

    // Update the order
    order.orderStatus = 'Cancelled';
    order.shippingUpdates.push({ 
      status: 'Cancelled', 
      notes: 'Order cancelled by customer.' 
    });

    const savedOrder = await order.save();
    
    // Send notification email to admin
    await sendAdminNotification(
      `Order Cancelled by Customer (ID: ${savedOrder.orderId})`,
      `<p>Order ID: ${savedOrder.orderId} has been CANCELLED by the customer.</p>
       <p>User: ${req.user.email}</p>
       <p>Please check the admin panel for details.</p>`
    );

    ApiResponse.success(res, savedOrder, 'Order has been successfully cancelled.');

  } catch (error) {
    next(error);
  }
};
// --- 🔴 END OF NEW FUNCTION 🔴 ---


// ===============================================
// ADMIN CONTROLLERS
// ===============================================

/**
 * 4. Get All Orders (Admin)
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('user', 'username email') 
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
    order.paymentDetails.paymentStatus = 'Verified';
    order.paymentDetails.verifiedAt = new Date();
    order.orderStatus = 'Processing';
    order.shippingUpdates.push({ status: 'Packaging', notes: 'Payment verified by admin.' });
    const savedOrder = await order.save();
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
  const { status, notes } = req.body;
  try {
    const order = await Order.findById(id).populate('user', 'email username');
    if (!order) {
      return next(new ApiError(404, 'Order not found.'));
    }
    order.shippingUpdates.push({ status, notes });
    order.orderStatus = status;
    const savedOrder = await order.save();
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
 */
export const getOrdersForCalendar = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
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

/**
 * 8. NEW FUNCTION: Public Order Tracking
 */
export const trackOrderById = async (req, res, next) => {
  const { orderId } = req.params;
  try {
    const order = await Order.findOne({ orderId: orderId });
    if (!order) {
      return next(new ApiError(404, 'Order not found. Please check the Order ID and try again.'));
    }
    const trackingData = {
      orderId: order.orderId,
      orderStatus: order.orderStatus,
      shippingUpdates: order.shippingUpdates,
      createdAt: order.createdAt,
      isDelivered: order.orderStatus === 'Delivered',
      deliveredAt: order.orderStatus === 'Delivered' ? order.updatedAt : null
    };
    ApiResponse.success(res, trackingData, 'Order status retrieved successfully.');
  } catch (error) {
    if (error.name === 'CastError') {
       return next(new ApiError(400, 'Invalid Order ID format.'));
    }
    next(error);
  }
};
