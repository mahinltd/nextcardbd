import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Product } from '../models/product.model.js';
import { calculateSellPrice } from '../services/product.service.js';

/**
 * @desc    Get all products for the frontend
 * @route   GET /api/products
 * @access  Public
 */
const getAllProducts = asyncHandler(async (req, res) => {
  // Find all products but exclude the 'buyPrice' for security.
  // We only want to send 'sellPrice' to the frontend.
  const products = await Product.find().select('-buyPrice -supplierProductId');

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
  // This is a test function to add products manually for now.
  // In a real sync, this data would come from the supplier API.
  const { supplierProductId, name, description, images, category, buyPrice, stock, tags } = req.body;

  if (!name || !buyPrice || !category || !supplierProductId) {
    throw new ApiError(400, 'Missing required fields: name, buyPrice, category, supplierProductId');
  }

  // 1. Calculate the sell price using our service
  const sellPrice = calculateSellPrice(buyPrice);

  // 2. Create the new product
  const newProduct = await Product.create({
    supplierProductId,
    name,
    description,
    images,
    category,
    buyPrice, // Stored in DB
    sellPrice, // Stored in DB
    stock,
    tags,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newProduct, 'Product created successfully'));
});

export { getAllProducts, getProductById, createProduct };