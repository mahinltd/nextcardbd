import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './src/config/db.js';
import mainApiRouter from './src/routes/index.js';
import { errorHandler } from './src/middleware/errorHandler.js';

// --- Initialize App ---
const app = express();
const PORT = process.env.PORT || 8000;

// --- Database Connection ---
connectDB();

// --- Middlewares ---

// --- THIS IS THE CORRECTED CORS SETUP ---
const CORS_ORIGIN_STRING = process.env.CORS_ORIGIN;

if (!CORS_ORIGIN_STRING) {
  console.warn('CORS_ORIGIN is not defined in .env. Allowing all origins (*).');
}

// Split the comma-separated string from .env into an array of allowed origins
const allowedOrigins = CORS_ORIGIN_STRING ? CORS_ORIGIN_STRING.split(',') : '*';

const corsOptions = {
  origin: allowedOrigins, // Pass the array (or '*') to the cors package
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
// --- END OF CORRECTION ---

// 2. Body Parsers
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));


// --- API Routes ---
// All API routes will be prefixed with /api
app.use('/api', mainApiRouter);

// --- Global Error Handler ---
// This must be the LAST middleware
app.use(errorHandler);

// --- Start Server ---
app.listen(PORT, () => {
  // This log is just for us, it doesn't affect the live server URL
  console.log(`\nServer is running locally on http://localhost:${PORT} (if in dev mode)`);
  if (Array.isArray(allowedOrigins)) {
    console.log('Allowing requests from origins:');
    allowedOrigins.forEach(origin => console.log(` - ${origin}`));
  } else {
    console.log('Allowing requests from all origins (*)');
  }
});