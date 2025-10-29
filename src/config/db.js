import mongoose from 'mongoose';
import 'dotenv/config'; // To load .env variables

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('FATAL ERROR: MONGODB_URI is not defined in .env file');
      process.exit(1); // Exit process with failure
    }

    const connectionInstance = await mongoose.connect(mongoUri, {
      // Mongoose 6+ has these as default, but good to be aware
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`\nMongoDB Connected !! DB HOST: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection FAILED: ', error.message);
    process.exit(1);
  }
};

export default connectDB;