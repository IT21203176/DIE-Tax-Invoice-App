import { computeTotals } from '../../../shared/invoiceMath.js';
import { config } from '../config.js';
import { nextSequence, peekSequence } from '../models/Counter.js';
import { Invoice } from '../models/Invoice.js';

const INVOICE_COUNTER = 'invoiceNumber';
const MAX_NUMBER_ATTEMPTS = 5;

function text(value) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function optionalNumber(value) {
  if (value === '' || value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function optionalDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function party(source = {}) {
  return {
    tin: text(source.tin),
    name: text(source.name),
    address: text(source.address),
    telephone: text(source.telephone),
  };
}

function vehicleItem(source = {}) {
  return {
    make: text(source.make),
    model: text(source.model),
    status: text(source.status),
    chassisNumber: text(source.chassisNumber),
    engineNumber: text(source.engineNumber),
    color: text(source.color),
    engineCapacityCc: text(source.engineCapacityCc),
    yearOfManufacture: optionalNumber(source.yearOfManufacture),
    fuelType: text(source.fuelType),
    quantity: optionalNumber(source.quantity) ?? 1,
    amountIncludingVat: optionalNumber(source.amountIncludingVat),
    unitPrice: optionalNumber(source.unitPrice) ?? 0,
  };
}

export function buildInvoiceData(body = {}) {
  const items = Array.isArray(body.items) ? body.items.map(vehicleItem) : [];
  const totals = computeTotals(items, config.vatRate);

  return {
    invoiceNumber: text(body.invoiceNumber),
    invoiceDate: optionalDate(body.invoiceDate),
    supplier: party(body.supplier),
    purchaser: party(body.purchaser),
    deliveryDate: optionalDate(body.deliveryDate),
    placeOfSupply: text(body.placeOfSupply),
    otherInformation: text(body.otherInformation),
    paymentMode: text(body.paymentMode),
    ...totals,
  };
}

// Sri Lankan tax year runs 1 April to 31 March, e.g. 20 June 2026 -> "26/27".
function taxYearLabel(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const startYear = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  const yy = (year) => String(year % 100).padStart(2, '0');
  return `${yy(startYear)}/${yy(startYear + 1)}`;
}

function counterName(date) {
  return `${INVOICE_COUNTER}:${taxYearLabel(date)}`;
}

function formatInvoiceNumber(seq, date) {
  return `${config.invoiceNumberPrefix}/${taxYearLabel(date)}/${String(seq).padStart(4, '0')}`;
}

export async function previewNextInvoiceNumber(date) {
  return formatInvoiceNumber(await peekSequence(counterName(date)), date);
}

function isDuplicateInvoiceNumber(error) {
  return error?.code === 11000 && error?.keyPattern?.invoiceNumber;
}

export async function createInvoice(body) {
  const data = buildInvoiceData(body);

  if (data.invoiceNumber) {
    return Invoice.create(data);
  }

  for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt += 1) {
    const seq = await nextSequence(counterName(data.invoiceDate));
    const invoiceNumber = formatInvoiceNumber(seq, data.invoiceDate);
    try {
      return await Invoice.create({ ...data, invoiceNumber });
    } catch (error) {
      if (!isDuplicateInvoiceNumber(error)) throw error;
    }
  }
  throw new Error('Could not allocate a unique invoice number');
}

export async function updateInvoice(id, body) {
  const invoice = await Invoice.findById(id);
  if (!invoice) return null;

  const data = buildInvoiceData(body);
  if (!data.invoiceNumber) data.invoiceNumber = invoice.invoiceNumber;

  invoice.set(data);
  return invoice.save();
}
