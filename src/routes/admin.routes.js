import { Router } from 'express';
import {
  getOrdersForVerification,
  verifyOrderPayment,
  syncProducts, // <-- 1. Import new function
} from '../controllers/admin.controller.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

// --- ALL ADMIN ROUTES ARE PROTECTED ---
// The adminAuth middleware will run before any controller function in this file.
router.use(adminAuth);

/**
 * @route   POST /api/admin/sync-products
 * @desc    Trigger a manual product sync from the supplier
 * @access  Admin
 */
router.post('/sync-products', syncProducts); // <-- 2. Add new route

/**
 * @route   GET /api/admin/orders
 * @desc    Gets all orders with 'Paid' status
 * @access  Admin
 */
router.get('/orders', getOrdersForVerification);

/**
 * @route   PATCH /api/admin/orders/:id/verify
 * @desc    Verifies a payment and sets status to 'Verified'
 * @access  Admin
 */
router.patch('/orders/:id/verify', verifyOrderPayment);

export default router;