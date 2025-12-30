# Item-Level Discount Backend Requirements

## Issue
Item-level discounts (discounts applied per item via `discount_percentage` in sale items) are currently:
- ✅ Displayed correctly in invoices
- ❌ NOT recorded in Chart of Accounts (COA) journal entries
- ❌ NOT included in customer earnings calculations

## Current Frontend Implementation

### What We're Sending
```json
{
  "sale_type": "walk-in",
  "customer_id": 123,
  "items": [
    {
      "item_id": 1,
      "quantity": 10,
      "unit_price": 2200.00,
      "discount_percentage": 22.73,  // Calculated from discount_amount / unit_price * 100
      "delivery_charge": 0
    }
  ],
  "overall_discount": 0,  // Only for additional discounts beyond item-level
  "notes": "Total discount: PKR 5,000.00 | Item discounts: PKR 5,000.00"
}
```

### Discount Calculation
- **Item Discount Amount** = `unit_price × quantity × (discount_percentage / 100)`
- **Total Item Discount** = Sum of all item discount amounts
- **Overall Discount** = Additional discount beyond item-level discounts (sent separately)

## Required Backend Changes

### 1. Sale Processing - Journal Entry Creation

When processing a sale (`POST /api/sales/{id}/process`), the backend should:

#### Calculate Item-Level Discounts
```php
$totalItemDiscount = 0;
foreach ($sale->saleItems as $item) {
    if ($item->discount_percentage > 0) {
        $itemDiscountAmount = $item->unit_price * $item->quantity * ($item->discount_percentage / 100);
        $totalItemDiscount += $itemDiscountAmount;
    }
}
```

#### Create Journal Entries for Item Discounts

**Current Issue**: Only `overall_discount` is being recorded in COA, not item-level discounts.

**Required Fix**: Create journal entries for item-level discounts similar to overall discounts:

```php
// Get discount account from COA mapping
$discountAccountId = getAccountMapping('pos_discount'); // or 'item_discount' if separate
$salesRevenueAccountId = getAccountMapping('pos_sales_revenue');

// Create journal entry for item-level discounts
if ($totalItemDiscount > 0) {
    // Debit: Discount Account
    JournalEntryLine::create([
        'journal_entry_id' => $journalEntry->id,
        'account_id' => $discountAccountId,
        'debit' => $totalItemDiscount,
        'credit' => 0,
        'description' => "Item-level discounts for Sale #{$sale->sale_number}"
    ]);
    
    // Credit: Sales Revenue Account (to reduce revenue by discount amount)
    JournalEntryLine::create([
        'journal_entry_id' => $journalEntry->id,
        'account_id' => $salesRevenueAccountId,
        'debit' => 0,
        'credit' => $totalItemDiscount,
        'description' => "Item-level discount adjustment for Sale #{$sale->sale_number}"
    ]);
}
```

### 2. Customer Earnings Calculation

#### Current Issue
Customer earnings API (`GET /api/customers/{id}/earnings-stats`) is not including item-level discounts in:
- `walk_in_sales_discount`
- `order_sales_discount`
- `total_discounts_given`

#### Required Fix
Include item-level discounts when calculating customer earnings:

```php
// When calculating sale discounts
$saleDiscount = $sale->overall_discount ?? 0;

// ADD: Calculate item-level discounts
foreach ($sale->saleItems as $item) {
    if ($item->discount_percentage > 0) {
        $itemDiscount = $item->unit_price * $item->quantity * ($item->discount_percentage / 100);
        $saleDiscount += $itemDiscount;
    }
}

// Use $saleDiscount in earnings calculation
```

### 3. Sale Model - Add Helper Methods

Add methods to calculate discounts:

```php
// In Sale model
public function getTotalItemDiscountAttribute(): float
{
    return $this->saleItems->sum(function ($item) {
        if ($item->discount_percentage > 0) {
            return $item->unit_price * $item->quantity * ($item->discount_percentage / 100);
        }
        return 0;
    });
}

public function getTotalDiscountAttribute(): float
{
    $itemDiscount = $this->total_item_discount;
    $overallDiscount = $this->overall_discount ?? 0;
    return $itemDiscount + $overallDiscount;
}
```

### 4. Invoice Display

Ensure invoices show both item-level and overall discounts separately:

```
Item Details:
- Cement: 10 × PKR 2,200.00 = PKR 22,000.00
  Discount (22.73%): -PKR 5,000.00
  Subtotal: PKR 17,000.00

Subtotal: PKR 17,000.00
Item Discounts: -PKR 5,000.00
Overall Discount: -PKR 0.00
─────────────────────────────
Total Amount: PKR 17,000.00
```

## Database Schema

### Sale Items Table
Ensure `discount_percentage` column exists and is properly indexed:

```sql
ALTER TABLE sale_items 
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0.00 
COMMENT 'Discount percentage applied to this item (0-100)';

CREATE INDEX IF NOT EXISTS idx_sale_items_discount ON sale_items(discount_percentage);
```

## API Response Updates

### Sale Response
Include item-level discount information:

```json
{
  "sale": {
    "id": 456,
    "sale_number": "SALE-20240101-001",
    "subtotal": 22000.00,
    "item_discounts": 5000.00,  // NEW: Total item-level discounts
    "overall_discount": 0.00,
    "total_discount": 5000.00,  // NEW: item_discounts + overall_discount
    "total_amount": 17000.00
  }
}
```

### Customer Earnings Response
Ensure discounts include item-level discounts:

```json
{
  "statistics": {
    "walk_in_sales_discount": 5000.00,  // Should include item-level discounts
    "total_discounts_given": 5000.00    // Should include item-level discounts
  }
}
```

## Testing Scenarios

### 1. Sale with Item-Level Discount Only
- **Input**: 10 items × PKR 2,200.00 with 22.73% discount per item
- **Expected**:
  - Item discount: PKR 5,000.00
  - COA: Discount Account debited PKR 5,000.00
  - Customer earnings: Discount included in `total_discounts_given`

### 2. Sale with Both Item-Level and Overall Discount
- **Input**: Item discount PKR 5,000.00 + Overall discount PKR 500.00
- **Expected**:
  - Total discount: PKR 5,500.00
  - COA: Discount Account debited PKR 5,500.00 (item + overall)
  - Customer earnings: Total discount PKR 5,500.00

### 3. Sale with No Discounts
- **Input**: Items with no discount_percentage
- **Expected**: No discount journal entries, no discount in earnings

## Implementation Checklist

- [ ] Add `getTotalItemDiscountAttribute()` method to Sale model
- [ ] Update sale processing to calculate item-level discounts
- [ ] Create journal entries for item-level discounts in COA
- [ ] Update customer earnings calculation to include item-level discounts
- [ ] Update sale response to include `item_discounts` and `total_discount`
- [ ] Update invoice generation to show item-level discounts separately
- [ ] Add database index on `sale_items.discount_percentage`
- [ ] Add unit tests for item-level discount calculation
- [ ] Add integration tests for COA entries with item discounts
- [ ] Update API documentation

## Notes

- Item-level discounts should be treated the same as overall discounts in COA
- Both should debit the Discount Account and credit Sales Revenue Account
- Customer earnings should include ALL discounts (item-level + overall)
- The frontend is already sending `discount_percentage` correctly - the backend just needs to use it

