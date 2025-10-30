import { Router } from 'express';
import {
  createOrder,
  getOrderById,
  getMyOrders, // <-- 1. Import new function
} from '../controllers/order.controller.js';
import {
  getPaymentQrCode,
  submitPayment,
} from '../controllers/payment.controller.js';
import { protect } from '../middleware/auth.middleware.js'; // <-- 2. Import security guard

const router = Router();

// --- PROTECTED ROUTES (User must be logged in) ---
// The 'protect' middleware will run first, checking for a valid token.
// If valid, it attaches req.user, then calls the controller function.

// POST /api/orders (Create Order)
router.post('/', protect, createOrder);

// GET /api/orders/myorders (Get Logged-in User's Orders)
router.get('/myorders', protect, getMyOrders);

// GET /api/orders/:id (Get Single Order)
router.get('/:id', protect, getOrderById);

// --- UNPROTECTED PAYMENT ROUTES ---
// These routes are still public because the user might pay from a different device
// or after their token has expired. The orderId is all that's needed.
router.get('/:id/payment-qr', getPaymentQrCode);
router.post('/:id/payment', submitPayment);

export default router;