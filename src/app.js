// © NextCartBD - Developed by Mahin Ltd (Tanvir)

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors({
  origin: [/\.mahinltd\.tech$/],
}));

// Rate limiting for critical routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(["/api/auth", "/api/login", "/api/email"], limiter);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);

module.exports = app;
