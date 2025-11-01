import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  // Storing a direct reference to the product
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  // Store the price at the time of order
  price: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    // Our custom, human-readable Order ID (e.g., ORD-8F3A2)
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Link the order to a specific user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    // Order status tracking
    status: {
      type: String,
      required: true,
      enum: [
        'Pending', // Order created, awaiting payment (for Online/Bank)
        'Paid', // User submitted TxID
        'Verified', // Admin confirmed payment
        'Processing', // Order ready to be shipped (for COD or Verified)
        'Shipped', // Supplier shipped item
        'Completed', // Order finished
        'Cancelled', // Order cancelled
      ],
      default: 'Pending',
    },
    // Manual payment details
    paymentDetails: {
      method: {
        type: String,
        required: false,
        enum: [
          'bKash',
          'Nagad',
          'Rocket',
          'COD',
          'Bank', // <-- ADDED
          'Card', // <-- ADDED
          'Unknown',
        ],
      },
      receiverNumber: {
        type: String,
        required: false, // For bKash/Nagad
      },
      // The TxID or Bank Reference ID submitted by the user
      transactionId: {
        type: String,
        sparse: true, // Allows multiple nulls, but unique if it exists
        index: true,
      },
      submittedAt: {
        type: Date,
      },
    },
    // Admin verification
    adminNotes: {
      type: String,
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

export const Order = mongoose.model('Order', orderSchema);