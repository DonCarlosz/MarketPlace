import mongoose from 'mongoose';

const connectDB = async (retryCount = 0) => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/local_marketplace';
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    if (retryCount < 5) {
      console.log(`Retrying MongoDB connection in 2 seconds... (Attempt ${retryCount + 1})`);
      setTimeout(() => connectDB(retryCount + 1), 2000);
    } else if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectDB;
