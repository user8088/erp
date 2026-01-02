# Purchase Order Delivery Charge - Backend Requirements

## Overview

This document specifies the backend API requirements for implementing delivery charges in purchase orders. Delivery charges are additional fees that suppliers charge for delivering goods, and they should increase the amount owed to the supplier (unlike "other costs" which reduce the amount owed).

## Key Differences

- **Other Costs**: Reduce amount owed (expenses we pay separately, not to supplier)
- **Delivery Charges**: Increase amount owed (charges from supplier added to their bill)

## Database Schema Changes

### Update `purchase_orders` Table

Add the following column:

```sql
ALTER TABLE purchase_orders
ADD COLUMN delivery_charge DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Delivery charge from supplier (increases amount owed)';
```

**Migration Script:**

```php
// database/migrations/XXXX_XX_XX_XXXXXX_add_delivery_charge_to_purchase_orders.php

public function up()
{
    Schema::table('purchase_orders', function (Blueprint $table) {
        $table->decimal('delivery_charge', 15, 2)->default(0.00)->after('other_costs_total')
            ->comment('Delivery charge from supplier (increases amount owed)');
    });
}

public function down()
{
    Schema::table('purchase_orders', function (Blueprint $table) {
        $table->dropColumn('delivery_charge');
    });
}
```

## API Endpoint Updates

### Update `POST /api/purchase-orders/{id}/receive`

**Current Endpoint:** Receives stock with items, other costs, and supplier invoice file

**New Requirements:**

#### Request Body Updates

**JSON Format:**
```json
{
  "items": [
    {
      "id": 1,
      "quantity_received": 100.0000,
      "final_unit_price": 850.00
    }
  ],
  "other_costs": [
    {
      "description": "Pickup charges",
      "amount": 2000.00,
      "account_id": 45
    }
  ],
  "delivery_charge": 500.00,  // NEW: Optional, >= 0
  "supplier_invoice_file": null
}
```

**Multipart/Form-Data Format:**
- `items`: JSON string array
- `other_costs`: JSON string array (optional)
- `delivery_charge`: String (optional, numeric)
- `supplier_invoice_file`: File (optional)

#### Validation Rules

| Field | Rules | Description |
|-------|-------|-------------|
| `delivery_charge` | optional, numeric, min:0, default:0 | Delivery charge amount from supplier |

**Validation Logic:**
- If `delivery_charge` is not provided or is null, default to 0.00
- If `delivery_charge` is provided, must be >= 0
- If `delivery_charge` is provided as string in FormData, convert to decimal

#### Response Format

**Response (200 OK):**

```json
{
  "purchase_order": {
    "id": 1,
    "po_number": "PO-20251207-001",
    "status": "partial",
    "supplier_invoice_path": "storage/supplier-invoices/po-1-invoice.pdf",
    "other_costs_total": 2000.00,
    "delivery_charge": 500.00,
    "final_total": 131120.00,
    "supplier_invoice_id": 123,
    "items": [...],
    ...
  },
  "stock_movements": [...],
  "supplier_invoice": {
    "id": 123,
    "invoice_number": "SUP-INV-20251207-001",
    "invoice_type": "supplier",
    "total_amount": 131120.00,
    ...
  },
  "message": "Stock received successfully. Supplier invoice created."
}
```

## Business Logic Updates

### Calculation Changes

**Updated Calculation Formula:**

1. Calculate items subtotal:
   ```
   items_subtotal = sum(items.quantity_received × items.final_unit_price)
   ```

2. Calculate other costs total (reduces amount):
   ```
   other_costs_total = sum(other_costs.amount)
   ```

3. Get delivery charge (increases amount):
   ```
   delivery_charge = provided_delivery_charge or 0.00
   ```

4. Calculate final total:
   ```
   final_total = items_subtotal - other_costs_total + delivery_charge
   ```

**Example:**
```
Items Subtotal:     PKR 130,000.00
Other Costs:        PKR 2,000.00 (reduces)
Delivery Charge:    PKR 500.00 (increases)
─────────────────────────────────────
Final Amount Owed:  PKR 128,500.00
```

### Database Updates

When receiving stock:

1. **Save delivery charge:**
   - Update `purchase_orders.delivery_charge = provided_delivery_charge`
   - If not provided, set to 0.00

2. **Update final total:**
   - Recalculate `purchase_orders.final_total` using new formula:
     - `final_total = items_subtotal - other_costs_total + delivery_charge`

3. **Update other fields:**
   - `other_costs_total` (if other costs provided)
   - `supplier_invoice_path` (if file uploaded)
   - `supplier_invoice_id` (if invoice created)

### Supplier Invoice Creation

**When creating supplier invoice:**

1. **Include delivery charge in invoice total:**
   - Invoice `total_amount` should equal `final_total`
   - `final_total = items_subtotal - other_costs_total + delivery_charge`

2. **Invoice Metadata:**
   ```json
   {
     "supplier": {
       "id": 1,
       "name": "ABC Suppliers",
       ...
     },
     "purchase_order": {
       "id": 1,
       "po_number": "PO-20251207-001"
     },
     "items_subtotal": 130000.00,
     "other_costs_total": 2000.00,
     "delivery_charge": 500.00,
     "final_total": 128500.00,
     "items": [
       {
         "item_id": 1,
         "item_name": "Portland Cement",
         "quantity": 100,
         "unit_price": 850,
         "total": 85000
       }
     ],
     "other_costs": [
       {
         "description": "Pickup charges",
         "amount": 2000
       }
     ]
   }
   ```

3. **Invoice Line Items:**
   - Include all items received
   - Include other costs (if any) as separate line items
   - Include delivery charge as a separate line item (if > 0)
   - Show breakdown clearly:
     - Items Subtotal: PKR X
     - Other Costs: -PKR Y (reduces)
     - Delivery Charge: +PKR Z (increases)
     - Final Total: PKR (X - Y + Z)

## Accounting/Journal Entries

### Journal Entry Structure

**When stock is received with delivery charge:**

**Entry Details:**
- `entry_number`: Auto-generated (e.g., JE-YYYYMMDD-XXX)
- `entry_date`: Current date
- `reference_type`: 'purchase_order'
- `reference_id`: purchase_order.id
- `description`: "Stock received from {supplier_name} - PO {po_number}"

**Journal Entry Lines:**

1. **Debit Inventory Account:**
   - Account: Inventory Account (from stock account mappings)
   - Debit: `items_subtotal` (total value of items received)
   - Credit: 0

2. **Debit Expense Accounts (for each other cost):**
   - Account: Account specified in `other_costs.account_id` (or default expense account)
   - Debit: `other_cost.amount`
   - Credit: 0
   - Note: If no account specified, use a default "Other Expenses" account

3. **Credit Accounts Payable:**
   - Account: Accounts Payable (from stock account mappings)
   - Debit: 0
   - Credit: `final_total` (items_subtotal - other_costs_total + delivery_charge)

**Example Journal Entry:**

```
PO Details:
- Items Subtotal: PKR 130,000.00
- Other Costs: PKR 2,000.00 (Pickup)
- Delivery Charge: PKR 500.00
- Final Owed: PKR 128,500.00

Journal Entry:
DR Inventory: 130,000.00
DR Transportation Expense: 2,000.00
CR Accounts Payable: 128,500.00
```

**Key Points:**
- Inventory is debited at full item value (before other costs and delivery charge)
- Other costs are debited to appropriate expense accounts
- Accounts Payable is credited at final amount (after other costs deduction and delivery charge addition)
- Delivery charge increases Accounts Payable but doesn't affect inventory value or expense accounts

## Error Handling

### Validation Errors

Return 422 Unprocessable Entity with detailed errors:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "delivery_charge": ["Delivery charge must be greater than or equal to 0."]
  }
}
```

### Business Logic Errors

- **Invalid Delivery Charge:** "Delivery charge must be a valid number greater than or equal to 0"
- **Database Error:** "Failed to save delivery charge. Please try again."

## Backward Compatibility

### Existing Purchase Orders

- Existing purchase orders without `delivery_charge` should default to 0.00
- When calculating `final_total` for existing POs:
  - If `delivery_charge` is NULL, treat as 0.00
  - Formula: `final_total = items_subtotal - other_costs_total + COALESCE(delivery_charge, 0)`

### API Compatibility

- `delivery_charge` is optional in request payload
- If not provided, defaults to 0.00
- Existing API calls without `delivery_charge` should continue to work

## Testing Requirements

### Unit Tests

1. ✅ Receive stock with delivery charge = 0 (should work as before)
2. ✅ Receive stock with delivery charge > 0
3. ✅ Receive stock with delivery charge and other costs
4. ✅ Verify final_total calculation: items_subtotal - other_costs_total + delivery_charge
5. ✅ Verify delivery_charge is saved to database
6. ✅ Verify delivery_charge is included in supplier invoice
7. ✅ Verify journal entries include delivery charge in Accounts Payable

### Integration Tests

1. ✅ Full receiving flow with delivery charge
2. ✅ Delivery charge validation (negative values should fail)
3. ✅ Delivery charge with FormData (file upload)
4. ✅ Delivery charge with JSON (no file upload)
5. ✅ Multiple receipts with different delivery charges
6. ✅ Supplier invoice creation with delivery charge
7. ✅ Accounting entries with delivery charge

### Manual Tests

1. ✅ Add delivery charge when receiving stock
2. ✅ Verify delivery charge increases final_total correctly
3. ✅ Verify delivery charge is shown in supplier invoice
4. ✅ Verify accounting entries are correct
5. ✅ Test with delivery charge = 0 (backward compatibility)
6. ✅ Test with both delivery charge and other costs together
7. ✅ Verify UI shows clear distinction between costs that reduce vs increase amount owed

## Example Requests/Responses

### Example Request (With Delivery Charge)

**JSON:**
```json
POST /api/purchase-orders/1/receive
{
  "items": [
    {
      "id": 1,
      "quantity_received": 100,
      "final_unit_price": 850.00
    }
  ],
  "other_costs": [
    {
      "description": "Pickup charges",
      "amount": 2000.00,
      "account_id": 45
    }
  ],
  "delivery_charge": 500.00
}
```

**FormData (with file):**
```
items: [{"id":1,"quantity_received":100,"final_unit_price":850.00}]
other_costs: [{"description":"Pickup charges","amount":2000.00,"account_id":45}]
delivery_charge: 500.00
supplier_invoice_file: [File]
```

### Example Response

```json
{
  "purchase_order": {
    "id": 1,
    "po_number": "PO-20251207-001",
    "supplier_name": "ABC Suppliers",
    "status": "partial",
    "subtotal": "130000.00",
    "other_costs_total": "2000.00",
    "delivery_charge": "500.00",
    "final_total": "128500.00",
    "supplier_invoice_id": 123,
    ...
  },
  "supplier_invoice": {
    "id": 123,
    "invoice_number": "SUP-INV-20251207-001",
    "invoice_type": "supplier",
    "total_amount": "128500.00",
    ...
  },
  "message": "Stock received successfully. Supplier invoice created with delivery charge."
}
```

## Additional Notes

### Display in UI

When displaying purchase order details:
- Show delivery charge as a separate line item
- Clearly indicate it increases the amount owed (use + sign or green color)
- Distinguish from other costs (which reduce amount owed)

### Reporting

Update purchase order reports to:
- Include delivery charge in totals
- Show delivery charge breakdown
- Separate delivery charges from other costs in reports

### Permissions

- Same permissions as receiving stock (`stock.create`)
- No additional permissions required

---

## Summary

The delivery charge feature adds a new field `delivery_charge` to purchase orders that:
1. Increases the amount owed to the supplier
2. Is separate from "other costs" which reduce the amount owed
3. Is included in the supplier invoice
4. Increases Accounts Payable in journal entries
5. Maintains backward compatibility (defaults to 0.00 if not provided)

