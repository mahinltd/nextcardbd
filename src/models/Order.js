// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import mongoose from 'mongoose';

const paymentDetailsSchema = new mongoose.Schema({
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: [
      'Bkash', 'Nagad', 'Rocket', 'Bank Transfer',
      'bkash', 'nagad', 'rocket', 'bank', 'cod'
    ],
  },
  transactionId: {
    type: String,
    trim: true,
  },
  senderNumber: {
    type: String,
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

// --- THIS IS THE FIX ---
const shippingUpdateSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: [
      'Order Received',
      'Awaiting Verification',
      'Verified', // Added this based on your screenshot
      'Packaging',
      'Processing', // Added this
      'Shipped',
      'In Transit',
      'Out of delivery', // <-- FIX: Changed to lowercase 'd'
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
// --- END OF FIX ---

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  title: String, 
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number, 
    required: true,
  },
  buyPrice: Number, 
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
    shippingCost: {
      type: Number,
      default: 0,
    },
    totalBuyAmount: {
      type: Number,
      default: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    // --- THIS IS THE FIX ---
    orderStatus: {
      type: String,
      // FIX: This list must include all possible statuses from shippingUpdates
      enum: [
        'Order Received',
        'Awaiting Verification',
        'Verified',
        'Packaging',
        'Processing',
        'Shipped',
        'In Transit',
        'Out of delivery', // <-- FIX: Added and changed to lowercase 'd'
        'Delivered',
        'Cancelled',
        'On Hold',
      ],
      default: 'Awaiting Verification',
    },
    // --- END OF FIX ---
    shippingUpdates: [shippingUpdateSchema],
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

orderSchema.pre('save', function (next) {
  if (this.isNew) {
    this.shippingUpdates.push({ status: 'Order Received' });
    
    if(this.paymentDetails.paymentMethod === 'cod') {
        this.paymentDetails.paymentStatus = 'Verified'; 
        this.orderStatus = 'Processing'; 
        this.shippingUpdates.push({ status: 'Processing', notes: 'Cash on Delivery' }); // Changed to Processing
    }
    else if(this.paymentDetails.paymentStatus === 'Pending') {
      this.shippingUpdates.push({ status: 'Awaiting Verification' });
    }
  }
  next();
});

orderSchema.pre('save', function (next) {
  if (this.isModified('items') || this.isNew) {
    let totalBuy = 0;
    this.items.forEach(item => {
      totalBuy += (item.buyPrice || 0) * item.quantity;
    });
    this.totalBuyAmount = totalBuy;
    this.totalProfit = this.totalAmount - this.totalBuyAmount - this.shippingCost;
  }
  next();
});

orderSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
