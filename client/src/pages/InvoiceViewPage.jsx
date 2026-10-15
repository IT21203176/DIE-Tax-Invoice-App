import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatMoney } from '../../../shared/invoiceMath.js';
import { api } from '../api.js';
import { formatDate } from '../format.js';

export default function InvoiceViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState(null);
  const [printing, setPrinting] = useState(false);
  const printFrameRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api.getInvoice(id)
      .then((data) => !cancelled && setInvoice(data))
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => () => printFrameRef.current?.remove(), []);

  function handlePrint() {
    printFrameRef.current?.remove();
    setPrinting(true);

    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.src = api.pdfUrl(id);
    frame.onload = () => {
      setPrinting(false);
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch {
        window.open(api.pdfUrl(id), '_blank');
      }
    };
    document.body.appendChild(frame);
    printFrameRef.current = frame;
  }

  async function handleDelete() {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    try {
      await api.deleteInvoice(id);
      navigate('/invoices');
    } catch (err) {
      setError(err);
    }
  }

  if (error) return <div className="alert error">{error.message}</div>;
  if (!invoice) return <p>Loading invoice…</p>;

  return (
    <>
      <div className="page-header">
        <h1>Tax Invoice {invoice.invoiceNumber}</h1>
        <div className="actions">
          <button className="btn primary" onClick={handlePrint} disabled={printing}>
            {printing ? 'Preparing…' : 'Print'}
          </button>
          <a className="btn primary" href={api.pdfUrl(id, { download: true })}>Download PDF</a>
          <a className="btn secondary" href={api.pdfUrl(id)} target="_blank" rel="noreferrer">Open PDF</a>
          <Link className="btn secondary" to={`/invoices/${id}/edit`}>Edit</Link>
          <button className="btn danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="grid cols-2">
        <section className="card">
          <h2>Invoice</h2>
          <dl className="details">
            <dt>Date of Invoice</dt><dd>{formatDate(invoice.invoiceDate)}</dd>
            <dt>Tax Invoice No</dt><dd>{invoice.invoiceNumber}</dd>
            <dt>Date of Delivery</dt><dd>{formatDate(invoice.deliveryDate) || '—'}</dd>
            <dt>Place of Supply</dt><dd>{invoice.placeOfSupply || '—'}</dd>
            <dt>Other Information</dt><dd className="pre">{invoice.otherInformation || '—'}</dd>
            <dt>Mode of Payment</dt><dd>{invoice.paymentMode}</dd>
          </dl>
        </section>

        <section className="card">
          <h2>Totals</h2>
          <dl className="details">
            <dt>Total Value of Supply</dt><dd className="num">Rs. {formatMoney(invoice.totalValueOfSupply)}</dd>
            <dt>VAT @ {invoice.vatRate}%</dt><dd className="num">Rs. {formatMoney(invoice.vatAmount)}</dd>
            <dt>Total incl. VAT</dt><dd className="num strong">Rs. {formatMoney(invoice.totalAmountIncludingVat)}</dd>
            <dt>In Words</dt><dd>{invoice.totalAmountInWords}</dd>
          </dl>
        </section>

        <PartyCard title="Supplier" party={invoice.supplier} />
        <PartyCard title="Purchaser" party={invoice.purchaser} />
      </div>

      <section className="card">
        <h2>Vehicles</h2>
        <div className="table-scroll">
          <table className="list-table">
            <thead>
              <tr>
                <th>Make</th><th>Model</th><th>Status</th><th>Chassis No</th><th>Engine No</th>
                <th>Color</th><th>CC</th><th>YOM</th><th>Fuel</th><th>Qty</th>
                <th className="num">Unit Price</th><th className="num">Amount excl. VAT</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.make}</td><td>{item.model}</td><td>{item.status}</td>
                  <td>{item.chassisNumber}</td><td>{item.engineNumber}</td><td>{item.color}</td>
                  <td>{item.engineCapacityCc}</td><td>{item.yearOfManufacture}</td><td>{item.fuelType}</td>
                  <td>{item.quantity}</td>
                  <td className="num">{formatMoney(item.unitPrice)}</td>
                  <td className="num">{formatMoney(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function PartyCard({ title, party = {} }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <dl className="details">
        <dt>TIN</dt><dd>{party.tin || '—'}</dd>
        <dt>Name</dt><dd>{party.name}</dd>
        <dt>Address</dt><dd className="pre">{party.address}</dd>
        <dt>Telephone</dt><dd>{party.telephone || '—'}</dd>
      </dl>
    </section>
  );
}
