import { Router } from 'express';
import healthRouter from './health.routes.js';
import productRouter from './product.routes.js';
import orderRouter from './order.routes.js';
import adminRouter from './admin.routes.js';
import authRouter from './auth.routes.js'; // <-- 1. Import

const router = Router();

// --- Auth Routes ---
router.use('/auth', authRouter); // <-- 2. Use the auth router

// --- Public Routes ---
router.use('/health', healthRouter);
router.use('/products', productRouter);
router.use('/orders', orderRouter);

// --- Admin Routes ---
router.use('/admin', adminRouter);

export default router;