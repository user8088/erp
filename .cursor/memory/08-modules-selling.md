# Selling Module Documentation

## Overview

The Selling module manages sales operations including sale invoices, sales orders, and Point of Sale (POS) functionality. It tracks customer sales, payments, and integrates with stock for inventory management.

## Features

- **Sale Invoices**: Create, manage, and track customer invoices
- **Sales Orders**: Order management before invoicing
- **Point of Sale (POS)**: Quick retail sales interface
- **Payment Tracking**: Record and track customer payments
- **Sales Analytics**: Trends, top-selling items, revenue analysis
- **Customer Integration**: Link sales to customer records
- **Stock Integration**: Automatic stock deduction on sales

## Routes & Pages

```
/selling                             - Selling dashboard
/selling/sale-invoices               - Sale invoices list
/selling/sales-orders                - Sales orders list
/selling/point-of-sale               - POS interface
/selling/settings                    - Selling settings

/sales-invoice-trends                - Invoice trend reports
/sales-payment-summary               - Payment summary reports
/sales-partners-commission           - Commission reports
```

## Components

### Selling Dashboard (`app/selling/page.tsx`)
- **Components:**
  - `SellingQuickAccess` - Quick action buttons
  - `SellingChartsPanel` - Sales charts
  - `SellingAdditionalSections` - Additional metrics
  - `SellingReports` - Report links

### Sale Invoices

#### Sale Invoices Page (`app/selling/sale-invoices/page.tsx`)
- **Features:**
  - List all sale invoices
  - Filter by customer, date, status
  - Search by invoice number
  - Pagination
- **Columns:** Invoice #, Customer, Date, Amount, Status, Actions
- **Status:** Draft → Issued → Partial → Paid → Cancelled

#### POS Page (`app/selling/point-of-sale/page.tsx`)
- **Features:**
  - Quick item search and add
  - Barcode scanning support
  - Customer selection
  - Payment method selection
  - Cash/Credit/Card payments
  - Receipt printing
  - Real-time stock check
- **Layout:**
  - Left: Item catalog/search
  - Center: Cart/items list
  - Right: Customer, totals, payment

### Sales Charts & Analytics

#### SellingChartsPanel (`app/components/Selling/SellingChartsPanel.tsx`)
- **Charts:**
  - Sales by period (line chart)
  - Top selling items (bar chart)
  - Revenue by category (pie chart)

#### SellingChartsPanelHome (`app/components/Selling/SellingChartsPanelHome.tsx`)
- Dashboard version with summary metrics

#### SalesOrderTrendsChart (`app/components/Selling/SalesOrderTrendsChart.tsx`)
- Order trend visualization
- Comparison with previous periods

### Customer Payment

#### RecordPaymentModal (`app/components/CustomerDetail/RecordPaymentModal.tsx`)
- Used from Customer Detail
- Record payment against:
  - Specific invoice
  - Customer account (advance payment)
- **Fields:**
  - Amount
  - Payment date
  - Payment method (Cash, Bank, Credit)
  - Reference number
  - Notes

## Type Definitions

### Core Selling Types

```typescript
// Invoice Types
interface Invoice {
  id: number;
  invoice_number: string;
  invoice_type: 'sale' | 'purchase' | 'supplier' | 'staff' | 'journal';
  customer_id: number | null;
  customer?: Customer | null;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: 'draft' | 'issued' | 'partial' | 'paid' | 'cancelled';
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

interface InvoiceItem {
  id: number;
  invoice_id: number;
  item_id: number;
  item?: Item;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  batch_id?: number | null;
}

// Sale Order Types
interface Sale {
  id: number;
  sale_number: string;
  customer_id: number;
  customer?: Customer;
  sale_date: string;
  total_amount: number;
  status: 'draft' | 'confirmed' | 'invoiced' | 'cancelled';
  items: SaleItem[];
  invoice?: Invoice | null;
  created_at: string;
  updated_at: string;
}

interface SaleItem {
  id: number;
  sale_id: number;
  item_id: number;
  item?: Item;
  quantity: number;
  unit_price: number;
  total_price: number;
  batch_id?: number | null;
}

// Customer Payment Types
interface CustomerPayment {
  id: number;
  customer_id: number;
  invoice_id: number | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerAdvance {
  id: number;
  customer_id: number;
  amount: number;
  balance: number;
  transaction_type: 'given' | 'deducted' | 'refunded';
  reference: string | null;
  transaction_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerPaymentSummary {
  customer_id: number;
  total_invoiced: number;
  total_paid: number;
  total_balance: number;
  total_advance: number;
  net_balance: number;  // balance - advance
  currency: string;
}
```

### Analytics Types

```typescript
interface SalesAnalyticsResponse {
  item_id: number;
  total_sales: number;
  total_quantity: number;
  total_revenue: number;
  average_price: number;
  period: string;
  by_month: MonthlySalesData[];
}

interface MonthlySalesData {
  month: string;
  quantity: number;
  revenue: number;
  average_price: number;
}

interface TrendDataPoint {
  date: string;
  label: string;
  value: number;
  change_from_previous: number;
  change_percent: number;
}

interface TopSellingItem {
  item_id: number;
  item_name: string;
  total_quantity: number;
  total_revenue: number;
}
```

## API Endpoints

### Sale Invoices API

```typescript
// List invoices
GET /sale-invoices?customer_id=&status=&page=1&per_page=20
Response: Paginated<Invoice>

// Get invoice detail
GET /sale-invoices/{id}
Response: Invoice

// Create invoice
POST /sale-invoices
Body: {
  customer_id: number,
  issue_date: string,
  due_date?: string,
  items: [
    { item_id, quantity, unit_price, description }
  ]
}
Response: Invoice

// Update invoice
PUT /sale-invoices/{id}
Body: Partial<Invoice>
Response: Invoice

// Cancel invoice
POST /sale-invoices/{id}/cancel
Response: Invoice

// Record payment
POST /sale-invoices/{id}/payments
Body: {
  amount: number,
  payment_date: string,
  payment_method: string,
  reference_number?: string,
  notes?: string
}
Response: CustomerPayment
```

### Sales Orders API

```typescript
// List sales orders
GET /sales-orders?customer_id=&status=&page=1&per_page=20
Response: Paginated<Sale>

// Get sales order
GET /sales-orders/{id}
Response: Sale

// Create sales order
POST /sales-orders
Body: {
  customer_id: number,
  sale_date: string,
  items: [
    { item_id, quantity, unit_price }
  ]
}
Response: Sale

// Update sales order
PUT /sales-orders/{id}
Body: Partial<Sale>
Response: Sale

// Convert to invoice
POST /sales-orders/{id}/invoice
Response: { sale: Sale, invoice: Invoice }

// Cancel sales order
POST /sales-orders/{id}/cancel
Response: Sale
```

### Customer Payments API

```typescript
// Record customer payment
POST /customers/{id}/payments
Body: {
  amount: number,
  payment_date: string,
  payment_method: string,
  reference_number?: string,
  notes?: string,
  invoice_id?: number  // Optional: specific invoice
}
Response: CustomerPayment

// Get customer payments
GET /customers/{id}/payments?page=1&per_page=20
Response: Paginated<CustomerPayment>

// Get payment summary
GET /customers/{id}/payment-summary
Response: CustomerPaymentSummary

// Give advance
POST /customers/{id}/advances
Body: {
  amount: number,
  transaction_date: string,
  notes?: string
}
Response: CustomerAdvance
```

### POS API

```typescript
// Get POS items (quick catalog)
GET /pos/items?search=&category_id=&page=1&per_page=50
Response: Paginated<Item>

// Create POS sale (quick invoice)
POST /pos/sale
Body: {
  customer_id?: number,  // Optional: walk-in if null
  items: [
    { item_id, quantity, unit_price }
  ],
  payment: {
    method: 'cash' | 'card' | 'credit',
    amount: number,
    reference?: string
  }
}
Response: { invoice: Invoice, payment: CustomerPayment }
```

### Sales Trends API

```typescript
// Get sales trends
GET /reports/sales-trends?start_date=&end_date=&group_by=month
Response: TrendAnalysis

// Get top selling items
GET /reports/top-selling-items?start_date=&end_date=&limit=10
Response: TopSellingItem[]

// Get payment summary
GET /reports/payment-summary?start_date=&end_date=
Response: {
  total_cash: number,
  total_card: number,
  total_credit: number,
  total: number
}
```

## Business Logic

### Invoice Lifecycle

```
Draft
  ↓ (Issue)
Issued
  ↓ (Partial Payment)
Partial ← → Paid
  ↓ (Full Payment)
Paid
  ↓ (Cancel - if allowed)
Cancelled
```

### Payment Allocation

```typescript
// When recording payment:
// 1. If invoice_id specified:
//    - Apply to that invoice only
//
// 2. If no invoice_id (advance payment):
//    - Add to customer advance balance
//    - Can be used for future invoices

// Example:
const payment = {
  amount: 5000,
  invoice_id: 123,  // Specific invoice
  // OR
  invoice_id: null,  // Advance payment
};
```

### Sales Order to Invoice

```typescript
// 1. Create sales order (status: draft)
const order = await salesOrdersApi.createSalesOrder({
  customer_id: 456,
  sale_date: "2024-01-15",
  items: [{ item_id: 1, quantity: 10, unit_price: 100 }]
});

// 2. Confirm order (status: confirmed)
await salesOrdersApi.updateSalesOrder(order.id, { status: "confirmed" });

// 3. Convert to invoice (status: invoiced)
const result = await salesOrdersApi.convertToInvoice(order.id);
// Returns { sale, invoice }
```

### Stock Integration on Sale

When a sale invoice is created:

```
1. Validate stock availability
2. Deduct stock from batches (FIFO)
3. Create stock movement records
4. Update item quantities
5. (Optional) Create accounting entries:
   Debit: Accounts Receivable
   Credit: Sales Revenue
   Debit: COGS
   Credit: Inventory
```

### POS Quick Sale

```typescript
// POS sale automatically:
// 1. Creates invoice
// 2. Records payment
// 3. Deducts stock
// 4. All in one transaction

const result = await sellingApi.createPosSale({
  customer_id: null,  // Walk-in customer
  items: cartItems,
  payment: {
    method: "cash",
    amount: totalAmount,
    reference: "POS-001"
  }
});
```

### Customer Balance Calculation

```typescript
// Net Balance = Total Invoiced - Total Paid - Total Advance
const netBalance = summary.total_invoiced
                 - summary.total_paid
                 - summary.total_advance;

// If positive: Customer owes money
// If negative: Store owes customer (credit)
```

## Component Usage Examples

### Displaying Sale Invoices
```typescript
import { sellingApi } from "../lib/apiClient";

function SaleInvoicesList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    sellingApi.getSaleInvoices({ page: 1, per_page: 20 })
      .then(response => setInvoices(response.data));
  }, []);

  return (
    <table>
      {invoices.map(invoice => (
        <tr key={invoice.id}>
          <td>{invoice.invoice_number}</td>
          <td>{invoice.customer?.name}</td>
          <td>{invoice.issue_date}</td>
          <td>${invoice.total_amount}</td>
          <td>{invoice.status}</td>
        </tr>
      ))}
    </table>
  );
}
```

### Recording Payment
```typescript
const handleRecordPayment = async () => {
  await customersApi.recordPayment(customerId, {
    amount: 5000,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "cash",
    reference_number: "REF-001",
    invoice_id: 123  // Optional: specific invoice
  });

  // Refresh data
  refresh();
};
```

### Creating Sales Order
```typescript
const handleCreateOrder = async () => {
  const order = await sellingApi.createSalesOrder({
    customer_id: 456,
    sale_date: "2024-01-15",
    items: cartItems.map(item => ({
      item_id: item.id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }))
  });

  router.push(`/selling/sales-orders/${order.id}`);
};
```

### Displaying Sales Analytics
```typescript
const [analytics, setAnalytics] = useState<SalesAnalyticsResponse | null>(null);

useEffect(() => {
  itemsApi.getSalesAnalytics(itemId, { period: "current_month" })
    .then(setAnalytics);
}, [itemId]);

// Display in chart
<SalesAnalyticsChart data={analytics?.by_month} />
```

## Permissions

| Feature | Permission | Level |
|---------|-----------|-------|
| View Sale Invoices | module.selling | read |
| Create/Edit Invoices | module.selling | read-write |
| Cancel Invoices | module.selling | read-write |
| View Sales Orders | module.selling | read |
| Create Sales Orders | module.selling | read-write |
| Use POS | module.selling | read-write |
| Record Payments | module.selling | read-write |
| View Reports | module.selling | read |

## Related Documentation
- [Type System](./04-type-system.md) - Invoice, Sale, CustomerPayment types
- [API Client](./03-api-client.md) - sellingApi, customersApi
- [Customer Module](./09-modules-customers.md) - Customer integration with sales
- [Stock Module](./07-modules-stock.md) - Stock integration with sales
