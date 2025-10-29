import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    supplierProductId: {
      type: String,
      required: true,
      unique: true,
      index: true, // For faster search by supplier ID
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    category: {
      type: String,
      required: true,
      index: true, // For faster filtering by category
    },
    // Supplier's price (Keep this private, don't send to frontend)
    buyPrice: {
      type: Number,
      required: true,
    },
    // Our calculated display price
    sellPrice: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    tags: [String],
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Adds createdAt and updatedAt timestamps automatically
    timestamps: true,
  }
);

export const Product = mongoose.model('Product', productSchema);