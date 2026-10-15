import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatMoney } from '../../../shared/invoiceMath.js';
import { api } from '../api.js';
import { formatDate } from '../format.js';

const PAGE_SIZE = 20;

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api.listInvoices({ search: debouncedSearch, page, limit: PAGE_SIZE })
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page]);

  return (
    <>
      <div className="page-header">
        <h1>Invoices</h1>
        <Link className="btn primary" to="/invoices/new">+ New Invoice</Link>
      </div>

      <input
        className="search"
        type="search"
        placeholder="Search by invoice no, purchaser, TIN, chassis no or engine no"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <div className="alert error">{error.message}</div>}
      {!result && !error && <p>Loading…</p>}

      {result && (
        <div className="card table-card">
          {result.data.length === 0 ? (
            <p className="empty">No invoices found.</p>
          ) : (
            <table className="list-table">
              <thead>
                <tr>
                  <th>Tax Invoice No</th>
                  <th>Date</th>
                  <th>Purchaser</th>
                  <th>Vehicle</th>
                  <th>Chassis No</th>
                  <th className="num">Total incl. VAT (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((invoice) => (
                  <tr key={invoice._id} className="clickable" onClick={() => navigate(`/invoices/${invoice._id}`)}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{formatDate(invoice.invoiceDate)}</td>
                    <td>{invoice.purchaser?.name}</td>
                    <td>{invoice.items?.map((item) => `${item.make} ${item.model}`).join(', ')}</td>
                    <td>{invoice.items?.map((item) => item.chassisNumber).join(', ')}</td>
                    <td className="num">{formatMoney(invoice.totalAmountIncludingVat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {result && result.totalPages > 1 && (
        <div className="pagination">
          <button className="btn secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>Page {result.page} of {result.totalPages}</span>
          <button className="btn secondary" disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </>
  );
}
