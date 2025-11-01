import mongoose from 'mongoose';
import 'dotenv/config'; // To load .env variables

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('FATAL ERROR: MONGODB_URI is not defined in .env file');
      process.exit(1); // Exit process with failure
    }

    // Connect without the deprecated options
    const connectionInstance = await mongoose.connect(mongoUri);

    console.log(`\nMongoDB Connected !! DB HOST: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection FAILED: ', error.message);
    process.exit(1);
  }
};

export default connectDB;