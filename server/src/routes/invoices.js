import { Router } from 'express';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { Invoice } from '../models/Invoice.js';
import { generateInvoicePdf } from '../pdf/generateInvoicePdf.js';
import {
  createInvoice,
  previewNextInvoiceNumber,
  updateInvoice,
} from '../services/invoiceService.js';

export const invoicesRouter = Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function notFound(res) {
  return res.status(404).json({ message: 'Invoice not found' });
}

invoicesRouter.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return notFound(res);
  next();
});

invoicesRouter.get('/defaults', async (req, res) => {
  const invoiceDate = req.query.invoiceDate ? new Date(req.query.invoiceDate) : new Date();
  res.json({
    nextInvoiceNumber: await previewNextInvoiceNumber(invoiceDate),
    vatRate: config.vatRate,
    supplier: config.defaultSupplier,
  });
});

invoicesRouter.get('/', async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const filter = {};
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { invoiceNumber: pattern },
      { 'purchaser.name': pattern },
      { 'purchaser.tin': pattern },
      { 'items.chassisNumber': pattern },
      { 'items.engineNumber': pattern },
    ];
  }

  const [data, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ invoiceNumber: 1 })
      .collation({ locale: 'en', numericOrdering: true })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('invoiceNumber invoiceDate purchaser.name items.make items.model items.chassisNumber totalAmountIncludingVat paymentMode')
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

invoicesRouter.get('/:id', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).lean();
  if (!invoice) return notFound(res);
  res.json(invoice);
});

invoicesRouter.get('/:id/pdf', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).lean();
  if (!invoice) return notFound(res);

  const pdf = await generateInvoicePdf(invoice);
  const filename = `Tax-Invoice-${invoice.invoiceNumber.replace(/[^\w-]+/g, '_')}.pdf`;
  const disposition = req.query.download === '1' ? 'attachment' : 'inline';

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${disposition}; filename="${filename}"`,
    'Content-Length': pdf.length,
  });
  res.end(pdf);
});

invoicesRouter.post('/', async (req, res) => {
  const invoice = await createInvoice(req.body);
  res.status(201).json(invoice);
});

invoicesRouter.put('/:id', async (req, res) => {
  const invoice = await updateInvoice(req.params.id, req.body);
  if (!invoice) return notFound(res);
  res.json(invoice);
});

invoicesRouter.delete('/:id', async (req, res) => {
  const invoice = await Invoice.findByIdAndDelete(req.params.id);
  if (!invoice) return notFound(res);
  res.status(204).end();
});
