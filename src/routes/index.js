import { Router } from 'express';
import healthRouter from './health.routes.js';
import productRouter from './product.routes.js';
import orderRouter from './order.routes.js';
import adminRouter from './admin.routes.js'; // <-- 1. Import

const router = Router();

// --- Public Routes ---
router.use('/health', healthRouter);
router.use('/products', productRouter);
router.use('/orders', orderRouter);

// --- Admin Routes ---
// All routes starting with /api/admin will be handled by adminRouter
router.use('/admin', adminRouter); // <-- 2. Use the admin router

export default router;