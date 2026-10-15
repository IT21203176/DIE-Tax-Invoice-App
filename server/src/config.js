import { DEFAULT_VAT_RATE } from '../../shared/invoiceMath.js';

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB_NAME || 'tax_invoice_app',
  invoiceNumberPrefix: process.env.INVOICE_NUMBER_PREFIX || 'DIE',
  vatRate: Number(process.env.VAT_RATE) || DEFAULT_VAT_RATE,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
  defaultSupplier: {
    tin: process.env.SUPPLIER_TIN || '9336771507000',
    name: process.env.SUPPLIER_NAME || 'DIASON IMPORTS & EXPORTS',
    address: process.env.SUPPLIER_ADDRESS || '471/1A1, MAKOLA SOUTH, MAKOLA, SRI LANKA.',
    telephone: process.env.SUPPLIER_TELEPHONE || '0772379052',
  },
};
