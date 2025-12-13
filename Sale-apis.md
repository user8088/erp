# Sales API Documentation

This document provides comprehensive documentation for all sales-related APIs including sale creation, processing, delivery management, cancellation, and deletion.

## Table of Contents

1. [Sale Management APIs](#sale-management-apis)
2. [Sale Processing APIs](#sale-processing-apis)
3. [Delivery Management APIs](#delivery-management-apis)
4. [Sale Cancellation & Deletion APIs](#sale-cancellation--deletion-apis)
5. [Data Models](#data-models)

---

## Sale Management APIs

### List Sales

**Endpoint:** `GET /api/sales`

**Description:** Retrieve a paginated list of sales with optional filtering.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.selling,read` permission

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | integer | No | Filter by customer ID |
| `sale_type` | string | No | Filter by sale type: `walk-in`, `delivery` |
| `status` | string | No | Filter by status: `draft`, `completed`, `cancelled` |
| `payment_status` | string | No | Filter by payment status: `paid`, `unpaid`, `partial` |
| `start_date` | date | No | Filter sales from this date (YYYY-MM-DD) |
| `end_date` | date | No | Filter sales until this date (YYYY-MM-DD) |
| `search` | string | No | Search by sale number or customer name |
| `per_page` | integer | No | Number of items per page (default: 15) |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "sale_number": "SALE-20251213-000001",
      "sale_type": "delivery",
      "customer_id": 5,
      "customer": {
        "id": 5,
        "name": "Asim Mahmood",
        "serial_number": "CUST-20251208-001"
      },
      "vehicle_id": 1,
      "vehicle": {
        "id": 1,
        "name": "Truck-001",
        "registration_number": "ABC-123"
      },
      "subtotal": 750.00,
      "total_discount": 0.00,
      "total_delivery_charges": 200.00,
      "tax_amount": 0.00,
      "total_amount": 950.00,
      "payment_status": "unpaid",
      "amount_paid": 0.00,
      "amount_due": 950.00,
      "status": "draft",
      "delivery_address": "123 Main St, City",
      "expected_delivery_date": "2025-12-15",
      "created_at": "2025-12-13T10:00:00.000000Z",
      "items": [
        {
          "id": 1,
          "item_id": 10,
          "quantity": 1,
          "unit": "Bags",
          "unit_price": 750.00,
          "delivery_charge": 200.00,
          "subtotal": 750.00,
          "total": 950.00,
          "item": {
            "id": 10,
            "name": "Cement",
            "serial_number": "CONST-000001"
          }
        }
      ]
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 15,
    "total": 75
  }
}
```

---

### Get Sale by ID

**Endpoint:** `GET /api/sales/{id}`

**Description:** Retrieve detailed information about a specific sale including invoice if available.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.selling,read` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Sale ID |

**Response:**

```json
{
  "id": 1,
  "sale_number": "SALE-20251213-000001",
  "sale_type": "delivery",
  "customer_id": 5,
  "customer": {
    "id": 5,
    "name": "Asim Mahmood",
    "serial_number": "CUST-20251208-001"
  },
  "vehicle_id": 1,
  "vehicle": {
    "id": 1,
    "name": "Truck-001",
    "registration_number": "ABC-123"
  },
  "subtotal": 750.00,
  "total_discount": 0.00,
  "total_delivery_charges": 200.00,
  "tax_amount": 0.00,
  "total_amount": 950.00,
  "payment_status": "unpaid",
  "amount_paid": 0.00,
  "amount_due": 950.00,
  "status": "draft",
  "delivery_address": "123 Main St, City",
  "expected_delivery_date": "2025-12-15",
  "invoice": {
    "id": 123,
    "invoice_number": "INV-20251213-000001",
    "total_amount": 950.00,
    "status": "issued"
  },
  "items": [...],
  "created_at": "2025-12-13T10:00:00.000000Z"
}
```

---

### Create Sale (Draft)

**Endpoint:** `POST /api/sales`

**Description:** Create a new sale in draft status. The sale must be processed before it affects inventory and accounting.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.selling,read-write` permission

**Request Body:**

```json
{
  "sale_type": "delivery",
  "customer_id": 5,
  "vehicle_id": 1,
  "delivery_address": "123 Main St, City",
  "expected_delivery_date": "2025-12-15",
  "items": [
    {
      "item_id": 10,
      "quantity": 1,
      "unit_price": 750.00,
      "discount_percentage": 0,
      "delivery_charge": 200.00
    }
  ],
  "notes": "Urgent delivery required"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `sale_type` | string | Yes | Must be `walk-in` or `delivery` |
| `customer_id` | integer | Yes | Must exist in customers table |
| `vehicle_id` | integer | No | Required if `sale_type` is `delivery` |
| `delivery_address` | string | No | Required if `sale_type` is `delivery` |
| `expected_delivery_date` | date | No | Valid date format (YYYY-MM-DD) |
| `items` | array | Yes | At least one item required |
| `items.*.item_id` | integer | Yes | Must exist in items table |
| `items.*.quantity` | numeric | Yes | Must be > 0 |
| `items.*.unit_price` | numeric | No | Override item's default selling price |
| `items.*.discount_percentage` | numeric | No | 0-100 (default: 0) |
| `items.*.delivery_charge` | numeric | No | Required if `sale_type` is `delivery` |
| `notes` | string | No | Optional notes |

**Response:** `201 Created`

```json
{
  "id": 1,
  "sale_number": "SALE-20251213-000001",
  "sale_type": "delivery",
  "status": "draft",
  "total_amount": 950.00,
  ...
}
```

---

## Sale Processing APIs

### Process Sale

**Endpoint:** `POST /api/sales/{id}/process`

**Description:** Process a sale (create invoice, deduct stock, create journal entries). For walk-in sales, payment can be processed immediately.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.selling,read-write` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Sale ID |

**Request Body (for walk-in sales with payment):**

```json
{
  "use_advance": false,
  "amount_paid": 950.00,
  "payment_method": "cash",
  "payment_account_id": 10,
  "notes": "Payment received"
}
```

**Request Body (for delivery sales or unpaid walk-in):**

```json
{
  "use_advance": false
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `use_advance` | boolean | No | Use customer advance balance (default: false) |
| `amount_paid` | numeric | No | Required for walk-in sales with payment |
| `payment_method` | string | No | `cash`, `bank_transfer`, `cheque`, `card`, `other` |
| `payment_account_id` | integer | No | Required if `amount_paid` > 0 |
| `notes` | string | No | Optional payment notes |

**Response:**

```json
{
  "sale": {
    "id": 1,
    "sale_number": "SALE-20251213-000001",
    "status": "completed",
    "payment_status": "paid",
    ...
  },
  "invoice": {
    "id": 123,
    "invoice_number": "INV-20251213-000001",
    "total_amount": 950.00,
    "status": "paid"
  },
  "payment": {
    "id": 45,
    "payment_number": "PAY-20251213-000001",
    "amount": 950.00,
    "status": "completed"
  },
  "advance_transaction": null,
  "journal_entries": [
    {
      "id": 789,
      "reference_number": "SALE-20251213-000001",
      "voucher_type": "sale"
    }
  ],
  "stock_movements": [
    {
      "id": 456,
      "movement_type": "sale",
      "quantity": -1,
      "item_id": 10
    }
  ]
}
```

**Behavior:**

- **Draft Sales Only**: Sale must be in `draft` status
- **Stock Validation**: Validates stock availability before processing
- **Stock Deduction**: Automatically deducts stock quantities
- **Invoice Creation**: Creates invoice for the sale
- **Journal Entries**: Creates accounting journal entries:
  - **Debit**: Cash/Bank (walk-in paid) or Accounts Receivable (delivery/unpaid)
  - **Credit**: Sales Revenue (subtotal)
  - **Credit**: Delivery Revenue (if delivery charges > 0)
  - **Debit**: Discounts Given (if discount > 0)
- **Status Update**: 
  - Walk-in sales: Status changes to `completed`
  - Delivery sales: Status remains `draft` until marked as delivered

**Error Responses:**

`422 Unprocessable Entity` - Sale not in draft status
```json
{
  "message": "Sale can only be processed if it is in draft status."
}
```

`422 Unprocessable Entity` - Insufficient stock
```json
{
  "message": "Insufficient stock available for item: Cement"
}
```

---

## Delivery Management APIs

### Mark Sale as Delivered

**Endpoint:** `POST /api/sales/{id}/mark-delivered`

**Description:** Mark a delivery sale as delivered. This changes the sale status to `completed`. If the sale hasn't been processed yet, it will be processed automatically.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.selling,read-write` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Sale ID |

**Response:**

```json
{
  "sale": {
    "id": 1,
    "sale_number": "SALE-20251213-000001",
    "status": "completed",
    ...
  },
  "invoice": {
    "id": 123,
    "invoice_number": "INV-20251213-000001",
    "status": "issued"
  },
  "message": "Sale order marked as delivered and invoice created successfully."
}
```

**Behavior:**

- **Delivery Sales Only**: Only works for `sale_type = 'delivery'`
- **Auto-Processing**: If sale hasn't been processed, it will be processed automatically
- **Status Update**: Changes sale status from `draft` to `completed`

**Error Responses:**

`422 Unprocessable Entity` - Not a delivery sale
```json
{
  "message": "Only delivery sales can be marked as delivered."
}
```

`422 Unprocessable Entity` - Already delivered
```json
{
  "message": "Sale is already marked as delivered."
}
```

---

## Sale Cancellation & Deletion APIs

### Cancel Sale

**Endpoint:** `POST /api/sales/{id}/cancel`

**Description:** Cancel a sale. This reverses stock movements, reverses journal entries, and cancels the invoice. The sale status is changed to `cancelled`.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.selling,read-write` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Sale ID |

**Response:**

```json
{
  "id": 1,
  "sale_number": "SALE-20251213-000001",
  "status": "cancelled",
  ...
}
```

**Behavior:**

- **Stock Restoration**: Restores stock quantities that were deducted
- **Journal Entry Reversal**: Creates reversing journal entries to undo accounting entries
- **Invoice Cancellation**: Marks associated invoice as `cancelled`
- **Status Update**: Changes sale status to `cancelled`

**Error Responses:**

`422 Unprocessable Entity` - Already cancelled
```json
{
  "message": "Sale is already cancelled."
}
```

---

### Delete Sale

**Endpoint:** `DELETE /api/sales/{id}`

**Description:** Delete a sale (soft delete). The sale is permanently removed from active records but remains in the database for audit purposes.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.selling,read-write` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Sale ID |

**Response:**

```json
{
  "message": "Sale deleted successfully."
}
```

**Deletion Rules:**

1. **Draft Sales (Not Processed)**: Can be deleted immediately
   - No invoice exists
   - No journal entries exist
   - No stock movements exist

2. **Processed Sales**: Must be cancelled first before deletion
   - Sale must have `status = 'cancelled'`
   - Ensures proper cleanup of stock and accounting entries

3. **Sales with Payments**: Cannot be deleted
   - Prevents data loss and maintains audit trail
   - Payments must be reversed first

**Error Responses:**

`422 Unprocessable Entity` - Processed sale not cancelled
```json
{
  "message": "Failed to delete sale.",
  "errors": {
    "sale": ["Cannot delete a processed sale. Please cancel it first."]
  }
}
```

`422 Unprocessable Entity` - Sale has payments
```json
{
  "message": "Failed to delete sale.",
  "errors": {
    "sale": ["Cannot delete a sale that has payments. Payments must be reversed first."]
  }
}
```

`422 Unprocessable Entity` - Sale has stock movements
```json
{
  "message": "Failed to delete sale.",
  "errors": {
    "sale": ["Cannot delete a sale that has stock movements. Please cancel it first."]
  }
}
```

---

## Data Models

### Sale Model

```json
{
  "id": 1,
  "sale_number": "SALE-20251213-000001",
  "sale_type": "delivery",
  "customer_id": 5,
  "created_by": 2,
  "subtotal": 750.00,
  "total_discount": 0.00,
  "total_delivery_charges": 200.00,
  "tax_amount": 0.00,
  "total_amount": 950.00,
  "payment_status": "unpaid",
  "amount_paid": 0.00,
  "amount_due": 950.00,
  "advance_used": 0.00,
  "vehicle_id": 1,
  "delivery_address": "123 Main St, City",
  "expected_delivery_date": "2025-12-15",
  "status": "draft",
  "notes": "Urgent delivery",
  "created_at": "2025-12-13T10:00:00.000000Z",
  "updated_at": "2025-12-13T10:00:00.000000Z"
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique sale identifier |
| `sale_number` | string | Unique sale number (format: SALE-YYYYMMDD-XXXXXX) |
| `sale_type` | string | Sale type: `walk-in` or `delivery` |
| `customer_id` | integer | Foreign key to customers table |
| `created_by` | integer | Foreign key to users table (user who created the sale) |
| `subtotal` | decimal | Subtotal before discounts and delivery charges |
| `total_discount` | decimal | Total discount amount |
| `total_delivery_charges` | decimal | Total delivery charges (for delivery sales) |
| `tax_amount` | decimal | Tax amount |
| `total_amount` | decimal | Total amount (subtotal + delivery charges + tax - discount) |
| `payment_status` | string | Payment status: `paid`, `unpaid`, `partial` |
| `amount_paid` | decimal | Amount paid so far |
| `amount_due` | decimal | Amount still due |
| `advance_used` | decimal | Amount from customer advance used |
| `vehicle_id` | integer | Foreign key to vehicles table (for delivery sales) |
| `delivery_address` | string | Delivery address |
| `expected_delivery_date` | date | Expected delivery date |
| `status` | string | Sale status: `draft`, `completed`, `cancelled` |
| `notes` | string | Optional notes |
| `created_at` | datetime | Creation timestamp |
| `updated_at` | datetime | Last update timestamp |

---

### Sale Item Model

```json
{
  "id": 1,
  "sale_id": 1,
  "item_id": 10,
  "item_stock_id": 5,
  "quantity": 1,
  "unit": "Bags",
  "unit_price": 750.00,
  "original_price": 750.00,
  "discount_percentage": 0,
  "discount_amount": 0.00,
  "delivery_charge": 200.00,
  "subtotal": 750.00,
  "total": 950.00,
  "created_at": "2025-12-13T10:00:00.000000Z"
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique sale item identifier |
| `sale_id` | integer | Foreign key to sales table |
| `item_id` | integer | Foreign key to items table |
| `item_stock_id` | integer | Foreign key to item_stock table |
| `quantity` | decimal | Quantity sold |
| `unit` | string | Unit of measurement (e.g., "Bags", "Pieces") |
| `unit_price` | decimal | Selling price per unit (can be adjusted) |
| `original_price` | decimal | Original selling price from item |
| `discount_percentage` | decimal | Discount percentage (0-100) |
| `discount_amount` | decimal | Calculated discount amount |
| `delivery_charge` | decimal | Delivery charge for this item (for delivery sales) |
| `subtotal` | decimal | Subtotal after discount: (unit_price * quantity) - discount_amount |
| `total` | decimal | Total: subtotal + delivery_charge |
| `created_at` | datetime | Creation timestamp |

---

## Sale Status Flow

```
Draft → Processed → Completed
  ↓         ↓
Cancelled  Cancelled
```

**Status Descriptions:**

- **Draft**: Sale created but not processed. No stock deducted, no invoice, no journal entries.
- **Completed**: Sale processed and completed. For walk-in sales, this happens immediately after processing. For delivery sales, this happens when marked as delivered.
- **Cancelled**: Sale was cancelled. Stock restored, journal entries reversed, invoice cancelled.

---

## Journal Entry Structure

When a sale is processed, the following journal entries are created:

### Walk-in Sale (Paid)

```
DR Cash/Bank Account          [total_amount - advance_used]
DR Customer Advance (if used)  [advance_used]
CR Sales Revenue               [subtotal]
CR Delivery Revenue            [total_delivery_charges]
DR Discounts Given             [total_discount]
```

### Delivery Sale (Unpaid)

```
DR Accounts Receivable         [total_amount - advance_used]
DR Customer Advance (if used)  [advance_used]
CR Sales Revenue               [subtotal]
CR Delivery Revenue            [total_delivery_charges]
DR Discounts Given             [total_discount]
```

**Note:** All debits must equal all credits for the journal entry to be valid.

---

## Error Responses

### 404 Not Found

```json
{
  "message": "No query results for model [App\\Models\\Sale]"
}
```

### 422 Unprocessable Entity

```json
{
  "message": "Failed to process sale.",
  "errors": {
    "sale": ["Sale can only be processed if it is in draft status."]
  }
}
```

### 401 Unauthorized

```json
{
  "message": "Unauthenticated."
}
```

### 403 Forbidden

```json
{
  "message": "This action is unauthorized."
}
```

---

## Notes

1. **Draft Sales**: Draft sales don't affect inventory or accounting until processed.

2. **Delivery Charges**: Delivery charges are automatically included in `total_amount` calculation. The journal entry properly credits a separate Delivery Revenue account.

3. **Stock Validation**: Before processing, the system validates that sufficient stock is available for all items.

4. **Soft Deletes**: Deleted sales are soft-deleted (marked as deleted but remain in database) for audit purposes.

5. **Cancellation**: Cancelling a sale properly reverses all accounting entries and restores stock, maintaining data integrity.

6. **Permissions**: All endpoints require appropriate module permissions. Ensure users have `module:module.selling,read` for viewing and `module:module.selling,read-write` for creating/updating/deleting.

