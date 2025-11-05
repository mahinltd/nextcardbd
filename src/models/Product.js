// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: [true, 'Custom Product ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    title_en: {
      type: String,
      required: [true, 'English title is required'],
      trim: true,
    },
    title_bn: {
      type: String,
      required: [true, 'Bangla title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description_en: {
      type: String,
      trim: true,
    },
    description_bn: {
      type: String,
      trim: true,
    },
    buyPrice: {
      type: Number,
      required: [true, 'Buy price is required'],
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'Regular price is required'],
    },
    salePrice: {
      type: Number,
      default: null,
      validate: [
        function (value) {
          // If salePrice exists, it must be less than regular price
          return value === null || value < this.price;
        },
        'Sale price must be less than the regular price.',
      ],
    },
    profitAmount: {
      type: Number,
      default: 0,
    },
    profitPercent: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'BDT',
      enum: ['BDT'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subcategory',
      required: [true, 'Subcategory is required'],
    },
    images: {
      type: [String], // Array of external image URLs
      required: [true, 'At least one image is required'],
      validate: [
        (val) => val.length > 0,
        'At least one image URL is required.',
      ],
    },
    color: {
      type: [String],
      default: [],
    },
    size: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
    },
    sourceApiRef: {
      provider: String,
      product_api_id: String,
      original_link: String,
    },
    // Soft delete flag
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// --- Mongoose Middleware ---

/**
 * Pre-Save Hook to calculate profit.
 * This runs every time a product is created or updated.
 */
productSchema.pre('save', function (next) {
  if (this.isModified('buyPrice') || this.isModified('price') || this.isModified('salePrice')) {
    // Determine the effective selling price (sale price if available, else regular price)
    const sellingPrice = this.salePrice && this.salePrice > 0 ? this.salePrice : this.price;

    // Calculate Profit Amount
    const profit = sellingPrice - this.buyPrice;
    this.profitAmount = profit;

    // Calculate Profit Percentage
    if (this.buyPrice > 0) {
      this.profitPercent = (profit / this.buyPrice) * 100;
    } else {
      this.profitPercent = sellingPrice > 0 ? 100 : 0; // Handle division by zero
    }
  }
  next();
});

// --- Soft Delete Logic (Query Helper) ---
productSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true }, status: { $ne: 'archived' } });
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;