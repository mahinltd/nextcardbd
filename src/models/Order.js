// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import mongoose from 'mongoose';

const paymentDetailsSchema = new mongoose.Schema({
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    // FIX 1: Added 'cod' and all lowercase values to match frontend
    enum: [
      'Bkash', 'Nagad', 'Rocket', 'Bank Transfer', // Old values
      'bkash', 'nagad', 'rocket', 'bank', 'cod'  // New values from frontend
    ],
  },
  transactionId: {
    type: String,
    trim: true,
    // FIX 2: Removed 'required' because COD will not have a TxnID
  },
  senderNumber: {
    type: String,
    trim: true,
    // FIX 2: Removed 'required' because COD will not have a Sender Number
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
    
    // --- 🔴 FIX 3: Added shippingCost field ---
    shippingCost: {
      type: Number,
      default: 0,
    },
    // --- End of Fix ---

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

// --- FIX 4: Added COD Logic ---
orderSchema.pre('save', function (next) {
  if (this.isNew) {
    this.shippingUpdates.push({ status: 'Order Received' });
    
    // If method is 'cod', auto-verify and set to Processing
    if(this.paymentDetails.paymentMethod === 'cod') {
        this.paymentDetails.paymentStatus = 'Verified'; // Auto-verify COD
        this.orderStatus = 'Processing'; // Set status to Processing
        this.shippingUpdates.push({ status: 'Packaging', notes: 'Cash on Delivery' });
    }
    // If payment is pending (Bkash, etc.)
    else if(this.paymentDetails.paymentStatus === 'Pending') {
      this.shippingUpdates.push({ status: 'Awaiting Verification' });
    }
  }
  next();
});
// --- END OF FIX 4 ---

// Calculate total buy price and profit
orderSchema.pre('save', function (next) {
  if (this.isModified('items') || this.isNew) {
    let totalBuy = 0;
    this.items.forEach(item => {
      totalBuy += (item.buyPrice || 0) * item.quantity;
    });
    this.totalBuyAmount = totalBuy;
    // Profit is now Total Amount (Sell + Ship) - Buy Amount - Ship Cost
    this.totalProfit = this.totalAmount - this.totalBuyAmount - this.shippingCost;
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
