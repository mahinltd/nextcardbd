// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getUserProfile,
  updateUserProfile,
} from '../controllers/userController.js';
import {
  createOrder,
  getMyOrders,
  getMyOrderById,
  cancelOrder, // <-- 🔴 NEW IMPORT
} from '../controllers/orderController.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';

const router = Router();

// Apply 'protect' middleware to all routes in this file
router.use(protect);

// ===============================================
// USER PROFILE Routes
// ===============================================

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// ===============================================
// ORDER Routes (Customer)
// ===============================================

// Validation for creating an order
const validateOrder = [
  body('orderItems').isArray({ min: 1 }).withMessage('Cart cannot be empty.'),
  body('shippingAddress.fullName').notEmpty().withMessage('Full name is required.'),
  body('shippingAddress.phone').notEmpty().withMessage('Phone number is required.'),
  body('shippingAddress.address').notEmpty().withMessage('Address is required.'),
  body('shippingAddress.city').notEmpty().withMessage('City is required.'),
  body('paymentDetails.paymentMethod').notEmpty().withMessage('Payment method is required.'),
  body('paymentDetails.amount').isNumeric().withMessage('Payment amount is required.'),
];

/**
 * @route   POST /api/v1/user/orders
 * @desc    Create a new order
 * @access  Private (Customer)
 */
router.post('/orders', validateOrder, handleValidationErrors, createOrder);

/**
 * @route   GET /api/v1/user/orders
 * @desc    Get logged-in user's order history
 * @access  Private (Customer)
 */
router.get('/orders', getMyOrders);

/**
 * @route   GET /api/v1/user/orders/:id
 * @desc    Get a single order by ID (and check if it belongs to the user)
 * @access  Private (Customer)
 */
router.get('/orders/:id', getMyOrderById);

/**
 * @route   PATCH /api/v1/user/orders/:id/cancel
 * @desc    Cancel an order (if it's not shipped yet)
 * @access  Private (Customer)
 */
router.patch('/orders/:id/cancel', cancelOrder); // <-- 🔴 NEW ROUTE

export default router;
