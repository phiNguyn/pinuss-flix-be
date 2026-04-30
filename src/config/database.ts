import mongoose from 'mongoose';
import { loadEnv } from './env.js';

const env = loadEnv();

let isConnected = false;

export async function connectDatabase(): Promise<void> {
  if (isConnected) return;
  
  try {
    await mongoose.connect(env.MONGODB_URI);
    isConnected = true;
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});
