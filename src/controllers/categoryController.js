// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import { ApiError, ApiResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

// --- Helper function to check for slug conflicts ---
const checkSlugConflict = async (model, slug, id = null) => {
  const query = { slug };
  if (id) {
    query._id = { $ne: id };
  }
  const existing = await model.findOne(query);
  if (existing) {
    throw new ApiError(409, `Slug '${slug}' already exists. Please choose a unique slug.`);
  }
};

// ===============================================
// CATEGORY CONTROLLERS
// ===============================================

/**
 * 1. Create Category (Admin)
 */
export const createCategory = async (req, res, next) => {
  const { title_en, title_bn, slug } = req.body;

  try {
    await checkSlugConflict(Category, slug);

    const newCategory = new Category({ title_en, title_bn, slug });
    await newCategory.save();

    ApiResponse.success(res, newCategory, 'Category created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Update Category (Admin)
 */
export const updateCategory = async (req, res, next) => {
  const { id } = req.params;
  const { title_en, title_bn, slug } = req.body;

  try {
    await checkSlugConflict(Category, slug, id);

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { title_en, title_bn, slug },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return next(new ApiError(404, 'Category not found.'));
    }

    ApiResponse.success(res, updatedCategory, 'Category updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Delete Category (Admin - Soft Delete)
 */
export const deleteCategory = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Note: We need to implement cascading delete for subcategories later
    // For now, we just soft delete the category.
    // A better approach might be to block deletion if subcategories exist.

    // Check if category has subcategories
    const subcategoryCount = await Subcategory.countDocuments({ category: id, isDeleted: { $ne: true } });
    if (subcategoryCount > 0) {
      return next(new ApiError(400, 'Cannot delete. This category has active subcategories linked to it.'));
    }

    const category = await Category.findById(id);
    if (!category) {
      return next(new ApiError(404, 'Category not found.'));
    }

    category.isDeleted = true;
    await category.save();

    ApiResponse.success(res, null, 'Category soft-deleted successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get All Categories (Public)
 * Fetches non-deleted categories, populates subcategories
 */
export const getAllCategories = async (req, res, next) => {
  try {
    // Find all categories
    const categories = await Category.find().sort({ title_en: 1 });
    
    // Find all subcategories
    const subcategories = await Subcategory.find().sort({ title_en: 1 });
    
    // Manually populate subcategories for each category
    const populatedCategories = categories.map(category => {
      const subs = subcategories
        .filter(sub => sub.category.toString() === category._id.toString());
      
      return {
        ...category.toObject(),
        subcategories: subs
      };
    });

    ApiResponse.success(res, populatedCategories, 'Categories retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get All Categories (Admin)
 * Fetches ALL categories, including deleted ones
 */
export const getAdminAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find()
      .select('+isDeleted') // Include the isDeleted field
      .sort({ createdAt: -1 });
      
    ApiResponse.success(res, categories, 'Admin category list retrieved.');
  } catch (error) {
    next(error);
  }
};


// ===============================================
// SUBCATEGORY CONTROLLERS
// ===============================================

/**
 * 6. Create Subcategory (Admin)
 */
export const createSubcategory = async (req, res, next) => {
  const { category, title_en, title_bn, slug } = req.body;

  try {
    // Check if parent category exists
    const parentCategory = await Category.findById(category);
    if (!parentCategory) {
      return next(new ApiError(404, 'Parent category not found.'));
    }

    await checkSlugConflict(Subcategory, slug);

    const newSubcategory = new Subcategory({
      category,
      title_en,
      title_bn,
      slug,
    });
    await newSubcategory.save();

    ApiResponse.success(res, newSubcategory, 'Subcategory created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Update Subcategory (Admin)
 */
export const updateSubcategory = async (req, res, next) => {
  const { id } = req.params;
  const { category, title_en, title_bn, slug } = req.body;

  try {
    // Check slug conflict
    await checkSlugConflict(Subcategory, slug, id);

    // Check if parent category exists
    const parentCategory = await Category.findById(category);
    if (!parentCategory) {
      return next(new ApiError(404, 'Parent category not found.'));
    }

    const updatedSubcategory = await Subcategory.findByIdAndUpdate(
      id,
      { category, title_en, title_bn, slug },
      { new: true, runValidators: true }
    );

    if (!updatedSubcategory) {
      return next(new ApiError(404, 'Subcategory not found.'));
    }

    ApiResponse.success(res, updatedSubcategory, 'Subcategory updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Delete Subcategory (Admin - Soft Delete)
 */
export const deleteSubcategory = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Note: Need to check if products are linked before deleting
    // We will add that check when Product model is created.

    const subcategory = await Subcategory.findById(id);
    if (!subcategory) {
      return next(new ApiError(404, 'Subcategory not found.'));
    }

    subcategory.isDeleted = true;
    await subcategory.save();

    ApiResponse.success(res, null, 'Subcategory soft-deleted successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Get All Subcategories (Public)
 * Optionally filter by parent category ID
 */
export const getAllSubcategories = async (req, res, next) => {
  const { categoryId } = req.query;
  const filter = {};

  if (categoryId) {
    filter.category = categoryId;
  }

  try {
    const subcategories = await Subcategory.find(filter)
      .populate('category', 'title_en title_bn slug')
      .sort({ title_en: 1 });
    ApiResponse.success(res, subcategories, 'Subcategories retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * 10. Get Subcategories for a Specific Category (Public)
 */
export const getSubcategoriesForCategory = async (req, res, next) => {
  const { categoryId } = req.params;

  try {
    const subcategories = await Subcategory.find({ category: categoryId })
      .sort({ title_en: 1 });
    ApiResponse.success(res, subcategories, 'Subcategories for category retrieved.');
  } catch (error) {
    next(error);
  }
};