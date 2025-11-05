// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
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

// --- Soft Delete Logic (Query Helper) ---
categorySchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

const Category = mongoose.model('Category', categorySchema);
export default Category;