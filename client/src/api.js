const API_BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (response.status === 204) return null;

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(body.message || `Request failed (${response.status})`, response.status, body.errors);
  }
  return body;
}

export const api = {
  listInvoices: ({ search = '', page = 1, limit = 20 } = {}) =>
    request(`/api/invoices?${new URLSearchParams({ search, page, limit })}`),
  getInvoice: (id) => request(`/api/invoices/${id}`),
  getDefaults: (invoiceDate = '') =>
    request(`/api/invoices/defaults?${new URLSearchParams({ invoiceDate })}`),
  createInvoice: (data) => request('/api/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id, data) =>
    request(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvoice: (id) => request(`/api/invoices/${id}`, { method: 'DELETE' }),
  pdfUrl: (id, { download = false } = {}) =>
    `${API_BASE}/api/invoices/${id}/pdf${download ? '?download=1' : ''}`,
};
