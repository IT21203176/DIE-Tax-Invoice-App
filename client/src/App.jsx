import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import InvoiceFormPage from './pages/InvoiceFormPage.jsx';
import InvoiceListPage from './pages/InvoiceListPage.jsx';
import InvoiceViewPage from './pages/InvoiceViewPage.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Tax Invoice</span>
        <nav>
          <NavLink to="/invoices" end>Invoices</NavLink>
          <NavLink to="/invoices/new">New invoice</NavLink>
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/invoices" replace />} />
          <Route path="/invoices" element={<InvoiceListPage />} />
          <Route path="/invoices/new" element={<InvoiceFormPage />} />
          <Route path="/invoices/:id" element={<InvoiceViewPage />} />
          <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
