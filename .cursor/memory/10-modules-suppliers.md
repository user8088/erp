# Suppliers Module Documentation

## Overview

The Suppliers module manages supplier relationships, purchase orders, invoices, and tracks payments to suppliers.

## Features

- **Supplier Management**: Create and manage supplier profiles
- **Purchase Orders**: Create and track POs per supplier
- **Invoice Tracking**: Manage supplier invoices and payments
- **Balance Tracking**: Monitor amounts owed to suppliers
- **Payment Recording**: Record and track payments to suppliers
- **History**: Complete purchase and payment history

## Routes & Pages

```
/suppliers                           - Suppliers list
/suppliers/[id]                      - Supplier detail
/suppliers/new                       - Create supplier

/supplier/invoices                   - All supplier invoices
/supplier-ledger-summary             - Supplier ledger report
```

## Components

### Suppliers List (`app/components/Suppliers/`)

#### SuppliersTable (`app/components/Suppliers/SuppliersTable.tsx`)
- **Features:**
  - List all suppliers
  - Status badges
  - Balance display
  - Quick actions
- **Columns:** Serial #, Name, Phone, Status, Balance, Actions

#### SupplierActionBar (`app/components/Suppliers/SupplierActionBar.tsx`)
- Bulk operations
- Export options

#### SupplierFilterBar (`app/components/Suppliers/SupplierFilterBar.tsx`)
- Search by name
- Filter by status

#### SuppliersPagination (`app/components/Suppliers/SuppliersPagination.tsx`)
- Page navigation
- Per-page selector

#### useSuppliersList (`app/components/Suppliers/useSuppliersList.ts`)
- Custom hook with caching
- Pagination and filtering

### Supplier Detail (`app/components/SupplierDetail/`)

#### SupplierDetailContent (`app/components/SupplierDetail/SupplierDetailContent.tsx`)
- Main layout component
- Tabs coordination

#### SupplierDetailHeader (`app/components/SupplierDetail/SupplierDetailHeader.tsx`)
- Supplier name and serial number
- Balance display
- Quick actions

#### SupplierDetailsForm (`app/components/SupplierDetail/SupplierDetailsForm.tsx`)
- **Form Fields:**
  - Serial Number (auto-generated)
  - Name
  - Email
  - Phone
  - Address
  - Status

#### SupplierDetailSidebar (`app/components/SupplierDetail/SupplierDetailSidebar.tsx`)
- Supplier summary
- Quick actions
- Activity log

#### SupplierDetailTabs (`app/components/SupplierDetail/SupplierDetailTabs.tsx`)
- Tabs: Details, Purchase Orders, Invoices, Payments

#### Items Supplied Table (inside `SupplierDetailContent`)
- In the `items-supplied` tab, the historical items table now shows:
  - Item name
  - Aggregated total quantity purchased from this supplier
  - Aggregated total item cost paid to supplier (PKR)
  - Latest linked supplier invoice number (plus invoice count when multiple invoices exist)
  - Last ordered date
  - Invoice actions:
    - Preview invoice
    - Download invoice
  - Shared-invoice highlighting:
    - Rows that share the same invoice number are tinted with the same subtle background color
    - This visually groups products purchased under the same supplier invoice
    - No extra "shared invoice" badge text is shown in cells (color-only grouping)
- Invoice file source priority:
  1. Supplier invoice metadata from PO list flattened fields:
     - `supplier_invoice_number`
     - `supplier_invoice_id`
     - `supplier_invoice_pdf_path`
  2. Nested fallback:
     - `supplier_invoice.invoice_number`
     - `supplier_invoice.pdf_path`
  3. Legacy fallback PO attachment via `supplier_invoice_path`

### Supplier Payments

#### Payments Tab Trend Analytics (inside `SupplierDetailContent`)
- Added a visual analytics section in the `payments` tab:
  - **Daily Purchases** (bar)
  - **Daily Payments** (bar)
  - **Outstanding Payable** trajectory (line)
  - **Cumulative Purchases** (line)
  - **Cumulative Payments** (line)
- Chart intent:
  - Quickly show whether supplier debit/payable is rising or stabilizing
  - Show whether purchasing velocity is increasing versus payment velocity
- Data source:
  - Reuses existing supplier payments data (`suppliersApi.getPayments`)
  - Reuses supplier purchase orders (`purchaseOrdersApi.getPurchaseOrders`)
  - Excludes cancelled POs from purchase trend aggregation

#### SupplierPaymentModal (`app/components/Suppliers/SupplierPaymentModal.tsx`)
- **Fields:**
  - Amount
  - Payment Date
  - Payment Method
  - Reference Number
  - Notes

## Type Definitions

```typescript
interface Supplier {
  id: number;
  serial_number: string;     // SUPP-XXXXXX format
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

interface SupplierBalanceResponse {
  supplier_id: number;
  balance: number;
  currency: string;
  total_invoiced: number;
  total_paid: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
}

interface SupplierPayment {
  id: number;
  supplier_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

## API Endpoints

```typescript
// List suppliers
GET /suppliers?page=1&per_page=20&search=&status=
Response: Paginated<Supplier>

// Get supplier
GET /suppliers/{id}
Response: Supplier

// Create supplier
POST /suppliers
Body: { name, email?, phone?, address?, status? }
Response: Supplier

// Update supplier
PUT /suppliers/{id}
Body: Partial<Supplier>
Response: Supplier

// Delete supplier
DELETE /suppliers/{id}

// Get balance
GET /suppliers/{id}/balance
Response: SupplierBalanceResponse

// Record payment
POST /suppliers/{id}/payments
Body: {
  amount: number,
  payment_date: string,
  payment_method: string,
  reference_number?: string,
  notes?: string
}
Response: SupplierPayment

// Get payments
GET /suppliers/{id}/payments?page=1&per_page=20
Response: Paginated<SupplierPayment>

// Get purchase orders
GET /suppliers/{id}/purchase-orders?page=1&per_page=20
Response: Paginated<PurchaseOrder>
```

## Permissions

| Feature | Permission | Level |
|---------|-----------|-------|
| View Suppliers | module.supplier | read |
| Create/Edit Suppliers | module.supplier | read-write |
| Record Payments | module.supplier | read-write |
| View Purchase Orders | module.stock | read |

## Related Documentation
- [Stock Module](./07-modules-stock.md) - Purchase orders integration
