import mongoose from 'mongoose';
import { config } from './config.js';

let connectionPromise = null;

// Reuses one connection per process; on Vercel a warm function instance keeps it between requests.
export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;

  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is not set. Add it to server/.env (or the Vercel environment variables).');
  }
  if (config.mongoUri.includes('<')) {
    throw new Error('MONGODB_URI still contains a placeholder such as <user_name>. Replace it with your Atlas database username.');
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(config.mongoUri, { dbName: config.mongoDbName, serverSelectionTimeoutMS: 10000 })
      .then(() => console.log(`Connected to MongoDB database "${config.mongoDbName}"`))
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }
  await connectionPromise;
}
