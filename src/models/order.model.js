import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  // --- NEW: Add name and image to item schema ---
  name: { type: String, required: true },
  image: { type: String, required: true },
  // ---
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // --- THIS IS THE NEW SHIPPING ADDRESS FIELD ---
    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: false }, // Optional
    },
    // --- END OF NEW FIELD ---
    
    items: [orderItemSchema], // Using the schema defined above
    
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        'Pending',
        'Paid',
        'Verified',
        'Processing',
        'Shipped',
        'Completed',
        'Cancelled',
      ],
      default: 'Pending',
    },
    paymentDetails: {
      method: {
        type: String,
        required: false,
        enum: [
          'bKash',
          'Nagad',
          'Rocket',
          'COD',
          'Bank',
          'Card',
          'Unknown',
        ],
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