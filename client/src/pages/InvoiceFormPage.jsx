import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  computeTotals,
  DEFAULT_VAT_RATE,
  formatMoney,
  unitPriceFromVatInclusive,
} from '../../../shared/invoiceMath.js';
import { api } from '../api.js';
import Field from '../components/Field.jsx';
import MoneyInput from '../components/MoneyInput.jsx';

const PAYMENT_MODES = ['Cash', 'Cheque', 'Bank Transfer', 'Credit Card', 'Leasing', 'Other'];
const VEHICLE_STATUSES = ['Brand New', 'Unregistered', 'Registered', 'Reconditioned'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Electric'];

const emptyParty = () => ({ tin: '', name: '', address: '', telephone: '' });

const emptyItem = () => ({
  make: '',
  model: '',
  status: '',
  chassisNumber: '',
  engineNumber: '',
  color: '',
  engineCapacityCc: '',
  yearOfManufacture: '',
  fuelType: '',
  quantity: 1,
  amountIncludingVat: '',
  unitPrice: '',
});

const today = () => new Date().toLocaleDateString('en-CA');
const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');
const toMoneyInput = (value) => (value === '' || value == null ? '' : Number(value).toFixed(2));

function emptyInvoice() {
  return {
    invoiceNumber: '',
    invoiceDate: today(),
    supplier: emptyParty(),
    purchaser: emptyParty(),
    deliveryDate: '',
    placeOfSupply: '',
    otherInformation: '',
    items: [emptyItem()],
    paymentMode: '',
  };
}

function toFormState(invoice) {
  return {
    invoiceNumber: invoice.invoiceNumber ?? '',
    invoiceDate: toDateInput(invoice.invoiceDate),
    supplier: { ...emptyParty(), ...invoice.supplier },
    purchaser: { ...emptyParty(), ...invoice.purchaser },
    deliveryDate: toDateInput(invoice.deliveryDate),
    placeOfSupply: invoice.placeOfSupply ?? '',
    otherInformation: invoice.otherInformation ?? '',
    items: (invoice.items?.length ? invoice.items : [emptyItem()]).map((item) => ({
      ...emptyItem(),
      ...item,
      engineCapacityCc: item.engineCapacityCc ?? '',
      yearOfManufacture: item.yearOfManufacture ?? '',
      amountIncludingVat: toMoneyInput(item.amountIncludingVat),
      unitPrice: toMoneyInput(item.unitPrice),
    })),
    paymentMode: invoice.paymentMode ?? '',
  };
}

export default function InvoiceFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyInvoice);
  const [vatRate, setVatRate] = useState(DEFAULT_VAT_RATE);
  const [nextNumber, setNextNumber] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const supplierFilledRef = useRef(false);

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    api.getInvoice(id)
      .then((invoice) => {
        if (cancelled) return;
        setForm(toFormState(invoice));
        setVatRate(invoice.vatRate);
      })
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  useEffect(() => {
    if (isEdit) return undefined;
    let cancelled = false;
    api.getDefaults(form.invoiceDate)
      .then((defaults) => {
        if (cancelled) return;
        setVatRate(defaults.vatRate);
        setNextNumber(defaults.nextInvoiceNumber);
        if (defaults.supplier && !supplierFilledRef.current) {
          supplierFilledRef.current = true;
          // Only fill blanks so anything typed before the defaults arrived is kept.
          setForm((prev) => ({
            ...prev,
            supplier: Object.fromEntries(
              Object.entries(prev.supplier).map(([key, value]) => [key, value || defaults.supplier[key] || ''])
            ),
          }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isEdit, form.invoiceDate]);

  const totals = useMemo(() => computeTotals(form.items, vatRate), [form.items, vatRate]);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const setPartyField = (party, name, value) =>
    setForm((prev) => ({ ...prev, [party]: { ...prev[party], [name]: value } }));

  const updateItem = (index, update) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...update(item) } : item)),
    }));

  const setItemField = (index, name, value) => updateItem(index, () => ({ [name]: value }));

  const setItemAmountIncludingVat = (index, value) =>
    updateItem(index, (item) => ({
      amountIncludingVat: value,
      unitPrice: value === '' ? item.unitPrice : unitPriceFromVatInclusive(value, vatRate).toFixed(2),
    }));

  // A manually changed unit price no longer matches the VAT-inclusive amount, so clear it.
  const setItemUnitPrice = (index, value) =>
    updateItem(index, (item) => ({
      unitPrice: value,
      amountIncludingVat: Number(value) === Number(item.unitPrice) ? item.amountIncludingVat : '',
    }));

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const removeItem = (index) =>
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = isEdit ? await api.updateInvoice(id, form) : await api.createInvoice(form);
      navigate(`/invoices/${saved._id}`);
    } catch (err) {
      setError(err);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading invoice…</p>;

  return (
    <form className="invoice-form" onSubmit={handleSubmit}>
      <h1 className="form-title">{isEdit ? `Edit tax invoice ${form.invoiceNumber}` : 'New tax invoice'}</h1>

      <div className="form-layout">
        <div className="form-main">
          {error && (
            <div className="alert error">
              <strong>{error.message}</strong>
              {error.errors?.length > 0 && (
                <ul>{error.errors.map((msg) => <li key={msg}>{msg}</li>)}</ul>
              )}
            </div>
          )}

          <section className="card">
            <div className="row row-4">
              <Field label="Date of invoice" required>
                <input type="date" required value={form.invoiceDate}
                  onChange={(e) => setField('invoiceDate', e.target.value)} />
              </Field>
              <Field label="Tax invoice no">
                <input value={form.invoiceNumber}
                  placeholder={!isEdit && nextNumber ? `Auto: ${nextNumber}` : ''}
                  onChange={(e) => setField('invoiceNumber', e.target.value)} />
              </Field>
              <Field label="Date of delivery">
                <input type="date" value={form.deliveryDate}
                  onChange={(e) => setField('deliveryDate', e.target.value)} />
              </Field>
              <Field label="Place of supply">
                <input value={form.placeOfSupply}
                  onChange={(e) => setField('placeOfSupply', e.target.value)} />
              </Field>
            </div>
          </section>

          <div className="row row-2 cards">
            <PartySection title="Supplier" tinRequired value={form.supplier}
              onChange={(name, value) => setPartyField('supplier', name, value)} />
            <PartySection title="Purchaser" value={form.purchaser}
              onChange={(name, value) => setPartyField('purchaser', name, value)} />
          </div>

          <section className="card">
            <div className="section-header">
              <h2>Vehicles</h2>
              <button type="button" className="btn secondary small" onClick={addItem}>+ Add vehicle</button>
            </div>

            {form.items.map((item, index) => (
              <div className="vehicle" key={index}>
                <div className="vehicle-header">
                  <h3>{form.items.length > 1 ? `Vehicle ${index + 1}` : 'Vehicle'}</h3>
                  <div className="vehicle-header-right">
                    <span className="muted">Amount excl. VAT:</span>
                    <strong>{formatMoney(totals.items[index]?.amount)}</strong>
                    {form.items.length > 1 && (
                      <button type="button" className="btn danger small" onClick={() => removeItem(index)}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="row vehicle-row-1">
                  <Field label="Make" required>
                    <input required value={item.make} onChange={(e) => setItemField(index, 'make', e.target.value)} />
                  </Field>
                  <Field label="Model" required>
                    <input required value={item.model} onChange={(e) => setItemField(index, 'model', e.target.value)} />
                  </Field>
                  <Field label="Status">
                    <input list="vehicle-statuses" value={item.status} placeholder="e.g. Unregistered"
                      onChange={(e) => setItemField(index, 'status', e.target.value)} />
                  </Field>
                  <Field label="Chassis no" required>
                    <input required value={item.chassisNumber}
                      onChange={(e) => setItemField(index, 'chassisNumber', e.target.value.toUpperCase())} />
                  </Field>
                  <Field label="Engine no" required>
                    <input required value={item.engineNumber}
                      onChange={(e) => setItemField(index, 'engineNumber', e.target.value.toUpperCase())} />
                  </Field>
                </div>

                <div className="row vehicle-row-2">
                  <Field label="Color">
                    <input value={item.color} onChange={(e) => setItemField(index, 'color', e.target.value)} />
                  </Field>
                  <Field label="Engine CC">
                    <input value={item.engineCapacityCc} placeholder="e.g. 658 CC"
                      onChange={(e) => setItemField(index, 'engineCapacityCc', e.target.value.toUpperCase())} />
                  </Field>
                  <Field label="YOM">
                    <input type="number" min="1900" max="2100" value={item.yearOfManufacture}
                      title="Year of manufacture"
                      onChange={(e) => setItemField(index, 'yearOfManufacture', e.target.value)} />
                  </Field>
                  <Field label="Fuel">
                    <input list="fuel-types" value={item.fuelType}
                      onChange={(e) => setItemField(index, 'fuelType', e.target.value)} />
                  </Field>
                  <Field label="Qty" required>
                    <input type="number" min="1" step="1" required value={item.quantity}
                      onChange={(e) => setItemField(index, 'quantity', e.target.value)} />
                  </Field>
                  <Field label="Incl. VAT (Rs.)">
                    <MoneyInput value={item.amountIncludingVat}
                      title={`Amount including VAT (${vatRate}%). Fills the unit price automatically.`}
                      onChange={(value) => setItemAmountIncludingVat(index, value)} />
                  </Field>
                  <Field label="Unit price (Rs.)" required>
                    <MoneyInput required value={item.unitPrice}
                      onChange={(value) => setItemUnitPrice(index, value)} />
                  </Field>
                </div>
              </div>
            ))}
          </section>
        </div>

        <aside className="card form-sidebar">
          <h2>Totals &amp; payment</h2>
          <dl className="summary-totals">
            <div>
              <dt>Total value of supply</dt>
              <dd>{formatMoney(totals.totalValueOfSupply)}</dd>
            </div>
            <div>
              <dt>VAT @ {vatRate}%</dt>
              <dd>{formatMoney(totals.vatAmount)}</dd>
            </div>
            <div className="grand">
              <dt>Total incl. VAT</dt>
              <dd>{formatMoney(totals.totalAmountIncludingVat)}</dd>
            </div>
          </dl>
          <p className="amount-words">{totals.totalAmountInWords}</p>

          <Field label="Mode of payment" required>
            <input list="payment-modes" required value={form.paymentMode}
              onChange={(e) => setField('paymentMode', e.target.value)} />
          </Field>
          <Field label="Other information" className="grow">
            <textarea rows={2} value={form.otherInformation}
              onChange={(e) => setField('otherInformation', e.target.value)} />
          </Field>

          <div className="form-actions">
            <Link className="btn secondary" to={isEdit ? `/invoices/${id}` : '/invoices'}>Cancel</Link>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save invoice'}
            </button>
          </div>
        </aside>
      </div>

      <datalist id="payment-modes">{PAYMENT_MODES.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="vehicle-statuses">{VEHICLE_STATUSES.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="fuel-types">{FUEL_TYPES.map((v) => <option key={v} value={v} />)}</datalist>
    </form>
  );
}

function PartySection({ title, value, onChange, tinRequired = false }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="row row-2">
        <Field label="TIN" required={tinRequired}>
          <input required={tinRequired} value={value.tin} onChange={(e) => onChange('tin', e.target.value)} />
        </Field>
        <Field label="Telephone">
          <input type="tel" value={value.telephone} onChange={(e) => onChange('telephone', e.target.value)} />
        </Field>
      </div>
      <Field label="Name" required>
        <input required value={value.name} onChange={(e) => onChange('name', e.target.value)} />
      </Field>
      <Field label="Address" required>
        <input required value={value.address} onChange={(e) => onChange('address', e.target.value)} />
      </Field>
    </section>
  );
}
