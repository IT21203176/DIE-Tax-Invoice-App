import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { connectDatabase } from './db.js';
import { closeBrowser } from './pdf/generateInvoicePdf.js';
import { invoicesRouter } from './routes/invoices.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.use('/api/invoices', invoicesRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((error, req, res, next) => {
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid value for ${error.path}` });
  }
  if (error?.code === 11000) {
    const message = error.keyPattern?.invoiceNumber
      ? 'An invoice with this tax invoice number already exists'
      : 'Duplicate record';
    return res.status(409).json({ message });
  }
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }

  console.error(error);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

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
