# Invoice System Documentation

## Overview

The Invoice System provides a comprehensive solution for managing different types of invoices in the ERP system. Currently, it supports **Supplier Invoices** which are automatically generated when supplier payments are made. The system is designed to be extensible for other invoice types (sale, payment, purchase, expense) in the future.

## Table of Contents

1. [Database Schema](#database-schema)
2. [Invoice Types](#invoice-types)
3. [Invoice Number Format](#invoice-number-format)
4. [API Endpoints](#api-endpoints)
5. [Frontend Integration Guide](#frontend-integration-guide)
6. [Invoice PDF Generation](#invoice-pdf-generation)
7. [Error Handling](#error-handling)
8. [Examples](#examples)

---

## Database Schema

### `invoices` Table

```sql
CREATE TABLE invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_type ENUM('supplier', 'sale', 'payment', 'purchase', 'expense') NOT NULL,
    company_id BIGINT UNSIGNED NULL,
    reference_type VARCHAR(50) NULL, -- e.g., 'App\Models\SupplierPayment'
    reference_id BIGINT UNSIGNED NULL, -- ID of the related record
    amount DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NULL,
    status ENUM('draft', 'issued', 'paid', 'cancelled') DEFAULT 'issued',
    pdf_path VARCHAR(255) NULL, -- Path to generated PDF file
    metadata JSON NULL, -- Additional data (supplier info, payment details, etc.)
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    INDEX idx_invoice_type_date (invoice_type, invoice_date),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_status_date (status, invoice_date),
    INDEX idx_invoice_number (invoice_number)
);
```

### Key Fields

- **invoice_number**: Unique serial number per invoice type (e.g., `SUP-20251209-001`)
- **invoice_type**: Type of invoice (supplier, sale, payment, purchase, expense)
- **reference_type** & **reference_id**: Polymorphic relationship to the source record (e.g., SupplierPayment)
- **metadata**: JSON field containing structured data (supplier info, payment details, etc.)
- **pdf_path**: Path to the generated PDF file in storage
- **status**: Current status of the invoice

---

## Invoice Types

Currently implemented:
- **supplier**: Generated automatically when a supplier payment is made

Planned for future:
- **sale**: Customer sale invoices
- **payment**: Payment receipts
- **purchase**: Purchase invoices
- **expense**: Expense invoices

---

## Invoice Number Format

Each invoice type has a unique prefix and format:

| Invoice Type | Prefix | Format | Example |
|-------------|--------|--------|---------|
| Supplier | SUP | `SUP-YYYYMMDD-XXX` | `SUP-20251209-001` |
| Sale | SAL | `SAL-YYYYMMDD-XXX` | `SAL-20251209-001` |
| Payment | PAY | `PAY-YYYYMMDD-XXX` | `PAY-20251209-001` |
| Purchase | PUR | `PUR-YYYYMMDD-XXX` | `PUR-20251209-001` |
| Expense | EXP | `EXP-YYYYMMDD-XXX` | `EXP-20251209-001` |

The serial number (XXX) resets daily and increments sequentially.

---

## API Endpoints

All endpoints require authentication (`auth:sanctum` middleware).

### Base URL
```
/api/invoices
```

### 1. List Invoices

**Endpoint:** `GET /api/invoices`

**Description:** Retrieve a paginated list of invoices with optional filters.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `invoice_type` | string | No | Filter by invoice type (`supplier`, `sale`, etc.) |
| `status` | string | No | Filter by status (`draft`, `issued`, `paid`, `cancelled`) |
| `start_date` | date | No | Filter invoices from this date (YYYY-MM-DD) |
| `end_date` | date | No | Filter invoices until this date (YYYY-MM-DD) |
| `search` | string | No | Search by invoice number or supplier name |
| `sort_by` | string | No | Sort field (default: `invoice_date`) |
| `sort_direction` | string | No | Sort direction: `asc` or `desc` (default: `desc`) |
| `per_page` | integer | No | Items per page (default: 15, max: 100) |

**Response (200 OK):**

```json
{
  "invoices": [
    {
      "id": 1,
      "invoice_number": "SUP-20251209-001",
      "invoice_type": "supplier",
      "type_label": "Supplier Invoice",
      "company_id": null,
      "reference_type": "App\\Models\\SupplierPayment",
      "reference_id": 1,
      "amount": 50000.00,
      "tax_amount": 0.00,
      "total_amount": 50000.00,
      "invoice_date": "2025-12-09",
      "due_date": null,
      "status": "issued",
      "pdf_path": "invoices/supplier/SUP-20251209-001.pdf",
      "has_pdf": true,
      "metadata": {
        "supplier": {
          "id": 1,
          "name": "ABC Suppliers",
          "contact_person": "John Doe",
          "email": "john@abcsuppliers.com",
          "phone": "+92-300-1234567",
          "address": "123 Main Street, Karachi"
        },
        "payment": {
          "payment_number": "PAY-20251209-001",
          "payment_date": "2025-12-09",
          "payment_account": {
            "id": 8,
            "name": "Cash in Hand",
            "number": "1110"
          },
          "invoice_number": "INV-2025-001",
          "notes": "Payment via bank transfer"
        }
      },
      "notes": "Payment via bank transfer",
      "created_by": 1,
      "created_at": "2025-12-09T10:30:00.000000Z",
      "updated_at": "2025-12-09T10:30:00.000000Z",
      "creator": {
        "id": 1,
        "name": "Admin User"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 15,
    "total": 1,
    "last_page": 1
  }
}
```

**Example Request:**
```bash
GET /api/invoices?invoice_type=supplier&status=issued&start_date=2025-12-01&end_date=2025-12-31&per_page=20
```

---

### 2. Get Invoice Details

**Endpoint:** `GET /api/invoices/{id}`

**Description:** Retrieve detailed information about a specific invoice.

**Response (200 OK):**

```json
{
  "invoice": {
    "id": 1,
    "invoice_number": "SUP-20251209-001",
    "invoice_type": "supplier",
    "type_label": "Supplier Invoice",
    "company_id": null,
    "reference_type": "App\\Models\\SupplierPayment",
    "reference_id": 1,
    "amount": 50000.00,
    "tax_amount": 0.00,
    "total_amount": 50000.00,
    "invoice_date": "2025-12-09",
    "due_date": null,
    "status": "issued",
    "pdf_path": "invoices/supplier/SUP-20251209-001.pdf",
    "has_pdf": true,
    "metadata": {
      "supplier": {
        "id": 1,
        "name": "ABC Suppliers",
        "contact_person": "John Doe",
        "email": "john@abcsuppliers.com",
        "phone": "+92-300-1234567",
        "address": "123 Main Street, Karachi"
      },
      "payment": {
        "payment_number": "PAY-20251209-001",
        "payment_date": "2025-12-09",
        "payment_account": {
          "id": 8,
          "name": "Cash in Hand",
          "number": "1110"
        },
        "invoice_number": "INV-2025-001",
        "notes": "Payment via bank transfer"
      }
    },
    "notes": "Payment via bank transfer",
    "created_by": 1,
    "created_at": "2025-12-09T10:30:00.000000Z",
    "updated_at": "2025-12-09T10:30:00.000000Z",
    "creator": {
      "id": 1,
      "name": "Admin User"
    },
    "reference": {
      "id": 1,
      "payment_number": "PAY-20251209-001",
      "amount": 50000.00,
      "payment_date": "2025-12-09"
    }
  }
}
```

**Error Response (404):**

```json
{
  "message": "Invoice not found"
}
```

---

### 3. Download Invoice PDF

**Endpoint:** `GET /api/invoices/{id}/download`

**Description:** Download the invoice PDF file. If PDF doesn't exist, it will be generated automatically.

**Response:** Binary PDF file with headers:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="SUP-20251209-001.pdf"`

**Error Response (404):**

```json
{
  "message": "Invoice not found"
}
```

or

```json
{
  "message": "PDF file not found or could not be generated"
}
```

**Example Usage (JavaScript):**

```javascript
async function downloadInvoice(invoiceId) {
  const response = await fetch(`/api/invoices/${invoiceId}/download`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } else {
    const error = await response.json();
    console.error('Download failed:', error.message);
  }
}
```

---

### 4. View Invoice PDF in Browser

**Endpoint:** `GET /api/invoices/{id}/view`

**Description:** View the invoice PDF directly in the browser (inline display). If PDF doesn't exist, it will be generated automatically.

**Response:** Binary PDF file with headers:
- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="SUP-20251209-001.pdf"`

**Example Usage (HTML):**

```html
<iframe src="/api/invoices/1/view" width="100%" height="600px"></iframe>
```

---

### 5. Update Invoice Status

**Endpoint:** `PATCH /api/invoices/{id}/status`

**Description:** Update the status of an invoice.

**Request Body:**

```json
{
  "status": "paid"
}
```

**Valid Status Values:**
- `draft`: Invoice is in draft state
- `issued`: Invoice has been issued (default)
- `paid`: Invoice has been paid
- `cancelled`: Invoice has been cancelled

**Response (200 OK):**

```json
{
  "invoice": {
    "id": 1,
    "invoice_number": "SUP-20251209-001",
    "status": "paid",
    ...
  },
  "message": "Invoice status updated successfully"
}
```

**Error Response (404):**

```json
{
  "message": "Invoice not found"
}
```

**Error Response (422) - Validation Error:**

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "status": [
      "The selected status is invalid."
    ]
  }
}
```

---

## Frontend Integration Guide

### 1. Invoice List Component

Create a table component to display invoices with filters:

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    invoice_type: '',
    status: '',
    start_date: '',
    end_date: '',
    search: '',
    per_page: 15
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [filters]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(`/api/invoices?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setInvoices(response.data.invoices);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (invoiceId) => {
    try {
      const response = await axios.get(`/api/invoices/${invoiceId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading invoice:', error);
    }
  };

  return (
    <div>
      <h1>Invoices</h1>
      
      {/* Filters */}
      <div className="filters">
        <select 
          value={filters.invoice_type} 
          onChange={(e) => setFilters({...filters, invoice_type: e.target.value})}
        >
          <option value="">All Types</option>
          <option value="supplier">Supplier</option>
          <option value="sale">Sale</option>
        </select>

        <select 
          value={filters.status} 
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <input
          type="date"
          value={filters.start_date}
          onChange={(e) => setFilters({...filters, start_date: e.target.value})}
          placeholder="Start Date"
        />

        <input
          type="date"
          value={filters.end_date}
          onChange={(e) => setFilters({...filters, end_date: e.target.value})}
          placeholder="End Date"
        />

        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          placeholder="Search..."
        />
      </div>

      {/* Invoice Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Type</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice.id}>
                <td>{invoice.invoice_number}</td>
                <td>{invoice.type_label}</td>
                <td>{invoice.invoice_date}</td>
                <td>{invoice.metadata?.supplier?.name || 'N/A'}</td>
                <td>PKR {parseFloat(invoice.total_amount).toLocaleString()}</td>
                <td>
                  <span className={`status status-${invoice.status}`}>
                    {invoice.status}
                  </span>
                </td>
                <td>
                  <button onClick={() => handleDownload(invoice.id)}>
                    Download PDF
                  </button>
                  <a 
                    href={`/api/invoices/${invoice.id}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div className="pagination">
        <button 
          disabled={pagination.current_page === 1}
          onClick={() => setFilters({...filters, page: pagination.current_page - 1})}
        >
          Previous
        </button>
        <span>
          Page {pagination.current_page} of {pagination.last_page}
        </span>
        <button 
          disabled={pagination.current_page === pagination.last_page}
          onClick={() => setFilters({...filters, page: pagination.current_page + 1})}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default InvoiceList;
```

---

### 2. Invoice Detail View Component

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

function InvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await axios.get(`/api/invoices/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setInvoice(response.data.invoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const response = await axios.patch(
        `/api/invoices/${id}/status`,
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setInvoice(response.data.invoice);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!invoice) return <p>Invoice not found</p>;

  const supplier = invoice.metadata?.supplier || {};
  const payment = invoice.metadata?.payment || {};

  return (
    <div className="invoice-detail">
      <div className="invoice-header">
        <h1>{invoice.invoice_number}</h1>
        <div className="actions">
          <button onClick={() => window.open(`/api/invoices/${id}/view`, '_blank')}>
            View PDF
          </button>
          <button onClick={() => {
            // Download logic
          }}>
            Download PDF
          </button>
        </div>
      </div>

      <div className="invoice-info">
        <div>
          <strong>Type:</strong> {invoice.type_label}
        </div>
        <div>
          <strong>Date:</strong> {invoice.invoice_date}
        </div>
        <div>
          <strong>Status:</strong> 
          <select 
            value={invoice.status}
            onChange={(e) => handleStatusUpdate(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="supplier-info">
        <h2>Supplier Information</h2>
        <p><strong>Name:</strong> {supplier.name}</p>
        <p><strong>Contact Person:</strong> {supplier.contact_person}</p>
        <p><strong>Email:</strong> {supplier.email}</p>
        <p><strong>Phone:</strong> {supplier.phone}</p>
        <p><strong>Address:</strong> {supplier.address}</p>
      </div>

      <div className="payment-info">
        <h2>Payment Details</h2>
        <p><strong>Payment Number:</strong> {payment.payment_number}</p>
        <p><strong>Payment Date:</strong> {payment.payment_date}</p>
        <p><strong>Payment Account:</strong> {payment.payment_account?.name}</p>
        <p><strong>Supplier Invoice #:</strong> {payment.invoice_number || 'N/A'}</p>
      </div>

      <div className="amount-info">
        <h2>Amount</h2>
        <p><strong>Amount:</strong> PKR {parseFloat(invoice.amount).toLocaleString()}</p>
        <p><strong>Tax:</strong> PKR {parseFloat(invoice.tax_amount).toLocaleString()}</p>
        <p><strong>Total:</strong> PKR {parseFloat(invoice.total_amount).toLocaleString()}</p>
      </div>

      {invoice.notes && (
        <div className="notes">
          <h2>Notes</h2>
          <p>{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}

export default InvoiceDetail;
```

---

## Invoice PDF Generation

### Current Implementation

The system currently generates HTML-based invoices. For production use, you should install a PDF library:

```bash
composer require barryvdh/laravel-dompdf
```

Then update the `InvoiceService::renderInvoicePdf()` method to use the PDF library.

### PDF Storage

PDFs are stored in: `storage/app/public/invoices/{invoice_type}/{invoice_number}.pdf`

Make sure to create a symbolic link:
```bash
php artisan storage:link
```

---

## Error Handling

### Common Error Responses

**404 Not Found:**
```json
{
  "message": "Invoice not found"
}
```

**400 Bad Request:**
```json
{
  "message": "Error message here"
}
```

**422 Validation Error:**
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "field_name": [
      "Error message"
    ]
  }
}
```

---

## Examples

### Example: Creating a Supplier Payment (Auto-generates Invoice)

When you create a supplier payment, an invoice is automatically generated:

```javascript
// POST /api/suppliers/{supplierId}/payments
const response = await axios.post(
  `/api/suppliers/1/payments`,
  {
    amount: 50000,
    payment_date: '2025-12-09',
    payment_account_id: 8,
    invoice_number: 'INV-2025-001',
    notes: 'Payment via bank transfer'
  },
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

// Response includes the invoice
console.log(response.data.invoice);
// {
//   id: 1,
//   invoice_number: "SUP-20251209-001",
//   invoice_type: "supplier",
//   ...
// }
```

---

## Notes for Frontend Developers

1. **Invoice Auto-Generation**: Supplier invoices are automatically created when payments are made. No separate API call is needed.

2. **PDF Generation**: PDFs are generated on-demand. If a PDF doesn't exist when you request it, it will be generated automatically.

3. **Metadata Structure**: The `metadata` field contains structured JSON data. For supplier invoices, it includes:
   - `supplier`: Supplier information
   - `payment`: Payment details

4. **Status Management**: Use the status update endpoint to track invoice lifecycle (draft → issued → paid).

5. **Filtering**: The list endpoint supports multiple filters. Combine them for advanced search functionality.

6. **Pagination**: Always check the pagination object to implement proper pagination controls.

---

## Future Enhancements

- [ ] Support for other invoice types (sale, payment, purchase, expense)
- [ ] Email invoice functionality
- [ ] Invoice templates customization
- [ ] Multi-currency support
- [ ] Tax calculation integration
- [ ] Invoice approval workflow
- [ ] Bulk invoice operations

---

## Support

For issues or questions, please contact the development team or refer to the main API documentation.

