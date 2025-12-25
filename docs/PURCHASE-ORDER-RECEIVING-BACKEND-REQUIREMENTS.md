# Purchase Order Receiving Backend Requirements

## Overview

This document outlines the backend changes required to support the enhanced purchase order receiving workflow with:
- Checklist-based item confirmation
- Final quote settlement (quantity and price adjustments)
- Supplier invoice document upload
- Other costs tracking (reduces amount owed)
- Automatic supplier invoice creation

## Database Schema Changes

### 1. Update `purchase_orders` Table

Add the following columns:

```sql
ALTER TABLE purchase_orders
ADD COLUMN supplier_invoice_path VARCHAR(255) NULL COMMENT 'Path to uploaded supplier invoice file',
ADD COLUMN other_costs_total DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Sum of all other costs',
ADD COLUMN final_total DECIMAL(15, 2) NULL COMMENT 'Final amount after adjustments (items - other costs)',
ADD COLUMN supplier_invoice_id INT NULL COMMENT 'ID of created supplier invoice',
ADD INDEX idx_supplier_invoice_id (supplier_invoice_id),
ADD FOREIGN KEY (supplier_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
```

### 2. Update `purchase_order_items` Table

Add the following columns:

```sql
ALTER TABLE purchase_order_items
ADD COLUMN final_unit_price DECIMAL(15, 2) NULL COMMENT 'Final settled price (may differ from initial quote)',
ADD COLUMN quantity_received_final DECIMAL(15, 4) NULL COMMENT 'Final quantity received (may be less than ordered)';
```

### 3. Create `purchase_order_other_costs` Table

```sql
CREATE TABLE purchase_order_other_costs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id BIGINT UNSIGNED NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    account_id BIGINT UNSIGNED NULL COMMENT 'Expense account for this cost',
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_purchase_order_id (purchase_order_id),
    INDEX idx_account_id (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## API Endpoint Changes

### Update `POST /api/purchase-orders/{id}/receive`

**Current Endpoint:** Receives stock with basic quantity tracking

**New Requirements:**

1. **Request Format:**
   - Accepts both JSON and multipart/form-data
   - If `supplier_invoice_file` is present, request must be multipart/form-data
   - If no file, can use JSON

2. **Request Body (JSON):**
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
  ]
}
```

3. **Request Body (Multipart/Form-Data):**
   - `items`: JSON string array
   - `other_costs`: JSON string array (optional)
   - `supplier_invoice_file`: File (PDF, JPG, PNG)

4. **Validation Rules:**
   - `items` is required, must have at least one item
   - `items.*.id` must exist in `purchase_order_items` table
   - `items.*.quantity_received` must be > 0 and <= remaining quantity
   - `items.*.final_unit_price` must be >= 0
   - `other_costs.*.description` is required, max 255 characters
   - `other_costs.*.amount` must be > 0
   - `other_costs.*.account_id` is optional, must exist in accounts table if provided
   - `supplier_invoice_file` is optional, max 10MB, allowed types: PDF, JPG, PNG

5. **Response Format:**
```json
{
  "purchase_order": {
    "id": 1,
    "po_number": "PO-20251207-001",
    "status": "partial",
    "supplier_invoice_path": "storage/supplier-invoices/po-1-invoice.pdf",
    "other_costs_total": 2000.00,
    "final_total": 128620.00,
    "supplier_invoice_id": 123,
    "items": [...],
    ...
  },
  "stock_movements": [...],
  "supplier_invoice": {
    "id": 123,
    "invoice_number": "SUP-INV-20251207-001",
    "invoice_type": "supplier",
    "total_amount": 128620.00,
    ...
  },
  "message": "Stock received successfully. Supplier invoice created."
}
```

## Business Logic

### 1. Stock Receiving Process

For each item being received:

1. **Validate:**
   - Item exists in purchase order
   - Quantity doesn't exceed remaining (ordered - already received)
   - Final price is valid

2. **Update Purchase Order Item:**
   - `quantity_received += new_quantity_received`
   - `quantity_received_final = new_quantity_received` (for this receipt)
   - `final_unit_price = provided_final_unit_price`

3. **Update Item Stock:**
   - `quantity_on_hand += new_quantity_received`
   - `stock_value = quantity_on_hand × item.selling_price`
   - `last_restocked_at = now()`

4. **Update Item Purchase Prices:**
   - `last_purchase_price = final_unit_price`
   - Update `lowest_purchase_price` if lower
   - Update `highest_purchase_price` if higher

5. **Create Stock Movement:**
   - `movement_type = 'purchase'`
   - `quantity = +new_quantity_received`
   - `reference_type = 'purchase_order'`
   - `reference_id = po.id`
   - `notes = "Received from {supplier_name} - PO {po_number}"`

### 2. Other Costs Processing

1. **Save Other Costs:**
   - Create records in `purchase_order_other_costs` table
   - Link to purchase order
   - Store description, amount, and account_id

2. **Calculate Totals:**
   - `items_subtotal = sum(items.quantity_received × items.final_unit_price)`
   - `other_costs_total = sum(other_costs.amount)`
   - `final_total = items_subtotal - other_costs_total`

3. **Update Purchase Order:**
   - `other_costs_total = calculated_total`
   - `final_total = calculated_final_total`

### 3. Supplier Invoice File Handling

1. **File Upload:**
   - Validate file type (PDF, JPG, PNG)
   - Validate file size (max 10MB)
   - Generate unique filename: `po-{po_id}-invoice-{timestamp}.{ext}`
   - Store in: `storage/supplier-invoices/`
   - Save path to `purchase_orders.supplier_invoice_path`

2. **File Storage:**
   - Use Laravel Storage facade
   - Ensure directory exists and is writable
   - Set appropriate permissions

### 4. Automatic Supplier Invoice Creation

After receiving stock, automatically create a supplier invoice:

1. **Invoice Details:**
   - `invoice_type = 'supplier'`
   - `reference_type = 'purchase_order'`
   - `reference_id = purchase_order.id`
   - `amount = items_subtotal` (before other costs)
   - `tax_amount = calculate_tax(items_subtotal, po.tax_percentage)`
   - `total_amount = final_total` (after other costs deduction)
   - `invoice_date = now()`
   - `status = 'issued'`
   - `pdf_path = supplier_invoice_path` (if file uploaded)

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

3. **Link Invoice to PO:**
   - `purchase_orders.supplier_invoice_id = created_invoice.id`

4. **Update Supplier Balance:**
   - Add `final_total` to supplier's `total_purchase_amount`
   - This increases outstanding balance (will be paid later)

## Accounting/Journal Entries

### Journal Entry Structure

When stock is received, create a journal entry with the following structure:

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
   - Credit: `final_total` (items_subtotal - other_costs_total)

**Example Journal Entry:**

```
PO Total: 10,000
Other Costs: 2,000 (Pickup)
Final Owed: 8,000

Journal Entry:
DR Inventory: 10,000
DR Transportation Expense: 2,000
CR Accounts Payable: 8,000
```

**Key Points:**
- Inventory is debited at full item value (before other costs)
- Other costs are debited to appropriate expense accounts
- Accounts Payable is credited at reduced amount (after other costs)
- This correctly reflects that we owe less to supplier, but have additional expenses

### Default Expense Account

If `other_costs.account_id` is null:
- Use a default expense account (e.g., "Other Operating Expenses")
- Or create a system account mapping for "purchase_order_other_costs"
- Document this in account mappings configuration

## Purchase Order Status Updates

After receiving:

1. **Check All Items:**
   - If ALL items fully received: `status = 'received'`, `received_date = now()`
   - Else if ANY item partially received: `status = 'partial'`
   - Else: remains `'sent'`

2. **Update Totals:**
   - Recalculate `subtotal` based on final prices
   - Recalculate `tax_amount` based on new subtotal
   - Update `total` (but this is now informational, `final_total` is the actual amount owed)

## File Storage Configuration

### Storage Path Structure

```
storage/
  app/
    public/
      supplier-invoices/
        po-1-invoice-20251207120000.pdf
        po-2-invoice-20251207130000.jpg
```

### Laravel Storage Configuration

Ensure in `config/filesystems.php`:

```php
'supplier_invoices' => [
    'driver' => 'local',
    'root' => storage_path('app/public/supplier-invoices'),
    'url' => env('APP_URL').'/storage/supplier-invoices',
    'visibility' => 'public',
],
```

### File Access

- Files should be accessible via public URL: `/storage/supplier-invoices/{filename}`
- Ensure symbolic link is created: `php artisan storage:link`

## Error Handling

### Validation Errors

Return 422 Unprocessable Entity with detailed errors:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "items.0.quantity_received": ["Quantity cannot exceed remaining quantity of 50."],
    "items.1.final_unit_price": ["Final unit price must be greater than or equal to 0."],
    "other_costs.0.amount": ["Amount must be greater than 0."],
    "supplier_invoice_file": ["File size exceeds 10MB limit."]
  }
}
```

### Business Logic Errors

- **Insufficient Quantity:** "Cannot receive more than ordered. Item: {name}, Remaining: {qty}"
- **Invalid PO Status:** "Purchase order must be in 'sent' or 'partial' status to receive stock"
- **File Upload Error:** "Failed to upload supplier invoice file: {error_message}"

## Testing Checklist

1. ✅ Receive stock with quantity adjustments
2. ✅ Receive stock with price adjustments
3. ✅ Receive stock with other costs
4. ✅ Receive stock with supplier invoice file
5. ✅ Receive stock with all features combined
6. ✅ Verify journal entries are correct
7. ✅ Verify supplier invoice is created
8. ✅ Verify supplier balance is updated
9. ✅ Verify stock quantities are updated
10. ✅ Verify purchase price history is updated
11. ✅ Test partial receipts
12. ✅ Test file upload validation
13. ✅ Test error handling

## Migration Script

```php
// database/migrations/XXXX_XX_XX_XXXXXX_enhance_purchase_order_receiving.php

public function up()
{
    Schema::table('purchase_orders', function (Blueprint $table) {
        $table->string('supplier_invoice_path')->nullable()->after('notes');
        $table->decimal('other_costs_total', 15, 2)->default(0)->after('supplier_invoice_path');
        $table->decimal('final_total', 15, 2)->nullable()->after('other_costs_total');
        $table->unsignedBigInteger('supplier_invoice_id')->nullable()->after('final_total');
        $table->foreign('supplier_invoice_id')->references('id')->on('invoices')->onDelete('set null');
    });

    Schema::table('purchase_order_items', function (Blueprint $table) {
        $table->decimal('final_unit_price', 15, 2)->nullable()->after('unit_price');
        $table->decimal('quantity_received_final', 15, 4)->nullable()->after('quantity_received');
    });

    Schema::create('purchase_order_other_costs', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('purchase_order_id');
        $table->string('description');
        $table->decimal('amount', 15, 2);
        $table->unsignedBigInteger('account_id')->nullable();
        $table->timestamps();

        $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->onDelete('cascade');
        $table->foreign('account_id')->references('id')->on('accounts')->onDelete('set null');
        $table->index('purchase_order_id');
        $table->index('account_id');
    });
}

public function down()
{
    Schema::dropIfExists('purchase_order_other_costs');
    
    Schema::table('purchase_order_items', function (Blueprint $table) {
        $table->dropColumn(['final_unit_price', 'quantity_received_final']);
    });

    Schema::table('purchase_orders', function (Blueprint $table) {
        $table->dropForeign(['supplier_invoice_id']);
        $table->dropColumn(['supplier_invoice_path', 'other_costs_total', 'final_total', 'supplier_invoice_id']);
    });
}
```

## Additional Notes

1. **Backward Compatibility:**
   - Existing purchase orders without `final_total` should use `total` as fallback
   - Existing items without `final_unit_price` should use `unit_price` as fallback

2. **Supplier Invoice Display:**
   - When viewing purchase order, show link to supplier invoice if `supplier_invoice_id` exists
   - Display supplier invoice in supplier detail page under invoices tab

3. **Reporting:**
   - Update purchase order reports to show `final_total` instead of `total`
   - Include other costs in purchase order detail views
   - Track other costs in expense reports

4. **Permissions:**
   - Ensure `stock.create` permission is required for receiving stock
   - File uploads should respect same permissions

