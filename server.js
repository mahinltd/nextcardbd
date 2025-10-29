import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './src/config/db.js';
import mainApiRouter from './src/routes/index.js'; // <-- 1. Import main router
import { errorHandler } from './src/middleware/errorHandler.js'; // <-- 2. Import error handler

// --- Initialize App ---
const app = express();
const PORT = process.env.PORT || 8000;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

// --- Database Connection ---
connectDB();

// --- Middlewares ---
// 1. CORS Middleware
if (!CORS_ORIGIN) {
  console.warn('CORS_ORIGIN is not defined in .env. Allowing all origins.');
}
const corsOptions = {
  origin: CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
};
app.use(cors(corsOptions));

// 2. Body Parsers
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// --- API Routes ---
// All API routes will be prefixed with /api
app.use('/api', mainApiRouter); // <-- 3. Use the main router

// --- Global Error Handler ---
// This must be the LAST middleware
app.use(errorHandler); // <-- 4. Use the error handler

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`\nServer is running on http://localhost:${PORT}`);
  if (CORS_ORIGIN) {
    console.log(`Allowing requests from: ${CORS_ORIGIN}`);
  }
});