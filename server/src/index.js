import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config.js';
import { connectDatabase } from './db.js';
import { closeBrowser } from './pdf/generateInvoicePdf.js';

async function start() {
  await connectDatabase();
  const server = app.listen(config.port, () => {
    console.log(`API server listening on http://localhost:${config.port}`);
  });

  const shutdown = async () => {
    server.close();
    await closeBrowser();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
