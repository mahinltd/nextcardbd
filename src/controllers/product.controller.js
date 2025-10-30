import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Product } from '../models/product.model.js';
import { calculateSellPrice } from '../services/product.service.js';

/**
 * @desc    Get all products (with search functionality)
 * @route   GET /api/products
 * @route   GET /api/products?search=keyword
 * @access  Public
 */
const getAllProducts = asyncHandler(async (req, res) => {
  // 1. Check for a search query
  const keyword = req.query.search
    ? {
        // Search in 'name' OR 'category' fields
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } }, // 'i' for case-insensitive
          { category: { $regex: req.query.search, $options: 'i' } },
        ],
      }
    : {}; // If no search query, 'keyword' is an empty object

  // 2. Find products based on the keyword
  // We still exclude 'buyPrice' for security
  const products = await Product.find(keyword).select('-buyPrice -supplierProductId');

  if (!products) {
    throw new ApiError(404, 'No products found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, products, 'Products retrieved successfully'));
});

/**
 * @desc    Get a single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select('-buyPrice');

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, 'Product retrieved successfully'));
});

/**
 * @desc    Create a new product (for testing/admin)
 * @route   POST /api/products
 * @access  Private (should be admin)
 */
const createProduct = asyncHandler(async (req, res) => {
  // This route should be protected by admin middleware in the future
  const { supplierProductId, name, description, images, category, buyPrice, stock, tags } = req.body;

  if (!name || !buyPrice || !category || !supplierProductId) {
    throw new ApiError(400, 'Missing required fields: name, buyPrice, category, supplierProductId');
  }

  const sellPrice = calculateSellPrice(buyPrice);

  const newProduct = await Product.create({
    supplierProductId,
    name,
    description,
    images,
    category,
    buyPrice,
    sellPrice,
    stock,
    tags,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newProduct, 'Product created successfully'));
});

export { getAllProducts, getProductById, createProduct };