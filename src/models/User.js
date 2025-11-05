// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    roles: {
      type: [String],
      enum: ['customer', 'admin', 'superadmin'],
      default: ['customer'],
    },
    isVerified: {
      type: Boolean,
      default: false,
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

// Hash password before saving the user
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// --- Model Methods ---

/**
 * Compares entered password with the hashed password in the database.
 * @param {string} enteredPassword - The password to compare.
 * @returns {Promise<boolean>} - True if the password matches, false otherwise.
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// --- Soft Delete Logic (Query Helper) ---
// This ensures that find, findOne, etc., automatically filter out deleted users
userSchema.pre(/^find/, function (next) {
  // 'this' refers to the query
  this.where({ isDeleted: { $ne: true } });
  next();
});

const User = mongoose.model('User', userSchema);
export default User;