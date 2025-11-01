import { Router } from 'express';
import {
  createOrder,
  getOrderById,
  getMyOrders,
} from '../controllers/order.controller.js';
// --- 1. Import the CORRECT function name ---
import {
  getPaymentDetails, // Renamed from getPaymentQrCode
  submitPayment,
} from '../controllers/payment.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// --- PROTECTED ROUTES (User must be logged in) ---
router.post('/', protect, createOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);

// --- UNPROTECTED PAYMENT ROUTES ---

// --- 2. Use the CORRECT route ---
// This route now provides details based on the order's selected method
router.get('/:id/payment-details', getPaymentDetails); // Renamed from payment-qr
// ---

router.post('/:id/payment', submitPayment);

export default router;