# Customers Module Documentation

## Overview

The Customers module manages customer relationships, tracks sales history, payments, and provides comprehensive customer analytics.

## Features

- **Customer Management**: Create, edit, and manage customer profiles
- **Rating System**: 1-10 rating scale for customer quality
- **Status Tracking**: Clear/Has Dues status
- **Tag Management**: Categorize customers with colored tags
- **Financial Tracking**: Invoices, payments, advances, balances
- **Sales History**: Complete purchase history
- **Profitability Analysis**: Track profit per customer
- **Earnings & Stock Profit**: Advanced customer analytics

## Routes & Pages

```
/customer                            - Customers list
/customer/[id]                       - Customer detail
/customer/new                        - Create customer
/customer/invoices                   - All customer invoices
/customer/tags                       - Customer tag manager

/customer-ledger-summary             - Ledger summary report
/customer-credit-balance             - Credit balance report
/payment-period-based-on-invoice-date - Payment period analysis
```

## Components

### Customers List (`app/components/Customers/`)

#### CustomersTable (`app/components/Customers/CustomersTable.tsx`)
- **Features:**
  - List all customers
  - Rating display (1-10 stars)
  - Status badges (Clear, Has Dues)
  - Tag display
  - Quick actions
- **Columns:** Serial #, Name, Phone, Rating, Status, Tags, Balance, Actions

#### CustomerActionBar (`app/components/Customers/CustomerActionBar.tsx`)
- Bulk operations
- Export options (Excel, PDF)
- Print customer list

#### CustomerFilterBar (`app/components/Customers/CustomerFilterBar.tsx`)
- Search by name/phone
- Filter by rating
- Filter by status
- Filter by tags

#### CustomersPagination (`app/components/Customers/CustomersPagination.tsx`)
- Page navigation
- Per-page selector (10, 20, 50, 100)

#### useCustomersList (`app/components/Customers/useCustomersList.ts`)
- Custom hook with caching
- Pagination management
- Filter state
- Refresh functionality

### Customer Detail (`app/components/CustomerDetail/`)

#### CustomerDetailContent (`app/components/CustomerDetail/CustomerDetailContent.tsx`)
- Main layout component
- Tabs coordination
- Data loading orchestration

#### CustomerDetailHeader (`app/components/CustomerDetail/CustomerDetailHeader.tsx`)
- Customer name and serial number
- Quick stats (Total Spent, Balance)
- Status toggle
- Edit/Delete actions

#### CustomerDetailsForm (`app/components/CustomerDetail/CustomerDetailsForm.tsx`)
- **Form Fields:**
  - Serial Number (auto-generated)
  - Full Name (required)
  - Email
  - Phone
  - Address
  - Rating (1-10 slider)
  - Opening Due Amount
  - Tags
  - Picture upload

#### CustomerDetailSidebar (`app/components/CustomerDetail/CustomerDetailSidebar.tsx`)
- Customer summary card
- Tag management
- Quick actions (New Invoice, Record Payment)
- Activity log

#### CustomerDetailTabs (`app/components/CustomerDetail/CustomerDetailTabs.tsx`)
- Tabs: Details, Invoices, Payments, Earnings, Stock Profit, Delivery Profit, Rentals

### Customer Analytics Components

#### CustomerEarnings (`app/components/CustomerDetail/CustomerEarnings.tsx`)
- Earnings history table
- Monthly earnings summary
- Payment method breakdown

#### CustomerStockProfit (`app/components/CustomerDetail/CustomerStockProfit.tsx`)
- Profit per item purchased
- Total profit from customer
- Margin analysis

#### CustomerDeliveryProfit (`app/components/CustomerDetail/CustomerDeliveryProfit.tsx`)
- Delivery order profits
- Transport cost allocation
- Net delivery profit

#### CustomerRentals (`app/components/CustomerDetail/CustomerRentals.tsx`)
- Rental agreements for customer
- Payment status tracking
- Outstanding balances

### Record Payment Modal

#### RecordPaymentModal (`app/components/CustomerDetail/RecordPaymentModal.tsx`)
- **Fields:**
  - Amount
  - Payment Date
  - Payment Method (Cash, Bank, Credit)
  - Reference Number
  - Notes
  - Invoice Selection (optional)
- **Features:**
  - Auto-populate with outstanding balance
  - Multiple invoice allocation
  - Advance payment support

### Customer Tags

#### Tag Manager (`app/customer/tags/page.tsx`)
- Create/edit/delete customer tags
- Color picker for tags
- Tag assignment interface

## Type Definitions

### Core Customer Types

```typescript
interface Customer {
  id: number;
  serial_number: string;     // CUST-XXXXXX format
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  rating: number;            // 1-10 scale
  status: "clear" | "has_dues";
  picture_url: string | null;
  opening_due_amount?: number | null;
  created_at: string;
  updated_at: string;
}

interface CustomerTag {
  id: number;
  name: string;
  color: string;             // Hex color code
  created_at: string;
  updated_at: string;
}
```

### Customer Financial Types

```typescript
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
  net_balance: number;       // balance - advance
  currency: string;
}

interface CustomerBalance {
  customer_id: number;
  balance: number;
  total_invoiced: number;
  total_paid: number;
  total_advance: number;
  last_invoice_date: string | null;
  last_payment_date: string | null;
}
```

### Customer Analytics Types

```typescript
interface CustomerEarning {
  id: number;
  customer_id: number;
  invoice_id: number;
  amount: number;
  earning_date: string;
  description: string | null;
  created_at: string;
}

interface CustomerStockProfit {
  id: number;
  customer_id: number;
  item_id: number;
  item_name: string;
  quantity: number;
  total_revenue: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
}

interface CustomerDeliveryProfit {
  id: number;
  customer_id: number;
  delivery_order_id: number;
  revenue: number;
  cost: number;
  profit: number;
  delivery_date: string;
}
```

## API Endpoints

### Customers API

```typescript
// List customers
GET /customers?page=1&per_page=20&search=&status=&rating_filter=
Response: Paginated<Customer>

// Get customer detail
GET /customers/{id}
Response: Customer

// Create customer
POST /customers
Body: {
  name: string,
  email: string,
  phone?: string,
  address?: string,
  rating?: number,
  opening_due_amount?: number,
  tag_ids?: number[]
}
Response: Customer

// Update customer
PUT /customers/{id}
Body: Partial<Customer>
Response: Customer

// Delete customer
DELETE /customers/{id}

// Get customer balance
GET /customers/{id}/balance
Response: CustomerBalance

// Get customer invoices
GET /customers/{id}/invoices?page=1&per_page=20
Response: Paginated<Invoice>

// Get customer payments
GET /customers/{id}/payments?page=1&per_page=20
Response: Paginated<CustomerPayment>

// Get payment summary
GET /customers/{id}/payment-summary
Response: CustomerPaymentSummary

// Record payment
POST /customers/{id}/payments
Body: {
  amount: number,
  payment_date: string,
  payment_method: string,
  reference_number?: string,
  notes?: string,
  invoice_id?: number
}
Response: CustomerPayment

// Get earnings
GET /customers/{id}/earnings?page=1&per_page=20
Response: Paginated<CustomerEarning>

// Get stock profits
GET /customers/{id}/stock-profits?page=1&per_page=20
Response: Paginated<CustomerStockProfit>

// Get delivery profits
GET /customers/{id}/delivery-profits?page=1&per_page=20
Response: Paginated<CustomerDeliveryProfit>

// Get rentals
GET /customers/{id}/rentals?page=1&per_page=20
Response: Paginated<RentalAgreement>

// Export to Excel
GET /customers/export/excel?search=&status=
Response: Blob (Excel)

// Export to PDF
GET /customers/export/pdf?search=&status=
Response: Blob (PDF)
```

### Customer Tags API

```typescript
// List customer tags
GET /customer-tags
Response: CustomerTag[]

// Create tag
POST /customer-tags
Body: { name: string, color: string }
Response: CustomerTag

// Update tag
PUT /customer-tags/{id}
Body: { name: string, color: string }
Response: CustomerTag

// Delete tag
DELETE /customer-tags/{id}

// Sync customer tags
POST /customers/{id}/tags
Body: { tag_ids: number[] }
Response: Customer
```

## Business Logic

### Customer Serial Number Generation

```typescript
// Format: CUST-XXXXXX (auto-incremented)
// Example: CUST-000001, CUST-000002, ...
```

### Customer Status Determination

```typescript
const status: CustomerStatus =
  netBalance > 0 ? "has_dues" : "clear";

// Where netBalance = total_invoiced - total_paid - total_advance
```

### Rating System

```typescript
// Rating scale: 1-10
// Display: Star rating or progress bar
// Usage: Filter customers by minimum rating

// Filter examples:
// rating_filter: "8+" -> Rating >= 8
// rating_filter: "5-7" -> Rating 5-7
// rating_filter: "below5" -> Rating < 5
```

### Payment Allocation Priority

```typescript
// When payment is recorded without specific invoice:
// 1. Check if customer has outstanding invoices
// 2. Allocate to oldest invoice first (FIFO)
// 3. If excess payment, add to advance balance

// When payment is recorded with specific invoice:
// 1. Apply to that invoice only
// 2. Invoice status updates accordingly
```

### Customer Advance Handling

```typescript
// Advance can be:
// 1. Given: Customer pays in advance
//    - Increases advance balance
//    - Can be used for future invoices
//
// 2. Deducted: Used against invoice
//    - Decreases advance balance
//    - Records as payment
//
// 3. Refunded: Return advance to customer
//    - Decreases advance balance
//    - Records as negative transaction
```

### Opening Due Amount

```typescript
// Opening due is the starting balance when customer is created
// It's added to their total balance calculation

const totalBalance = opening_due_amount
                   + total_invoiced
                   - total_paid
                   - total_advance;
```

### Tag Management

```typescript
// Tags can be:
// 1. Created globally by admin
// 2. Assigned to multiple customers
// 3. Filtered in customer list
// 4. Used for customer segmentation

// Common tag uses:
// - VIP, Regular, New, Inactive
// - Region-based: North, South, East, West
// - Category-based: Retail, Wholesale, Corporate
```

## Component Usage Examples

### Displaying Customers List
```typescript
import { useCustomersList } from "../components/Customers/useCustomersList";

function CustomersPage() {
  const {
    customers,
    page,
    perPage,
    total,
    loading,
    error,
    setPage,
    setPerPage,
    filters,
    setFilters,
    refresh
  } = useCustomersList();

  return (
    <div>
      <CustomerFilterBar
        filters={filters}
        onChange={setFilters}
      />
      <CustomersTable
        customers={customers}
        loading={loading}
      />
      <CustomersPagination
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />
    </div>
  );
}
```

### Creating Customer
```typescript
const handleCreate = async () => {
  const customer = await customersApi.createCustomer({
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890",
    address: "123 Main St",
    rating: 8,
    opening_due_amount: 0,
    tag_ids: [1, 2]
  });

  router.push(`/customer/${customer.id}`);
};
```

### Recording Payment
```typescript
const handlePayment = async () => {
  await customersApi.recordPayment(customerId, {
    amount: 5000,
    payment_date: "2024-01-15",
    payment_method: "cash",
    reference_number: "PMT-001",
    notes: "Partial payment",
    // Optional: specific invoice
    invoice_id: 123
  });

  // Refresh customer data
  refresh();
};
```

### Displaying Customer Analytics
```typescript
const [profits, setProfits] = useState<CustomerStockProfit[]>([]);

useEffect(() => {
  customersApi.getStockProfits(customerId, { page: 1, per_page: 20 })
    .then(response => setProfits(response.data));
}, [customerId]);

// Calculate totals
const totalProfit = profits.reduce((sum, p) => sum + p.profit, 0);
const totalRevenue = profits.reduce((sum, p) => sum + p.total_revenue, 0);
```

### Managing Tags
```typescript
// Sync tags for customer
await customerTagsApi.syncCustomerTags(customerId, [1, 3, 5]);

// Create new tag
const newTag = await customerTagsApi.createCustomerTag({
  name: "VIP",
  color: "#FFD700"
});
```

## Permissions

| Feature | Permission | Level |
|---------|-----------|-------|
| View Customers | module.customer | read |
| Create/Edit Customers | module.customer | read-write |
| Delete Customers | module.customer | read-write |
| Record Payments | module.customer | read-write |
| View Invoices | module.customer | read |
| View Reports | module.customer | read |
| Manage Tags | module.tag_manager | read-write |

## Related Documentation
- [Type System](./04-type-system.md) - Customer, CustomerTag, CustomerPayment types
- [API Client](./03-api-client.md) - customersApi, customerTagsApi
- [Selling Module](./08-modules-selling.md) - Invoice and sales integration
- [Rental Module](./11-modules-rental.md) - Rental agreements for customers
