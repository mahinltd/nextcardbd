// © NextCartBD - Developed by Mahin Ltd (Tanvir)

// 1. Load Environment Variables
import { loadEnv } from './src/config/loadEnv.js';
loadEnv();

// 2. Import Dependencies
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './src/config/db.js';
import { corsOptions } from './src/config/corsOptions.js';
import { errorHandler } from './src/middlewares/errorHandler.js';
import logger from './src/utils/logger.js';
import { ApiResponse } from './src/utils/apiResponse.js';

// 3. Initialize Server
const app = express();
const PORT = process.env.PORT || 5001;

// 4. Connect to Database
connectDB();

// 5. Apply Core Middlewares
app.use(helmet()); // Secure HTTP headers
app.use(cors(corsOptions)); // Enable Cross-Origin Resource Sharing
app.use(express.json({ limit: '16kb' })); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true, limit: '16kb' })); // Parse URL-encoded bodies

// 6. Define API Routes
import mainRouter from './src/routes/index.js'; // <-- THIS LINE IS NEW
app.use('/api/v1', mainRouter); // <-- THIS LINE IS NEW (All routes will be prefixed with /api/v1)

// Health Check Route (Root)
app.get('/', (req, res) => {
  res.send('NexCartBD API is running... (Developed by Mahin Ltd)');
});

// Health Check Route (API)
app.get('/api/health', (req, res) => {
  ApiResponse.success(res, { status: 'OK', timestamp: new Date() }, 'API Health OK');
});

// 7. Apply Global Error Handler
// This must be the LAST middleware
app.use(errorHandler);

// 8. Start the Server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`API available at: ${process.env.API_URL}`);
});