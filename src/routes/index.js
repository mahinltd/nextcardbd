// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import { Router } from 'express';
import authRoutes from './authRoutes.js';
import publicRoutes from './publicRoutes.js';
import adminRoutes from './adminRoutes.js';
import userRoutes from './userRoutes.js'; // <-- THIS LINE IS NEW

const router = Router();

// --- Main API Routes ---

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API routes are healthy' });
});

// Authentication Routes (e.g., /api/v1/auth/login)
router.use('/auth', authRoutes);

// User-Specific Routes (e.g., /api/v1/user/profile, /api/v1/user/orders)
router.use('/user', userRoutes); // <-- THIS LINE IS NEW

// Public Routes (Products, Categories) (e.g., /api/v1/public/categories)
router.use('/public', publicRoutes);

// Admin Routes (e.g., /api/v1/admin/categories)
router.use('/admin', adminRoutes);

export default router;