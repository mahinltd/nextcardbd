// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import { Router } from 'express';
import {
  getAllCategories,
  getAllSubcategories,
  getSubcategoriesForCategory,
} from '../controllers/categoryController.js';
import {
  getAllProducts,
  getProductBySlug,
} from '../controllers/productController.js';
import { getPaymentMethods } from '../controllers/paymentController.js'; // <-- NEW IMPORT

const router = Router();

// ===============================================
// CATEGORY & SUBCATEGORY Routes
// ===============================================
router.get('/categories', getAllCategories);
router.get('/subcategories', getAllSubcategories);
router.get('/subcategories/:categoryId', getSubcategoriesForCategory);

// ===============================================
// PRODUCT Routes
// ===============================================
router.get('/products', getAllProducts);
router.get('/products/:slug', getProductBySlug);

// ===============================================
// CONFIGURATION Routes (NEW)
// ===============================================

/**
 * @route   GET /api/v1/public/payment-info
 * @desc    Get the list of manual payment methods (Bkash, Nagad numbers, etc.)
 * @access  Public
 */
router.get('/payment-info', getPaymentMethods); // <-- NEW ROUTE

export default router;