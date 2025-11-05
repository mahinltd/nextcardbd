// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`Database Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails (like IP Whitelist issue), log error and exit
    logger.error(`Database Connection Error: ${error.message}`);
    process.exit(1); // This is why your server stops
  }
};

export default connectDB;