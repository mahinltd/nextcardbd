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
    // --- THIS IS THE MAJOR CHANGE ---
    // We now link the order to a specific user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // We removed the old 'customerDetails' object
    // ---
    
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
        'Pending', // Order created, awaiting payment
        'Paid', // User submitted TxID
        'Verified', // Admin confirmed payment
        'Processing', // Order sent to supplier
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
        enum: ['bKash', 'Nagad', 'Rocket', 'Unknown'],
      },
      receiverNumber: {
        type: String,
        required: false,
      },
      transactionId: {
        type: String,
        sparse: true,
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