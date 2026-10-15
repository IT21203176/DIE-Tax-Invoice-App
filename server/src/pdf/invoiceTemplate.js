import { readFileSync } from 'node:fs';
import { formatMoney } from '../../../shared/invoiceMath.js';

function assetDataUri(relativePath, mimeType) {
  const data = readFileSync(new URL(`./assets/${relativePath}`, import.meta.url)).toString('base64');
  return `data:${mimeType};base64,${data}`;
}

const logoDataUri = assetDataUri('diason-logo.png', 'image/png');

// Tinos is metric-compatible with Times New Roman; embedding it keeps the layout identical
// on servers (e.g. Vercel) that have no Times New Roman installed.
const fontFaces = [400, 700]
  .map(
    (weight) => `@font-face {
    font-family: 'Tinos';
    font-style: normal;
    font-weight: ${weight};
    src: url(${assetDataUri(`fonts/tinos-latin-${weight}.woff2`, 'font/woff2')}) format('woff2');
  }`
  )
  .join('\n  ');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function multiline(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

// DD/MM/YYYY, e.g. 20/06/2026.
function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}

function engineCapacityText(value) {
  const text = String(value ?? '').trim();
  return /^\d+(\.\d+)?$/.test(text) ? `${text} CC` : text;
}

function vehicleSpecTable(item) {
  const rows = [
    ['MAKE', item.make],
    ['MODEL', item.model],
    ['STATUS', item.status],
    ['CHASSIS NO.', item.chassisNumber],
    ['ENGINE NO.', item.engineNumber],
    ['COLOUR', item.color],
    ['ENGINE CC', engineCapacityText(item.engineCapacityCc)],
    ['YOM', item.yearOfManufacture],
    ['FUEL TYPE', item.fuelType],
  ];

  return `<table class="spec">${rows
    .map(
      ([label, value]) =>
        `<tr><td class="spec-label">${label}</td><td class="spec-colon">:</td><td class="value">${escapeHtml(value)}</td></tr>`
    )
    .join('')}</table>`;
}

function itemRows(items) {
  const showRef = items.length > 1;
  return items
    .map(
      (item, index) => `
      <tr class="item-row">
        <td class="center">${showRef ? index + 1 : ''}</td>
        <td class="description">${vehicleSpecTable(item)}</td>
        <td class="center middle">${escapeHtml(item.quantity)}</td>
        <td class="center middle unit-price">${formatMoney(item.unitPrice)}</td>
        <td class="right middle amount">${formatMoney(item.amount)}</td>
      </tr>`
    )
    .join('');
}

export function renderInvoiceHtml(invoice) {
  const supplier = invoice.supplier ?? {};
  const purchaser = invoice.purchaser ?? {};
  const items = invoice.items ?? [];

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Tax Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
<style>
  ${fontFaces}
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Tinos', 'Times New Roman', Times, serif;
    font-size: 12px;
    color: #000;
  }
  /* Side padding keeps the outer table borders inside the printable area; without it the right edge is clipped. */
  .page { min-height: 270mm; display: flex; flex-direction: column; padding: 0 1px; }

  .logo { text-align: center; margin-bottom: 18px; }
  .logo img { width: 55%; }
  h1 { text-align: center; font-size: 20px; font-weight: bold; margin: 0 0 14px; }

  table { width: 100%; border-collapse: collapse; }
  .value { text-transform: uppercase; }

  .header td { padding: 2px 0; vertical-align: top; }
  .header .label { width: 20%; }
  .header .colon { width: 2%; }
  .header .val { width: 28%; padding-right: 8px; }
  .header .section-title { text-decoration: underline; padding-top: 6px; }
  .header .middle td { vertical-align: middle; }
  .header .party-row td { padding-top: 6px; padding-bottom: 6px; }
  .header .spacer td { height: 14px; padding: 0; }

  .items { margin-top: 18px; table-layout: fixed; }
  .items th, .items td { border: 1px solid #000; }
  .items th { font-weight: bold; text-align: center; vertical-align: middle; padding: 4px 3px; }
  .items th.desc-head { font-size: 14px; }
  .items td { padding: 0 4px; vertical-align: top; }
  .items .description { padding: 0 0 18px; }
  .items .center { text-align: center; }
  .items .right { text-align: right; }
  .items .middle { vertical-align: middle; }
  .items .unit-price { font-size: 10px; white-space: nowrap; }
  .items .amount { font-size: 13px; white-space: nowrap; padding-right: 6px; }
  .item-row { page-break-inside: avoid; }

  .spec { width: 100%; }
  .spec td { border: 1px solid #000; padding: 2px 4px; height: 21px; vertical-align: middle; }
  .spec tr:first-child td { border-top: none; }
  .spec td:first-child { border-left: none; }
  .spec td:last-child { border-right: none; }
  .spec .spec-label { width: 33%; }
  .spec .spec-colon { width: 4%; text-align: center; padding: 2px 0; }

  .totals td { font-size: 13px; padding: 2px 4px; }
  .totals .total-amount { text-align: right; padding-right: 6px; white-space: nowrap; }
  .totals .grand .total-amount { font-weight: bold; }

  .summary { margin-top: 30px; font-size: 13px; }
  .summary div { margin-bottom: 16px; }
  .summary .label { display: inline-block; width: 20%; }

  .signatures {
    margin-top: auto;
    padding-top: 50px;
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }
  .signature { width: 26%; border-top: 1px solid #000; padding-top: 3px; }
  .signature.left { margin-left: 5%; }
  .signature.right { text-align: right; }
</style>
</head>
<body>
<div class="page">
  <div class="logo"><img src="${logoDataUri}" alt="Diason Imports &amp; Exports"></div>
  <h1>Tax Invoice</h1>

  <table class="header">
    <tr>
      <td class="label">DATE OF INVOICE</td><td class="colon">:</td>
      <td class="val">${formatDate(invoice.invoiceDate)}</td>
      <td class="label">TAX INVOICE NO.</td><td class="colon">:</td>
      <td class="val value">${escapeHtml(invoice.invoiceNumber)}</td>
    </tr>
    <tr class="spacer"><td colspan="6"></td></tr>
    <tr>
      <td colspan="3" class="section-title">SUPPLIER DETAILS:</td>
      <td colspan="3" class="section-title">PURCHASER DETAILS:</td>
    </tr>
    <tr class="party-row">
      <td class="label">TIN</td><td class="colon">:</td><td class="val value">${escapeHtml(supplier.tin)}</td>
      <td class="label">TIN</td><td class="colon">:</td><td class="val value">${escapeHtml(purchaser.tin)}</td>
    </tr>
    <tr class="party-row">
      <td class="label">NAME</td><td class="colon">:</td><td class="val value">${escapeHtml(supplier.name)}</td>
      <td class="label">NAME</td><td class="colon">:</td><td class="val value">${escapeHtml(purchaser.name)}</td>
    </tr>
    <tr class="party-row middle">
      <td class="label">ADDRESS</td><td class="colon">:</td><td class="val value">${multiline(supplier.address)}</td>
      <td class="label">ADDRESS</td><td class="colon">:</td><td class="val value">${multiline(purchaser.address)}</td>
    </tr>
    <tr class="party-row">
      <td class="label">TEL</td><td class="colon">:</td><td class="val value">${escapeHtml(supplier.telephone)}</td>
      <td class="label">TEL</td><td class="colon">:</td><td class="val value">${escapeHtml(purchaser.telephone)}</td>
    </tr>
    <tr class="spacer"><td colspan="6"></td></tr>
    <tr>
      <td class="label">DATE OF DELIVERY</td><td class="colon">:</td>
      <td class="val">${formatDate(invoice.deliveryDate)}</td>
      <td class="label">PLACE OF SUPPLY</td><td class="colon">:</td>
      <td class="val value">${escapeHtml(invoice.placeOfSupply)}</td>
    </tr>
    <tr class="spacer"><td colspan="6"></td></tr>
    <tr>
      <td class="label">OTHER INFO.</td><td class="colon">:</td>
      <td colspan="4" class="value">${multiline(invoice.otherInformation)}</td>
    </tr>
  </table>

  <table class="items">
    <colgroup>
      <col style="width:5%">
      <col style="width:48%">
      <col style="width:9%">
      <col style="width:12%">
      <col style="width:26%">
    </colgroup>
    <thead>
      <tr>
        <th>Ref</th>
        <th class="desc-head">Description of Goods or Services</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Amount Excluding VAT (Rs.)</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows(items)}
    </tbody>
    <tbody class="totals">
      <tr>
        <td colspan="4">Total Value of Supply:</td>
        <td class="total-amount">${formatMoney(invoice.totalValueOfSupply)}</td>
      </tr>
      <tr>
        <td colspan="4">VAT Amount (Total Value of Supply @ ${escapeHtml(invoice.vatRate)}%)</td>
        <td class="total-amount">${formatMoney(invoice.vatAmount)}</td>
      </tr>
      <tr class="grand">
        <td colspan="4">Total Amount including VAT:</td>
        <td class="total-amount">${formatMoney(invoice.totalAmountIncludingVat)}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <div>Total Amount in Words : <span class="value">${escapeHtml(invoice.totalAmountInWords)}</span></div>
    <div><span class="label">Mode of Payment</span>: <span class="value">${escapeHtml(invoice.paymentMode)}</span></div>
  </div>

  <div class="signatures">
    <div class="signature left">CUSTOMER SIGNATURE</div>
    <div class="signature right">AUTHORIZED SIGNATURE</div>
  </div>
</div>
</body>
</html>`;
}
