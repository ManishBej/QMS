import mongoose from 'mongoose';
import { getDatabaseConfig } from './index.js';

// Get database configuration
const { uri: MONGODB_URI, options: dbOptions } = getDatabaseConfig();

// Enhanced connection options for production performance
const connectionOptions = {
  autoIndex: true,
  ...dbOptions,
  // Additional performance options
  heartbeatFrequencyMS: 10000, // Send ping every 10 seconds
  retryWrites: true, // Retry failed writes
  w: 'majority' // Write concern for replica sets
};

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  
  try {
    await mongoose.connect(MONGODB_URI, connectionOptions);
    
    // Log connection success with pool info
    console.log('📊 MongoDB connected successfully');
    console.log(`🔗 Connection pool: min=${connectionOptions.minPoolSize}, max=${connectionOptions.maxPoolSize}`);
    
    // Monitor connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });
    
    return mongoose.connection;
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

export default connectDb;
