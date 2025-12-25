# Overall Discount & Manual Subtotal Adjustment Backend Requirements

## Overview
This document specifies the backend requirements for implementing overall discount and manual subtotal adjustments in the Point of Sale (POS) system. When users manually adjust item subtotals, the system should calculate overall discounts (if subtotal is reduced) or advance payments (if subtotal is increased), and properly handle Chart of Accounts (COA) mappings for these transactions.

## Business Logic

### Manual Subtotal Adjustment
- Users can double-click on item subtotals in POS to manually adjust them
- If adjusted subtotal < calculated subtotal → **Overall Discount**
- If adjusted subtotal > calculated subtotal → **Advance Payment**
- If adjusted subtotal = calculated subtotal → No adjustment

### Restrictions
- **Guest sales**: Cannot have manual subtotal adjustments (frontend prevents this)
- **Regular customers**: Can have manual subtotal adjustments

## Database Schema Updates

### Sales Table
Add a column to store overall discount:

```sql
ALTER TABLE sales ADD COLUMN overall_discount DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Overall discount applied to the entire sale (in addition to item-level discounts)';
CREATE INDEX idx_sales_overall_discount ON sales(overall_discount);
```

## API Endpoint Changes

### 1. Create Sale (`POST /api/sales`)

#### Request Payload
```json
{
  "sale_type": "walk-in",
  "customer_id": 123,
  "items": [
    {
      "item_id": 1,
      "quantity": 2,
      "unit_price": 1000.00,
      "discount_percentage": 10,
      "delivery_charge": 0
    }
  ],
  "overall_discount": 150.00,  // New optional field
  "notes": "Overall discount: PKR 150.00"
}
```

#### Validation Rules
1. **`overall_discount`** (optional):
   - Must be >= 0
   - Cannot exceed the calculated subtotal (after item-level discounts)
   - If provided, store on sale record
   - If not provided or 0, default to 0

2. **Calculation Flow**:
   ```
   Item Subtotal = sum(item.unit_price * item.quantity * (1 - item.discount_percentage / 100))
   Item Discounts = sum(item.unit_price * item.quantity * item.discount_percentage / 100)
   Delivery Charges = sum(item.delivery_charge)
   Subtotal Before Overall Discount = Item Subtotal + Delivery Charges
   Overall Discount = overall_discount (from payload)
   Final Total = Subtotal Before Overall Discount - Overall Discount
   ```

#### Response
```json
{
  "sale": {
    "id": 456,
    "sale_number": "SALE-20240101-001",
    "subtotal": 1800.00,
    "total_discount": 200.00,  // Item-level discounts
    "overall_discount": 150.00,  // Overall discount
    "total_amount": 1650.00,  // Final total after all discounts
    // ... other sale fields
  }
}
```

### 2. Process Sale (`POST /api/sales/{id}/process`)

#### Request Payload
```json
{
  "payment_method": "cash",
  "payment_account_id": 1,
  "amount_paid": 1700.00,  // May include advance if > total_amount
  "use_advance": false,
  "notes": null
}
```

#### Processing Logic

1. **Calculate Final Amounts**:
   ```php
   $finalTotal = $sale->subtotal - $sale->overall_discount;
   $amountPaid = $payload['amount_paid'];
   $advanceAmount = max(0, $amountPaid - $finalTotal);
   $dueAmount = max(0, $finalTotal - $amountPaid);
   ```

2. **Journal Entry Creation**:
   - **Revenue Entry**: Debit Cash/Bank (payment_account_id), Credit Sales Revenue
   - **Discount Entry**: If `overall_discount > 0`:
     - Debit Discount Account (from COA mapping), Credit Sales Revenue
   - **Advance Entry**: If `advanceAmount > 0`:
     - Debit Cash/Bank, Credit Customer Advance Account (from COA mapping)
   - **Due Entry**: If `dueAmount > 0`:
     - Debit Accounts Receivable (from COA mapping), Credit Sales Revenue

## Chart of Accounts (COA) Mappings

### Required Account Mappings

The system should use account mappings to determine which accounts to use for discounts, advances, and dues:

#### 1. Discount Account Mapping
- **Mapping Type**: `pos_discount` (already exists in system)
- **Purpose**: Account to debit when overall discount is applied
- **Account Type**: Typically an expense/contra revenue account (e.g., "Sales Discounts", "Discounts Given")
- **Usage**: When `overall_discount > 0`, debit this account
- **Note**: This mapping already exists in the POS settings page

#### 2. Customer Advance Account Mapping
- **Mapping Type**: `pos_advance` (already exists in system)
- **Purpose**: Account to credit when customer pays more than total (advance)
- **Account Type**: Typically a liability account (e.g., "Customer Advances", "Prepaid Sales")
- **Usage**: When `amount_paid > final_total`, credit this account
- **Note**: This mapping already exists in the POS settings page

#### 3. Accounts Receivable Mapping
- **Mapping Type**: `pos_ar` (already exists in system)
- **Purpose**: Account to debit when customer owes money (due)
- **Account Type**: Typically an asset account (e.g., "Accounts Receivable", "Trade Receivables")
- **Usage**: When `amount_paid < final_total`, debit this account
- **Note**: This mapping already exists in the POS settings page

### Account Mapping Lookup
```php
// Pseudo-code
function getAccountMapping($mappingType) {
    $mapping = AccountMapping::where('mapping_type', $mappingType)->first();
    if (!$mapping) {
        throw new Exception("Account mapping for {$mappingType} not found");
    }
    return $mapping->account_id;
}

$discountAccountId = getAccountMapping('pos_discount');
$advanceAccountId = getAccountMapping('pos_advance');
$receivableAccountId = getAccountMapping('pos_ar');
```

## Journal Entry Structure

### Example: Sale with Overall Discount

**Sale Details:**
- Subtotal: PKR 2,000.00
- Item Discounts: PKR 200.00
- Overall Discount: PKR 150.00
- Final Total: PKR 1,650.00
- Amount Paid: PKR 1,650.00

**Journal Entries:**

1. **Revenue Recognition**:
   ```
   Debit: Cash Account (PKR 1,650.00)
   Credit: Sales Revenue Account (PKR 2,000.00)
   ```

2. **Item Discounts** (already handled in existing logic):
   ```
   Debit: Discount Account (PKR 200.00)
   Credit: Sales Revenue Account (PKR 200.00)
   ```

3. **Overall Discount**:
   ```
   Debit: Discount Account (PKR 150.00)
   Credit: Sales Revenue Account (PKR 150.00)
   ```

### Example: Sale with Advance Payment

**Sale Details:**
- Final Total: PKR 1,650.00
- Amount Paid: PKR 2,000.00
- Advance: PKR 350.00

**Journal Entries:**

1. **Revenue Recognition**:
   ```
   Debit: Cash Account (PKR 2,000.00)
   Credit: Sales Revenue Account (PKR 1,650.00)
   Credit: Customer Advance Account (PKR 350.00)
   ```

### Example: Sale with Due

**Sale Details:**
- Final Total: PKR 1,650.00
- Amount Paid: PKR 1,000.00
- Due: PKR 650.00

**Journal Entries:**

1. **Revenue Recognition**:
   ```
   Debit: Cash Account (PKR 1,000.00)
   Debit: Accounts Receivable (PKR 650.00)
   Credit: Sales Revenue Account (PKR 1,650.00)
   ```

## Invoice Display Requirements

### Invoice Structure
When creating invoices, include overall discount as a separate line item:

```
Item Details:
- Item 1: PKR 1,000.00 × 2 = PKR 2,000.00
  Discount (10%): -PKR 200.00
  Subtotal: PKR 1,800.00

Delivery Charges: PKR 0.00

Subtotal: PKR 1,800.00
Item Discounts: -PKR 200.00
Overall Discount: -PKR 150.00  ← New line item
─────────────────────────────
Total Amount: PKR 1,450.00

Payment: PKR 1,450.00
Advance: PKR 0.00 (or show if applicable)
Due: PKR 0.00 (or show if applicable)
```

### Invoice Metadata
Include overall discount in invoice metadata:

```json
{
  "sale": {
    "id": 456,
    "sale_number": "SALE-20240101-001",
    "subtotal": 1800.00,
    "item_discounts": 200.00,
    "overall_discount": 150.00,
    "total_amount": 1450.00
  },
  "overall_discount": 150.00,
  "discount_account": {
    "id": 45,
    "name": "Sales Discounts",
    "number": "4-0010"
  }
}
```

## Processing Flow

### Complete Sale Processing Flow

```php
// Pseudo-code
function processSale($saleId, $payload) {
    $sale = Sale::findOrFail($saleId);
    
    // Calculate final amounts
    $itemSubtotal = $sale->subtotal; // Already calculated with item discounts
    $overallDiscount = $sale->overall_discount ?? 0;
    $deliveryCharges = $sale->total_delivery_charges ?? 0;
    
    $subtotalBeforeOverallDiscount = $itemSubtotal + $deliveryCharges;
    $finalTotal = $subtotalBeforeOverallDiscount - $overallDiscount;
    
    $amountPaid = $payload['amount_paid'] ?? $finalTotal;
    $advanceAmount = max(0, $amountPaid - $finalTotal);
    $dueAmount = max(0, $finalTotal - $amountPaid);
    
    // Get account mappings
    $discountAccountId = getAccountMapping('pos_discount');
    $advanceAccountId = getAccountMapping('customer_advance');
    $receivableAccountId = getAccountMapping('accounts_receivable');
    $salesRevenueAccountId = getAccountMapping('sales_revenue');
    $paymentAccountId = $payload['payment_account_id'];
    
    // Create journal entries
    $journalEntries = [];
    
    // 1. Main revenue entry
    $journalEntries[] = [
        'account_id' => $paymentAccountId,
        'debit' => $amountPaid,
        'credit' => 0,
        'description' => "Payment for Sale #{$sale->sale_number}"
    ];
    
    $journalEntries[] = [
        'account_id' => $salesRevenueAccountId,
        'debit' => 0,
        'credit' => $finalTotal,
        'description' => "Revenue from Sale #{$sale->sale_number}"
    ];
    
    // 2. Overall discount entry (if applicable)
    if ($overallDiscount > 0) {
        $journalEntries[] = [
            'account_id' => $discountAccountId,
            'debit' => $overallDiscount,
            'credit' => 0,
            'description' => "Overall discount for Sale #{$sale->sale_number}"
        ];
        
        $journalEntries[] = [
            'account_id' => $salesRevenueAccountId,
            'debit' => 0,
            'credit' => $overallDiscount,
            'description' => "Overall discount adjustment for Sale #{$sale->sale_number}"
        ];
    }
    
    // 3. Advance entry (if applicable)
    if ($advanceAmount > 0) {
        $journalEntries[] = [
            'account_id' => $advanceAccountId,
            'debit' => 0,
            'credit' => $advanceAmount,
            'description' => "Advance payment for Sale #{$sale->sale_number}"
        ];
    }
    
    // 4. Due entry (if applicable)
    if ($dueAmount > 0) {
        $journalEntries[] = [
            'account_id' => $receivableAccountId,
            'debit' => $dueAmount,
            'credit' => 0,
            'description' => "Outstanding due for Sale #{$sale->sale_number}"
        ];
        
        $journalEntries[] = [
            'account_id' => $salesRevenueAccountId,
            'debit' => 0,
            'credit' => $dueAmount,
            'description' => "Revenue from Sale #{$sale->sale_number} (due)"
        ];
    }
    
    // Create journal entry record
    $journalEntry = JournalEntry::create([
        'entry_date' => now()->toDateString(),
        'voucher_type' => 'sale',
        'reference_id' => $sale->id,
        // ... other fields
    ]);
    
    // Create journal entry lines
    foreach ($journalEntries as $entry) {
        JournalEntryLine::create([
            'journal_entry_id' => $journalEntry->id,
            'account_id' => $entry['account_id'],
            'debit' => $entry['debit'],
            'credit' => $entry['credit'],
            'description' => $entry['description'],
        ]);
    }
    
    // Update sale status
    $sale->update([
        'status' => 'completed',
        'payment_status' => $dueAmount > 0 ? 'partial' : ($advanceAmount > 0 ? 'paid' : 'paid'),
        'amount_paid' => $amountPaid,
        'amount_due' => $dueAmount,
        'advance_used' => $advanceAmount,
    ]);
    
    // Create invoice
    $invoice = createInvoice($sale, [
        'overall_discount' => $overallDiscount,
        'advance_amount' => $advanceAmount,
        'due_amount' => $dueAmount,
    ]);
    
    return [
        'sale' => $sale,
        'invoice' => $invoice,
        'journal_entry' => $journalEntry,
    ];
}
```

## Validation Rules

### Overall Discount Validation
1. `overall_discount >= 0` (cannot be negative)
2. `overall_discount <= subtotal` (cannot exceed subtotal before discount)
3. For guest sales: `overall_discount` must be 0 (frontend prevents, but backend should validate)

### Account Mapping Validation
1. All required account mappings must exist:
   - `pos_discount` (for overall discounts) - already exists in system
   - `pos_advance` (for advance payments) - already exists in system
   - `pos_ar` (for outstanding dues) - already exists in system
   - `pos_sales_revenue` (for revenue recognition) - already exists in system
2. If any mapping is missing, return 500 error with clear message
3. These mappings are configured in the POS Settings page (`/selling/settings`)

## Error Responses

### Missing Account Mapping
```json
{
  "message": "Account mapping for 'pos_discount' not found. Please configure account mappings in settings.",
  "error_code": "MISSING_ACCOUNT_MAPPING"
}
```

### Invalid Overall Discount
```json
{
  "message": "Overall discount cannot exceed subtotal",
  "errors": {
    "overall_discount": [
      "Overall discount (500.00) exceeds subtotal (400.00)"
    ]
  }
}
```

## Testing Scenarios

### 1. Sale with Overall Discount
- **Input**: Subtotal PKR 2,000, Overall Discount PKR 150
- **Expected**: Final Total PKR 1,850, Discount Account debited PKR 150

### 2. Sale with Advance Payment
- **Input**: Final Total PKR 1,650, Amount Paid PKR 2,000
- **Expected**: Advance PKR 350, Customer Advance Account credited PKR 350

### 3. Sale with Due
- **Input**: Final Total PKR 1,650, Amount Paid PKR 1,000
- **Expected**: Due PKR 650, Accounts Receivable debited PKR 650

### 4. Sale with Overall Discount and Advance
- **Input**: Subtotal PKR 2,000, Overall Discount PKR 150, Amount Paid PKR 2,000
- **Expected**: Final Total PKR 1,850, Advance PKR 150, Both discount and advance accounts updated

### 5. Guest Sale with Overall Discount (Should Fail)
- **Input**: Guest sale with overall_discount > 0
- **Expected**: 422 error - "Guest sales cannot have overall discounts"

## Implementation Checklist

- [ ] Add `overall_discount` column to `sales` table
- [ ] Update `createSale` endpoint to accept `overall_discount`
- [ ] Validate overall discount (>= 0, <= subtotal)
- [ ] Prevent overall discount for guest sales
- [ ] Update sale total calculation to include overall discount
- [ ] Create account mappings for:
  - [ ] `pos_discount` (discount account)
  - [ ] `customer_advance` (advance account)
  - [ ] `accounts_receivable` (receivable account)
- [ ] Update journal entry creation to include overall discount entry
- [ ] Update journal entry creation for advance payments
- [ ] Update journal entry creation for outstanding dues
- [ ] Update invoice creation to display overall discount
- [ ] Include overall discount in invoice metadata
- [ ] Update invoice PDF generation to show overall discount line
- [ ] Add unit tests for overall discount calculation
- [ ] Add integration tests for COA mappings
- [ ] Add tests for advance and due handling

## Notes

- Overall discount is applied **after** item-level discounts
- Overall discount should be clearly visible on invoices for transparency
- COA mappings should be configurable in system settings
- All journal entries must balance (total debits = total credits)
- Invoice metadata should include discount account information for reporting

