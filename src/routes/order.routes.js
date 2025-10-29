import { Router } from 'express';
import { createOrder, getOrderById } from '../controllers/order.controller.js';
import { getPaymentQrCode, submitPayment } from '../controllers/payment.controller.js'; // <-- 1. Import

const router = Router();

// Order creation and status
router.post('/', createOrder);
router.get('/:id', getOrderById);

// Payment routes
router.get('/:id/payment-qr', getPaymentQrCode); // <-- 2. Add QR route
router.post('/:id/payment', submitPayment);      // <-- 3. Add TxID submit route

export default router;