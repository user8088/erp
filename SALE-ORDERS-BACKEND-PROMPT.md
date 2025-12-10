# Sale Orders - Mark as Delivered Backend Implementation

## Overview

This document describes the backend implementation for marking sale orders as delivered. When a delivery sale is marked as delivered, the system should automatically create an invoice for the customer.

---

## Endpoint

### Mark Sale as Delivered

**Endpoint:** `POST /api/sales/{id}/mark-delivered`

**Permissions Required:** `module.selling,read-write`

**Description:** Marks a delivery sale as delivered. This will:
- Update the sale status to 'completed'
- Create an invoice for the customer
- Update stock (if not already done during sale processing)
- Create COA journal entries (if not already done)

**Request Body:** None (all data comes from the sale record)

**Response (200 OK):**
```json
{
    "sale": {
        "id": 1,
        "sale_number": "SALE-20251210-000001",
        "sale_type": "delivery",
        "status": "completed",
        "customer_id": 1,
        "total_amount": 1000.00,
        ...
    },
    "invoice": {
        "id": 1,
        "invoice_number": "INV-SALE-20251210-000001",
        "invoice_type": "sale",
        "customer_id": 1,
        "total_amount": 1000.00,
        "status": "issued",
        "metadata": {
            "customer": {
                "id": 1,
                "name": "John Doe",
                ...
            },
            "sale_type": "delivery",
            "sale_id": 1,
            "sale_number": "SALE-20251210-000001",
            "vehicle": {
                "id": 1,
                "name": "Truck-001",
                "registration_number": "ABC-123"
            }
        }
    },
    "message": "Sale order marked as delivered and invoice created successfully."
}
```

---

## Business Logic

### Pre-conditions

1. **Sale must exist** - Return 404 if sale not found
2. **Sale must be delivery type** - Return 400 if `sale_type !== 'delivery'`
3. **Sale must be in draft status** - Return 400 if `status !== 'draft'`
4. **Sale must have been processed** - The sale should have been processed (stock deducted, COA entries created) before marking as delivered

### Process Flow

1. **Validate Sale:**
   - Check sale exists
   - Check sale is delivery type
   - Check sale is in draft status
   - Check sale has been processed (has invoice or status indicates processing)

2. **Update Sale Status:**
   - Set `status` = 'completed'
   - Update `updated_at` timestamp

3. **Create Invoice (if not already created):**
   - If sale doesn't have an invoice yet, create one:
     - `invoice_type` = 'sale'
     - `invoice_number` = Auto-generated (format: `INV-SALE-YYYYMMDD-XXXXXX`)
     - `customer_id` = From sale
     - `total_amount` = From sale.total_amount
     - `status` = 'issued' (unpaid by default)
     - `metadata` = Include customer info, sale_type, sale_id, sale_number, vehicle info
     - `reference_type` = 'sale'
     - `reference_id` = sale.id

4. **Update Stock (if needed):**
   - If stock wasn't deducted during sale processing, deduct it now
   - Create stock movements for each item

5. **Create COA Journal Entries (if needed):**
   - If journal entries weren't created during sale processing, create them:
     - DR Accounts Receivable (Customer)
     - CR Sales Revenue
     - (If delivery charges: CR Delivery Revenue)
     - (If discount: DR Discounts Given, CR Sales Revenue)

6. **Return Response:**
   - Updated sale object
   - Created/updated invoice object
   - Success message

---

## Error Handling

### Validation Errors (400 Bad Request)

```json
{
    "message": "Sale can only be marked as delivered if it is a delivery sale in draft status."
}
```

```json
{
    "message": "Sale must be processed before marking as delivered."
}
```

### Not Found (404)

```json
{
    "message": "Sale not found."
}
```

### Business Logic Errors

- **Sale already delivered:** Return 400 with message "Sale is already marked as delivered"
- **Sale is cancelled:** Return 400 with message "Cannot mark cancelled sale as delivered"
- **Sale is walk-in type:** Return 400 with message "Only delivery sales can be marked as delivered"

---

## Database Updates

### Sales Table
- Update `status` from 'draft' to 'completed'
- Update `updated_at` timestamp

### Invoices Table
- Create new invoice record (if not exists)
- Link to sale via `reference_type` = 'sale', `reference_id` = sale.id

### Stock Movements (if needed)
- Create stock movement records for each item
- `movement_type` = 'sale'
- `quantity` = negative (outbound)
- `reference_type` = 'sale'
- `reference_id` = sale.id

### Journal Entries (if needed)
- Create journal entry records
- `voucher_type` = 'sale'
- `reference_number` = sale.sale_number

---

## Transaction Management

**Critical:** All operations must be wrapped in a database transaction:

```php
DB::transaction(function () use ($sale) {
    // Update sale status
    // Create invoice
    // Update stock (if needed)
    // Create COA entries (if needed)
    
    // If any step fails, entire transaction rolls back
});
```

---

## Integration Notes

### When Sale is Processed

When a delivery sale is initially processed (via `POST /api/sales/{id}/process`):
- Stock is deducted
- COA journal entries are created
- Invoice is created (status: 'issued', unpaid)
- Sale status remains 'draft'

### When Sale is Marked as Delivered

When marking as delivered (via `POST /api/sales/{id}/mark-delivered`):
- Sale status changes to 'completed'
- Invoice status remains 'issued' (unpaid)
- No additional stock deduction (already done)
- No additional COA entries (already done)

### Invoice Status Flow

1. **Sale Processed:** Invoice created with status 'issued' (unpaid)
2. **Sale Marked as Delivered:** Invoice status remains 'issued' (unpaid)
3. **Customer Pays:** Invoice status changes to 'paid' (via payment API)

---

## Testing Checklist

- [ ] Mark delivery sale as delivered (draft → completed)
- [ ] Verify invoice is created/updated
- [ ] Verify sale status is updated
- [ ] Try to mark already delivered sale (should fail)
- [ ] Try to mark cancelled sale (should fail)
- [ ] Try to mark walk-in sale (should fail)
- [ ] Verify transaction rollback on error
- [ ] Verify invoice metadata includes all sale information
- [ ] Verify invoice is linked to sale via reference

---

## Frontend Integration

The frontend expects:

1. **Response Structure:**
   ```typescript
   {
     sale: Sale;
     invoice: Invoice;
     message: string;
   }
   ```

2. **Success Handling:**
   - Show success toast with invoice number
   - Refresh the sales orders list
   - Update sale status badge to "Delivered"

3. **Error Handling:**
   - Display validation errors
   - Handle 404 (sale not found)
   - Handle 400 (business logic errors)

---

## Notes

1. **Idempotency:** If sale is already marked as delivered, return success with existing invoice
2. **Invoice Creation:** Invoice should be created during sale processing, but this endpoint ensures it exists
3. **Stock Management:** Stock should already be deducted during sale processing
4. **COA Integration:** Journal entries should already be created during sale processing
5. **Status Updates:** Only update sale status, invoice status remains 'issued' until payment

---

## Conclusion

This endpoint provides a simple way to mark delivery sales as delivered, ensuring invoices are created and the sale status is properly updated. The actual stock and COA operations should have been completed during the initial sale processing.

