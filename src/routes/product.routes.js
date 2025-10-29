import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
} from '../controllers/product.controller.js';

const router = Router();

// Public routes
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Test/Admin route to create a product
// We will secure this later with adminAuth middleware
router.post('/', createProduct);

export default router;