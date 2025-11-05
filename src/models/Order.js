// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import mongoose from 'mongoose';

const paymentDetailsSchema = new mongoose.Schema({
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['Bkash', 'Nagad', 'Rocket', 'Bank Transfer'],
  },
  transactionId: {
    type: String,
    required: [true, 'Transaction ID is required'],
    trim: true,
  },
  senderNumber: {
    type: String,
    required: [true, 'Sender number is required'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Verified', 'Failed'],
    default: 'Pending',
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
});

const shippingUpdateSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: [
      'Order Received',
      'Awaiting Verification',
      'Packaging',
      'Shipped',
      'In Transit',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
      'On Hold',
    ],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
});

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  title: String, // Storing title_en for quick access
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number, // Price at the time of purchase
    required: true,
  },
  buyPrice: Number, // Buy price at the time of purchase (for profit calculation)
  color: String,
  size: String,
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      zipCode: { type: String },
    },
    paymentDetails: paymentDetailsSchema,
    totalAmount: {
      type: Number,
      required: true,
    },
    totalBuyAmount: {
      type: Number,
      default: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    orderStatus: {
      type: String,
      enum: ['Awaiting Verification', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'On Hold'],
      default: 'Awaiting Verification',
    },
    shippingUpdates: [shippingUpdateSchema],
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

// --- Middleware ---

// Add the initial 'Order Received' status
orderSchema.pre('save', function (next) {
  if (this.isNew) {
    this.shippingUpdates.push({ status: 'Order Received' });
    
    // Also add 'Awaiting Verification' if payment is pending
    if(this.paymentDetails.paymentStatus === 'Pending') {
      this.shippingUpdates.push({ status: 'Awaiting Verification' });
    }
  }
  next();
});

// Calculate total buy price and profit
orderSchema.pre('save', function (next) {
  if (this.isModified('items') || this.isNew) {
    let totalBuy = 0;
    this.items.forEach(item => {
      totalBuy += (item.buyPrice || 0) * item.quantity;
    });
    this.totalBuyAmount = totalBuy;
    this.totalProfit = this.totalAmount - totalBuy;
  }
  next();
});

// --- Soft Delete Logic (Query Helper) ---
orderSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

const Order = mongoose.model('Order', orderSchema);
export default Order;