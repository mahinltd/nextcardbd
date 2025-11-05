// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middlewares/authMiddleware.js';
import { adminAccess } from '../middlewares/adminMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';

// Controller Imports
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getAdminAllCategories,
} from '../controllers/categoryController.js';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminAllProducts,
} from '../controllers/productController.js';
import {
  getAllOrders,
  verifyPayment,
  updateShippingStatus,
  getOrdersForCalendar,
} from '../controllers/orderController.js';
import { getDashboardSummary } from '../controllers/analyticsController.js'; // <-- NEW IMPORT

const router = Router();

// --- Apply Admin Protection to ALL routes in this file ---
router.use(protect, adminAccess);

// ===============================================
// ANALYTICS Routes (NEW)
// ===============================================

/**
 * @route   GET /api/v1/admin/analytics/summary
 * @desc    Get dashboard summary (sales, profit, counts)
 * @access  Admin
 */
router.get('/analytics/summary', getDashboardSummary); // <-- NEW ROUTE

// ===============================================
// CATEGORY & SUBCATEGORY VALIDATORS
// ===============================================
const validateCategory = [
  body('title_en').notEmpty().withMessage('English title is required.'),
  body('title_bn').notEmpty().withMessage('Bangla title is required.'),
  body('slug').notEmpty().withMessage('Slug is required.').isSlug().withMessage('Invalid slug format.'),
];

const validateSubcategory = [
  body('category').notEmpty().withMessage('Parent category ID is required.').isMongoId().withMessage('Invalid category ID.'),
  body('title_en').notEmpty().withMessage('English title is required.'),
  body('title_bn').notEmpty().withMessage('Bangla title is required.'),
  body('slug').notEmpty().withMessage('Slug is required.').isSlug().withMessage('Invalid slug format.'),
];

// ===============================================
// PRODUCT VALIDATORS
// ===============================================
const validateProduct = [
  body('productId').notEmpty().withMessage('Product ID is required.'),
  body('title_en').notEmpty().withMessage('English title is required.'),
  body('title_bn').notEmpty().withMessage('Bangla title is required.'),
  body('slug').notEmpty().withMessage('Slug is required.').isSlug().withMessage('Invalid slug format.'),
  body('buyPrice').isNumeric().withMessage('Buy price must be a number.'),
  body('price').isNumeric().withMessage('Price must be a number.'),
  body('salePrice').optional({ checkFalsy: true }).isNumeric().withMessage('Sale price must be a number.'),
  body('category').notEmpty().withMessage('Category name/slug is required.'),
  body('subcategory').notEmpty().withMessage('Subcategory name/slug is required.'),
  body('images').isArray({ min: 1 }).withMessage('At least one image URL is required.'),
];


// ===============================================
// CATEGORY CRUD Routes
// ===============================================
router.post('/categories', validateCategory, handleValidationErrors, createCategory);
router.put('/categories/:id', validateCategory, handleValidationErrors, updateCategory);
router.delete('/categories/:id', deleteCategory);
router.get('/categories/all', getAdminAllCategories);

// ===============================================
// SUBCATEGORY CRUD Routes
// ===============================================
router.post('/subcategories', validateSubcategory, handleValidationErrors, createSubcategory);
router.put('/subcategories/:id', validateSubcategory, handleValidationErrors, updateSubcategory);
router.delete('/subcategories/:id', deleteSubcategory);

// ===============================================
// PRODUCT CRUD Routes
// ===============================================
router.post('/products', validateProduct, handleValidationErrors, createProduct);
router.put('/products/:id', validateProduct, handleValidationErrors, updateProduct);
router.delete('/products/:id', deleteProduct);
router.get('/products/all', getAdminAllProducts);

// ===============================================
// ORDER MANAGEMENT Routes
// ===============================================
router.get('/orders', getAllOrders);
router.patch('/orders/:id/verify', verifyPayment);
router.patch(
  '/orders/:id/shipping',
  [body('status').notEmpty().withMessage('Shipping status is required.')],
  handleValidationErrors,
  updateShippingStatus
);
router.get('/orders/calendar', getOrdersForCalendar);

export default router;