import { Router } from 'express';
import {
  getOrdersForVerification,
  verifyOrderPayment,
} from '../controllers/admin.controller.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

// --- ALL ADMIN ROUTES ARE PROTECTED ---
// The adminAuth middleware will run before any controller function in this file.
router.use(adminAuth);

// GET /api/admin/orders
// Gets all orders with 'Paid' status
router.get('/orders', getOrdersForVerification);

// PATCH /api/admin/orders/:id/verify
// Verifies a payment and sets status to 'Verified'
router.patch('/orders/:id/verify', verifyOrderPayment);

export default router;