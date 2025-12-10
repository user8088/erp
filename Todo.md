# Frontend Integration Guide - POS System

## Quick Reference

### Base URLs
- **Sales API:** `/api/sales`
- **Customer Payments API:** `/api/customer-payments`
- **Account Mappings API:** `/api/account-mappings`
- **Payment Summary API:** `/api/customers/{id}/payment-summary`

### Authentication
All endpoints require:
- Bearer token in `Authorization` header
- Appropriate module permissions

---

## Sale Workflows

### Walk-In Sale (Immediate Payment)

```typescript
// 1. Create sale
const sale = await POST('/api/sales', {
  sale_type: 'walk-in',
  customer_id: 1,
  items: [
    {
      item_id: 1,
      quantity: 5,
      unit_price: 150.00,
      discount_percentage: 10,
    },
  ],
});

// 2. Process with payment
const result = await POST(`/api/sales/${sale.id}/process`, {
  payment_method: 'cash',
  payment_account_id: 5,
  amount_paid: 675.00,
});

// Sale status: 'completed'
// Payment status: 'paid'
```

### Delivery Sale (Unpaid)

```typescript
// 1. Create sale
const sale = await POST('/api/sales', {
  sale_type: 'delivery',
  customer_id: 1,
  vehicle_id: 1,
  delivery_address: '123 Main St',
  expected_delivery_date: '2025-12-15',
  items: [
    {
      item_id: 1,
      quantity: 5,
      unit_price: 150.00,
      delivery_charge: 50.00,
    },
  ],
});

// 2. Process sale (creates invoice, deducts stock)
const processResult = await POST(`/api/sales/${sale.id}/process`, {});

// Sale status: 'draft' (remains draft until delivered)
// Payment status: 'unpaid'

// 3. Mark as delivered (when delivery is completed)
const deliveredResult = await POST(`/api/sales/${sale.id}/mark-delivered`, {});

// Sale status: 'completed'
// Payment status: 'unpaid' (customer pays later)

// 4. Customer pays later
await POST('/api/customer-payments', {
  customer_id: 1,
  payment_type: 'invoice_payment',
  invoice_id: deliveredResult.invoice.id,
  amount: 800.00,
  payment_method: 'cash',
  payment_account_id: 5,
});
```

---

## Sale Status Flow

### Walk-In Sales
```
draft → [process] → completed
```

### Delivery Sales
```
draft → [process] → draft → [mark-delivered] → completed
```

**Important:** Delivery sales remain in `draft` status after processing until marked as delivered.

---

## Key Endpoints

### 1. Mark Sale as Delivered

**Endpoint:** `POST /api/sales/{id}/mark-delivered`

**When to use:**
- Only for delivery sales
- When the delivery has been completed
- Sale must be in `draft` status

**Request:**
```typescript
// No request body needed
const response = await POST(`/api/sales/${saleId}/mark-delivered`);
```

**Response:**
```typescript
{
  sale: {
    id: 1,
    sale_number: "SALE-20251210-000001",
    status: "completed", // Changed from 'draft'
    sale_type: "delivery",
    ...
  },
  invoice: {
    id: 1,
    invoice_number: "SAL-20251210-000001",
    status: "issued", // Still unpaid
    ...
  },
  message: "Sale order marked as delivered and invoice created successfully."
}
```

**Error Handling:**
```typescript
// 400 - Not a delivery sale
{
  errors: {
    sale: ["Only delivery sales can be marked as delivered."]
  }
}

// 400 - Already delivered
{
  sale: { ... },
  invoice: { ... },
  message: "Sale is already marked as delivered."
}

// 400 - Cancelled sale
{
  errors: {
    sale: ["Cannot mark cancelled sale as delivered."]
  }
}
```

---

## UI Components Recommendations

### Delivery Sales List

```typescript
// Show status badge
{sale.status === 'draft' && sale.sale_type === 'delivery' && (
  <Badge color="warning">Pending Delivery</Badge>
)}
{sale.status === 'completed' && sale.sale_type === 'delivery' && (
  <Badge color="success">Delivered</Badge>
)}

// Show "Mark as Delivered" button
{sale.status === 'draft' && sale.sale_type === 'delivery' && (
  <Button onClick={() => markAsDelivered(sale.id)}>
    Mark as Delivered
  </Button>
)}
```

### Sale Details Page

```typescript
// Delivery sale actions
{sale.sale_type === 'delivery' && sale.status === 'draft' && (
  <div>
    <Button onClick={handleMarkDelivered}>
      Mark as Delivered
    </Button>
    <Button onClick={handleProcessSale}>
      Process Sale
    </Button>
  </div>
)}
```

---

## TypeScript Interfaces

```typescript
interface Sale {
  id: number;
  sale_number: string;
  sale_type: 'walk-in' | 'delivery';
  status: 'draft' | 'completed' | 'cancelled';
  payment_status: 'paid' | 'unpaid' | 'partial';
  customer_id: number;
  customer?: Customer;
  vehicle_id?: number;
  vehicle?: Vehicle;
  delivery_address?: string;
  expected_delivery_date?: string;
  subtotal: number;
  total_discount: number;
  total_delivery_charges: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  advance_used: number;
  items: SaleItem[];
  invoice?: Invoice;
  created_at: string;
  updated_at: string;
}

interface MarkDeliveredResponse {
  sale: Sale;
  invoice: Invoice;
  message: string;
}
```

---

## Error Handling Best Practices

```typescript
async function markSaleAsDelivered(saleId: number) {
  try {
    const response = await fetch(`/api/sales/${saleId}/mark-delivered`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle validation errors
      if (error.errors) {
        const errorMessages = Object.values(error.errors).flat();
        showToast('error', errorMessages.join(', '));
        return;
      }
      
      // Handle business logic errors
      if (error.message) {
        showToast('error', error.message);
        return;
      }
      
      throw new Error('Failed to mark sale as delivered');
    }

    const result: MarkDeliveredResponse = await response.json();
    
    // Success handling
    showToast('success', result.message);
    refreshSalesList();
    return result;
    
  } catch (error) {
    console.error('Error marking sale as delivered:', error);
    showToast('error', 'An unexpected error occurred');
  }
}
```

---

## Testing Checklist

- [ ] Create delivery sale
- [ ] Process delivery sale (status should remain 'draft')
- [ ] Mark delivery sale as delivered (status should change to 'completed')
- [ ] Try to mark walk-in sale as delivered (should fail)
- [ ] Try to mark already delivered sale (should return success with existing data)
- [ ] Try to mark cancelled sale (should fail)
- [ ] Verify invoice is created/returned
- [ ] Verify sale status updates correctly
- [ ] Handle all error cases gracefully

---

## Additional Resources

- **Full API Documentation:** See `POS_SYSTEM_API_DOCUMENTATION.md`
- **Backend Implementation:** See `TODO.mdc` for business logic details

