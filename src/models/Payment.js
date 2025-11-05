// © NextCartBD - Developed by Mahin Ltd (Tanvir)

const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  paymentMethod: { type: String, enum: ["Bkash", "Nagad", "Rocket", "Bank Transfer"] },
  transactionId: String,
  senderNumber: String,
  paymentStatus: { type: String, default: "Pending" },
  orderStatus: String,
  deleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Payment", PaymentSchema);
