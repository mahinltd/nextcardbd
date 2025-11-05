// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { ApiError, ApiResponse } from '../utils/apiResponse.js';

/**
 * 1. Get Admin Dashboard Summary
 * Calculates total sales, total buy cost, and total profit from VERIFIED orders.
 */
export const getDashboardSummary = async (req, res, next) => {
  try {
    // 1. Calculate sales metrics only from verified orders
    const verifiedOrders = await Order.find({
      'paymentDetails.paymentStatus': 'Verified',
      'isDeleted': { $ne: true }
    });

    let totalSell = 0;
    let totalBuy = 0;

    verifiedOrders.forEach(order => {
      totalSell += order.totalAmount;
      totalBuy += order.totalBuyAmount;
    });

    const totalProfit = totalSell - totalBuy;
    const profitPercent = (totalSell > 0) ? (totalProfit / totalSell) * 100 : 0;

    // 2. Get counts
    const totalOrders = await Order.countDocuments({ 'isDeleted': { $ne: true } });
    const pendingOrders = await Order.countDocuments({ 
      'orderStatus': 'Awaiting Verification',
      'isDeleted': { $ne: true } 
    });
    const totalCustomers = await User.countDocuments({ roles: 'customer', 'isDeleted': { $ne: true } });
    const totalProducts = await Product.countDocuments({ status: 'active', 'isDeleted': { $ne: true } });

    // 3. Prepare summary object
    const summary = {
      sales: {
        totalSell: totalSell,
        totalBuy: totalBuy,
        totalProfit: totalProfit,
        profitPercent: profitPercent,
      },
      counts: {
        totalOrders: totalOrders,
        pendingOrders: pendingOrders,
        totalCustomers: totalCustomers,
        totalProducts: totalProducts,
      }
    };

    ApiResponse.success(res, summary, 'Dashboard summary retrieved successfully.');

  } catch (error) {
    next(error);
  }
};