import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectDatabase() {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is not set. Add it to server/.env');
  }
  if (config.mongoUri.includes('<')) {
    throw new Error('MONGODB_URI still contains a placeholder such as <user_name>. Replace it with your Atlas database username.');
  }

  await mongoose.connect(config.mongoUri, { dbName: config.mongoDbName });
  console.log(`Connected to MongoDB database "${config.mongoDbName}"`);
}
