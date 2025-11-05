// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import { ApiError, ApiResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

// Helper function to find Category/Subcategory IDs from their names or slugs
const findCategoryIds = async (categoryName, subcategoryName) => {
  const category = await Category.findOne({
    $or: [{ title_en: categoryName }, { slug: categoryName }],
  });
  if (!category) {
    throw new ApiError(404, `Category '${categoryName}' not found.`);
  }

  const subcategory = await Subcategory.findOne({
    category: category._id,
    $or: [{ title_en: subcategoryName }, { slug: subcategoryName }],
  });
  if (!subcategory) {
    throw new ApiError(404, `Subcategory '${subcategoryName}' not found within '${categoryName}'.`);
  }

  return { categoryId: category._id, subcategoryId: subcategory._id };
};

// ===============================================
// ADMIN PRODUCT CONTROLLERS
// ===============================================

/**
 * 1. Create Product (Admin)
 * Receives category/subcategory names (as per Postman template) and finds IDs
 */
export const createProduct = async (req, res, next) => {
  const {
    productId,
    title_en,
    title_bn,
    slug,
    description_en,
    description_bn,
    buyPrice,
    price,
    salePrice,
    category, // This is categoryName (e.g., "Men Fashion")
    subcategory, // This is subcategoryName (e.g., "T-Shirt")
    images,
    color,
    size,
    status,
    sourceApiRef,
  } = req.body;

  try {
    // 1. Find Category and Subcategory IDs from names
    const { categoryId, subcategoryId } = await findCategoryIds(category, subcategory);

    // 2. Check for duplicate slug or productId
    const existingProduct = await Product.findOne({ $or: [{ slug }, { productId }] });
    if (existingProduct) {
      const message = existingProduct.slug === slug ? 'Slug already exists.' : 'Product ID already exists.';
      return next(new ApiError(409, message));
    }

    // 3. Create new product
    const newProduct = new Product({
      productId,
      title_en,
      title_bn,
      slug,
      description_en,
      description_bn,
      buyPrice,
      price,
      salePrice,
      category: categoryId, // Save the ID
      subcategory: subcategoryId, // Save the ID
      images,
      color,
      size,
      status,
      sourceApiRef,
    });

    // 4. Save the product (pre-save hook will calculate profit)
    await newProduct.save();

    ApiResponse.success(res, newProduct, 'Product created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Update Product (Admin)
 */
export const updateProduct = async (req, res, next) => {
  const { id } = req.params;
  const {
    productId,
    title_en,
    title_bn,
    slug,
    description_en,
    description_bn,
    buyPrice,
    price,
    salePrice,
    category, // categoryName
    subcategory, // subcategoryName
    images,
    color,
    size,
    status,
    sourceApiRef,
  } = req.body;

  try {
    // 1. Find Category and Subcategory IDs from names
    const { categoryId, subcategoryId } = await findCategoryIds(category, subcategory);

    // 2. Check for duplicate slug or productId
    const existingProduct = await Product.findOne({
      $or: [{ slug }, { productId }],
      _id: { $ne: id }, // Exclude self
    });
    if (existingProduct) {
      const message = existingProduct.slug === slug ? 'Slug already exists.' : 'Product ID already exists.';
      return next(new ApiError(409, message));
    }
    
    // 3. Find and update
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        productId,
        title_en,
        title_bn,
        slug,
        description_en,
        description_bn,
        buyPrice,
        price,
        salePrice,
        category: categoryId,
        subcategory: subcategoryId,
        images,
        color,
        size,
        status,
        sourceApiRef,
      },
      { new: true, runValidators: true } // 'new: true' returns the updated doc, 'runValidators' ensures model schema rules run
    );

    if (!updatedProduct) {
      return next(new ApiError(404, 'Product not found.'));
    }
    
    // Note: The pre-save hook automatically recalculates profit on update

    ApiResponse.success(res, updatedProduct, 'Product updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Delete Product (Admin - Soft Delete)
 */
export const deleteProduct = async (req, res, next) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return next(new ApiError(404, 'Product not found.'));
    }

    product.isDeleted = true;
    product.status = 'archived'; // Mark as archived
    await product.save();

    ApiResponse.success(res, null, 'Product soft-deleted successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get All Products (Admin)
 * Fetches ALL products, including deleted/archived
 */
export const getAdminAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find()
      .select('+isDeleted +status') // Include hidden fields
      .populate('category', 'title_en slug')
      .populate('subcategory', 'title_en slug')
      .sort({ createdAt: -1 });
      
    ApiResponse.success(res, products, 'Admin product list retrieved.');
  } catch (error) {
    next(error);
  }
};


// ===============================================
// PUBLIC PRODUCT CONTROLLERS
// ===============================================

/**
 * 5. Get All Products (Public)
 * Fetches active products with filtering and pagination.
 */
export const getAllProducts = async (req, res, next) => {
  try {
    const { category, subcategory, search, sort } = req.query;
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // Build Query
    const query = {
      status: 'active', // Only active products
      // isDeleted: false is handled by the model's pre-find hook
    };

    // Text search (if provided)
    if (search) {
      // Create a text index on title_en, title_bn, description_en, description_bn in MongoDB Atlas
      // For now, we use a simple regex search
      query.$or = [
        { title_en: { $regex: search, $options: 'i' } },
        { title_bn: { $regex: search, $options: 'i' } },
        { description_en: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Category/Subcategory filtering (using slugs)
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) query.category = cat._id;
    }
    if (subcategory) {
      const subcat = await Subcategory.findOne({ slug: subcategory });
      if (subcat) query.subcategory = subcat._id;
    }
    
    // Build Sort
    const sortOptions = {};
    if (sort === 'price_asc') sortOptions.price = 1;
    else if (sort === 'price_desc') sortOptions.price = -1;
    else sortOptions.createdAt = -1; // Default sort

    // Execute Query with Pagination
    const products = await Product.find(query)
      .populate('category', 'title_en title_bn slug')
      .populate('subcategory', 'title_en title_bn slug')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit);

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(query);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
      limit,
    };

    ApiResponse.success(res, { products, pagination }, 'Products retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get Single Product (Public)
 * Find by slug or ID
 */
export const getProductBySlug = async (req, res, next) => {
  const { slug } = req.params;

  try {
    const product = await Product.findOne({ slug, status: 'active' })
      .populate('category', 'title_en title_bn slug')
      .populate('subcategory', 'title_en title_bn slug');

    if (!product) {
      // Fallback: check by ProductID (if slug fails)
      const productById = await Product.findOne({ productId: slug, status: 'active' })
        .populate('category', 'title_en title_bn slug')
        .populate('subcategory', 'title_en title_bn slug');
        
      if (!productById) {
        return next(new ApiError(404, 'Product not found.'));
      }
      return ApiResponse.success(res, productById, 'Product retrieved successfully.');
    }

    ApiResponse.success(res, product, 'Product retrieved successfully.');
  } catch (error) {
    next(error);
  }
};