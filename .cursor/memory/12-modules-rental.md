# Rental Module Documentation

## Overview

The Rental module manages rental items, agreements, payments, and returns. It tracks rental inventory availability and customer rental history.

## Features

- **Rental Items**: Manage items available for rent
- **Categories**: Organize rental items by category
- **Rental Agreements**: Create and manage rental contracts
- **Payment Tracking**: Schedule and record rental payments
- **Returns Processing**: Handle item returns with condition assessment
- **Security Deposits**: Track deposit collection and refunds
- **Outstanding Balance**: Monitor due payments
- **Bad Debt Write-off**: Handle uncollectible rental debts

## Routes & Pages

```
/rental/items                        - Rental items list
/rental/items/[id]                   - Rental item detail
/rental/items/new                    - Create rental item

/rental/agreements                   - Rental agreements list
/rental/agreements/new              - Create agreement

/rental/categories                   - Rental categories
/rental/payments                     - Rental payments
/rental/returns                      - Returned items
/rental/settings                     - Rental settings
```

## Components

### Rental Items (`app/components/Rentals/RentalItems/`)

#### RentalItemsTable (`app/components/Rentals/RentalItems/RentalItemsTable.tsx`)
- **Columns:** Name, SKU, Category, Price/Day, Available, Rented, Status
- **Status:** Available, Partial, Rented, Maintenance

#### RentalItemsActionBar (`app/components/Rentals/RentalItems/RentalItemsActionBar.tsx`)
- Bulk operations
- Export options

#### RentalItemsFilterBar (`app/components/Rentals/RentalItems/RentalItemsFilterBar.tsx`)
- Filter by category, status
- Search by name/SKU

#### useRentalItemsList (`app/components/Rentals/RentalItems/useRentalItemsList.ts`)
- Data fetching with caching

### Rental Agreements (`app/components/Rentals/RentalAgreements/`)

#### RentalAgreementsTable (`app/components/Rentals/RentalAgreements/RentalAgreementsTable.tsx`)
- **Columns:** Agreement #, Customer, Item, Dates, Amount, Paid, Due, Status
- **Status:** Active, Completed, Overdue, Cancelled

#### RentalAgreementDetailModal (`app/components/Rentals/RentalAgreements/RentalAgreementDetailModal.tsx`)
- Full agreement details
- Payment schedule
- History timeline

#### RecordPaymentModal (`app/components/Rentals/RentalAgreements/RecordPaymentModal.tsx`)
- Record rental payment
- Apply to specific schedule or general

#### ReturnRentalModal (`app/components/Rentals/RentalAgreements/ReturnRentalModal.tsx`)
- Process item return
- Condition assessment
- Damage/late charges

#### WriteOffBadDebtModal (`app/components/Rentals/RentalAgreements/WriteOffBadDebtModal.tsx`)
- Write off uncollectible debt
- Requires reason and approval

### Shared Components (`app/components/Rentals/Shared/`)

#### StatusBadge (`app/components/Rentals/Shared/StatusBadge.tsx`)
- Rental status visualization
- Color-coded badges

#### PaymentStatusBadge (`app/components/Rentals/Shared/PaymentStatusBadge.tsx`)
- Payment status: Unpaid, Partially Paid, Paid, Late

#### RentalAccountingStatusBanner (`app/components/Rentals/Shared/RentalAccountingStatusBanner.tsx`)
- GL account mapping status
- Auto-detect suggestions

#### useRentalAccountMappings (`app/components/Rentals/Shared/useRentalAccountMappings.ts`)
- Hook for account mapping management

## Type Definitions

### Core Rental Types

```typescript
interface RentalCategory {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface RentalItem {
  id: number;
  name: string;
  sku: string | null;
  category_id: number | null;
  category?: RentalCategory;
  description: string | null;
  rental_price_per_day: number;
  replacement_value: number;
  quantity_available: number;
  quantity_rented: number;
  status: 'available' | 'partial' | 'rented' | 'maintenance';
  created_at: string;
  updated_at: string;
}

type RentalStatus = 'active' | 'completed' | 'overdue' | 'cancelled';
type RentalPaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'late';

interface RentalAgreement {
  id: number;
  agreement_number: string;
  customer_id: number;
  customer?: Customer;
  rental_item_id: number;
  rental_item?: RentalItem;
  quantity_rented: number;
  rental_start_date: string;
  rental_end_date: string;
  total_rent_amount: number;
  outstanding_balance: number;
  security_deposit_amount: number;
  security_deposit_collected: number;
  rental_status: RentalStatus;
  payment_status: RentalPaymentStatus;
  payment_schedule?: RentalPaymentScheduleItem[];
  created_at: string;
  updated_at: string;
}

interface RentalPaymentScheduleItem {
  id: number;
  agreement_id: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  payment_status: RentalPaymentStatus;
  paid_date: string | null;
}

interface RentalPayment {
  id: number;
  agreement_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RentalReturn {
  id: number;
  agreement_id: number;
  return_date: string;
  quantity_returned: number;
  condition: 'good' | 'fair' | 'damaged' | 'lost';
  damage_charges: number;
  late_charges: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

## API Endpoints

### Rental Categories API

```typescript
// List categories
GET /rental-categories?page=1&per_page=20
Response: Paginated<RentalCategory>

// Create category
POST /rental-categories
Body: { name: string, description?: string }
Response: RentalCategory

// Update category
PUT /rental-categories/{id}
Body: Partial<RentalCategory>
Response: RentalCategory

// Delete category
DELETE /rental-categories/{id}
```

### Rental Items API

```typescript
// List rental items
GET /rental-items?category_id=&status=&page=1&per_page=20
Response: Paginated<RentalItem>

// Get rental item
GET /rental-items/{id}
Response: RentalItem

// Create rental item
POST /rental-items
Body: {
  name: string,
  sku?: string,
  category_id?: number,
  rental_price_per_day: number,
  replacement_value: number,
  quantity_available: number,
  description?: string
}
Response: RentalItem

// Update rental item
PUT /rental-items/{id}
Body: Partial<RentalItem>
Response: RentalItem

// Delete rental item
DELETE /rental-items/{id}
```

### Rental Agreements API

```typescript
// List agreements
GET /rental-agreements?customer_id=&rental_item_id=&status=&page=1&per_page=20
Response: Paginated<RentalAgreement>

// Get agreement
GET /rental-agreements/{id}
Response: RentalAgreement

// Create agreement
POST /rental-agreements
Body: {
  customer_id: number,
  rental_item_id: number,
  quantity_rented: number,
  rental_start_date: string,
  rental_end_date: string,
  rental_price_per_day: number,
  security_deposit_amount?: number
}
Response: RentalAgreement

// Update agreement
PUT /rental-agreements/{id}
Body: Partial<RentalAgreement>
Response: RentalAgreement

// Record payment
POST /rental-agreements/{id}/payments
Body: {
  amount: number,
  payment_date: string,
  payment_method: string,
  reference_number?: string,
  notes?: string,
  schedule_item_id?: number  // Optional: specific schedule
}
Response: RentalPayment

// Process return
POST /rental-agreements/{id}/returns
Body: {
  return_date: string,
  quantity_returned: number,
  condition: 'good' | 'fair' | 'damaged' | 'lost',
  damage_charges?: number,
  late_charges?: number,
  notes?: string
}
Response: RentalReturn

// Write off bad debt
POST /rental-agreements/{id}/write-off
Body: {
  reason: string,
  write_off_date?: string
}
Response: RentalAgreement

// Cancel agreement
POST /rental-agreements/{id}/cancel
Body: { reason?: string }
Response: RentalAgreement
```

## Business Logic

### Rental Item Status

```typescript
const status =
  quantity_available === 0 ? 'rented' :
  quantity_available < quantity_total ? 'partial' :
  'available';

// Status can also be manually set to 'maintenance'
```

### Rental Period Calculation

```typescript
// Calculate total rent amount
const startDate = new Date(rental_start_date);
const endDate = new Date(rental_end_date);
const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

const totalRent = days * rental_price_per_day * quantity_rented;
```

### Payment Schedule Generation

```typescript
// Generate monthly payment schedule
const schedule: RentalPaymentScheduleItem[] = [];
let currentDate = new Date(startDate);

while (currentDate < endDate) {
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const periodEnd = monthEnd < endDate ? monthEnd : endDate;
  const days = Math.ceil((periodEnd - currentDate) / (1000 * 60 * 60 * 24));

  schedule.push({
    due_date: periodEnd.toISOString().split('T')[0],
    amount: days * rental_price_per_day * quantity_rented,
    paid_amount: 0,
    payment_status: 'unpaid'
  });

  currentDate = new Date(periodEnd);
  currentDate.setDate(currentDate.getDate() + 1);
}
```

### Rental Status Determination

```typescript
const now = new Date();
const endDate = new Date(rental_end_date);

const rentalStatus: RentalStatus =
  agreement.cancelled ? 'cancelled' :
  agreement.returned ? 'completed' :
  endDate < now && outstanding_balance > 0 ? 'overdue' :
  'active';
```

### Payment Status

```typescript
const paymentStatus: RentalPaymentStatus =
  outstanding_balance === 0 ? 'paid' :
  total_paid > 0 && hasOverduePayment() ? 'late' :
  total_paid > 0 ? 'partially_paid' :
  'unpaid';
```

### Return Processing

```typescript
// When processing return:
// 1. Update quantity_available
// 2. Assess condition and charges
// 3. Calculate late charges if applicable
// 4. Apply damage charges if condition is damaged
// 5. Refund security deposit (minus any charges)
// 6. Update agreement status
// 7. Create rental return record
```

### Bad Debt Write-off

```typescript
// Criteria for write-off:
// - Agreement is overdue for > 90 days
// - Customer not responding
// - Outstanding balance > 0

// Process:
// 1. Record write-off with reason
// 2. Create journal entry (Expense: Bad Debt)
// 3. Clear outstanding balance
// 4. Mark agreement as written off
```

## Component Usage Examples

### Creating Rental Agreement
```typescript
const handleCreateAgreement = async () => {
  const agreement = await rentalApi.createAgreement({
    customer_id: 456,
    rental_item_id: 123,
    quantity_rented: 2,
    rental_start_date: "2024-01-15",
    rental_end_date: "2024-02-15",
    rental_price_per_day: 50,
    security_deposit_amount: 1000
  });

  console.log("Agreement:", agreement.agreement_number);
  console.log("Payment Schedule:", agreement.payment_schedule);
};
```

### Recording Payment
```typescript
const handlePayment = async () => {
  await rentalApi.recordPayment(agreementId, {
    amount: 1000,
    payment_date: "2024-01-20",
    payment_method: "cash",
    reference_number: "RENT-001",
    schedule_item_id: 5  // Optional: specific payment
  });

  // Refresh agreement data
  refresh();
};
```

### Processing Return
```typescript
const handleReturn = async () => {
  const result = await rentalApi.processReturn(agreementId, {
    return_date: "2024-02-10",
    quantity_returned: 2,
    condition: "good",
    late_charges: 0,  // Returned early
    damage_charges: 0  // Good condition
  });

  // Security deposit refund calculated
  console.log("Late Charges:", result.late_charges);
  console.log("Deposit Refund:", depositAmount - result.damage_charges);
};
```

### Writing Off Bad Debt
```typescript
const handleWriteOff = async () => {
  await rentalApi.writeOffBadDebt(agreementId, {
    reason: "Customer unresponsive, agreement overdue 120 days"
  });

  // Agreement status updated
  // Outstanding balance cleared
  // Bad debt expense recorded
};
```

## Permissions

| Feature | Permission | Level |
|---------|-----------|-------|
| View Rental Items | module.rental | read |
| Create/Edit Items | module.rental | read-write |
| View Agreements | module.rental | read |
| Create Agreements | module.rental | read-write |
| Record Payments | module.rental | read-write |
| Process Returns | module.rental | read-write |
| Write Off Bad Debt | module.rental | read-write |
| Configure Accounts | module.rental | read-write |

## Related Documentation
- [Type System](./04-type-system.md) - RentalItem, RentalAgreement, RentalPayment types
- [API Client](./03-api-client.md) - rentalApi
- [Customer Module](./09-modules-customers.md) - Customer rental history
- [Accounting Module](./06-modules-accounting.md) - Rental revenue accounts
