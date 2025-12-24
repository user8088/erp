# Customer Stock Profit – Backend Changes for Cost & Previous Cost per Sale

## ⚠️ CRITICAL FIX REQUIRED

**Current Bug:** Backend is using the **latest purchase price** for ALL sales, instead of using the cost **at the time of each sale**.

**Example of the Bug:**
```
Purchase History:
- Dec 20: Bought Cement @ PKR 1,700/bag
- Dec 22: Bought Cement @ PKR 1,800/bag (latest)

Sale History:
- Dec 21: Sold 1 bag
  ❌ Backend returns: cost_price = 1,800 (WRONG - using latest)
  ✅ Should return: cost_price = 1,700 (cost at time of sale)

- Dec 23: Sold 1 bag
  ✅ Backend returns: cost_price = 1,800 (correct - this is the cost at time of sale)
```

**Result:** Both sales show cost = 1,800, when the first sale should show 1,700.

---

## What This Document Fixes

This document describes the **backend changes** required so that the frontend can show, for each sale to a customer:

- **Cost**: the item cost **at the time of sale** (the active supplier cost when that sale happened)
- **Previous Cost**: the **immediately previous** cost before that one (for trend insight)

The goal is to keep the UI simple:

```text
Cost: PKR 1,700.00 / unit        ← cost at time of sale
Previous Cost: PKR 1,500.00 / unit  ← previous supplier cost before this one
Selling: PKR 1,800.00 / unit
Profit: PKR 100.00  (5.56%)
```

---

## 1. Endpoint (unchanged)

We keep using the existing endpoint:

```http
GET /api/customers/{customer_id}/stock-profit-stats
```

Query params (`start_date`, `end_date`, `month`) stay the same.

---

## 2. Response Changes

### 2.1 Transaction Shape

Each transaction in `statistics.transactions` MUST include the following fields:

```jsonc
"transactions": [
  {
    "id": 1,
    "sale_id": 101,
    "sale_number": "SAL-20251224-001",
    "invoice_id": 201,
    "invoice_number": "INV-20251224-001",
    "item_id": 1,
    "item_name": "Portland Cement 50kg",
    "item_brand": "Paidar",
    "quantity": 1.0,
    "unit": "bag",

    // NEW – cost values
    "cost_price": 1700.00,              // cost AT TIME OF SALE
    "previous_cost_price": 1500.00,     // previous cost before this one (or null)

    // Revenue and profit (always based on cost_price)
    "selling_price": 1800.00,
    "total_cost": 1700.00,              // quantity * cost_price
    "total_revenue": 1800.00,           // quantity * selling_price
    "profit": 100.00,                   // total_revenue - total_cost
    "profit_margin_percentage": 5.56,   // (profit / total_revenue) * 100

    "sale_date": "2025-12-24",
    "purchase_invoice_id": 501,
    "purchase_invoice_number": "PINV-20251220-001",
    "supplier_id": 10,
    "supplier_name": "ABC Suppliers"
  }
]
```

**⚠️ CRITICAL: `cost_price` MUST be the cost AT TIME OF SALE, NOT the latest cost!**

Notes:

- `cost_price` is **fixed per sale** – it should never change later even if you restock at a different price.
- `cost_price` = **the latest purchase price that existed ON OR BEFORE the sale_date**
- `previous_cost_price` = **the purchase price that was active BEFORE the one used for `cost_price`**
- Profit and margin in the backend must always use `cost_price` (not the current latest cost).

**Example Scenario (Your Exact Case):**
```
Purchase History:
- Dec 20: Bought Cement @ PKR 1,700/bag (Purchase Invoice #PINV-001)
- Dec 22: Bought Cement @ PKR 1,800/bag (Purchase Invoice #PINV-002)

Sale History:
- Dec 21: Sold 1 bag (Sale #SAL-001)
  → cost_price: 1,700 (latest purchase on/before Dec 21 was Dec 20)
  → previous_cost_price: null (no purchase before Dec 20)

- Dec 23: Sold 1 bag (Sale #SAL-002)  
  → cost_price: 1,800 (latest purchase on/before Dec 23 was Dec 22)
  → previous_cost_price: 1,700 (the cost before 1,800)
```

**⚠️ COMMON MISTAKE - DO NOT DO THIS:**

If you're using the **latest purchase price** (1,800) for ALL sales, that's wrong:

```php
// ❌ WRONG - Using latest cost for all sales
$latestCost = getLatestPurchasePrice($itemId); // Returns 1,800
foreach ($sales as $sale) {
    $costPrice = $latestCost; // ❌ Same cost for all sales!
}
```

**✅ CORRECT - Use cost at time of sale:**

```php
// ✅ CORRECT - Look up cost for each sale's date
$purchaseHistory = getPurchaseHistoryByItem($itemId); // Ordered by date ASC

foreach ($sales as $sale) {
    // Find latest purchase on or before sale_date
    $costRecord = findLatestPurchaseBeforeDate($purchaseHistory, $sale->sale_date);
    $costPrice = $costRecord['unit_price']; // Different for each sale!
}
```

**❌ WRONG (what backend is probably doing now):**
```json
// Both sales showing latest cost (1,800) - WRONG!
{
  "sale_date": "2025-12-21",
  "cost_price": 1800.00  // ❌ This is wrong! Should be 1700
},
{
  "sale_date": "2025-12-23", 
  "cost_price": 1800.00  // ✅ This is correct
}
```

**✅ CORRECT:**
```json
{
  "sale_date": "2025-12-21",
  "cost_price": 1700.00,        // ✅ Cost at time of sale
  "previous_cost_price": null   // ✅ No previous cost
},
{
  "sale_date": "2025-12-23",
  "cost_price": 1800.00,        // ✅ Cost at time of sale
  "previous_cost_price": 1700.00 // ✅ Previous cost before 1800
}
```

### 2.2 Item-Level Aggregates

The `items` array should aggregate **based on these per‑sale costs**:

```jsonc
"items": [
  {
    "item_id": 1,
    "item_name": "Cement",
    "item_brand": "Paidar",
    "item_category": "Construction Material",
    "total_quantity_sold": 4.0,
    "unit": "bag",

    "total_cost": 5600.00,          // sum of per-sale total_cost
    "total_revenue": 6600.00,       // sum of per-sale total_revenue
    "total_profit": 1000.00,        // total_revenue - total_cost
    "profit_margin_percentage": 15.15,

    // Average values are optional and only used for reporting if needed
    "average_cost_price": 1400.00,      // total_cost / total_quantity_sold
    "average_selling_price": 1650.00,   // total_revenue / total_quantity_sold

    "transactions_count": 4,
    "last_sale_date": "2025-12-24"
  }
]
```

The frontend now mainly uses **totals** and `profit_margin_percentage`. Averages are optional but should be consistent with totals.

---

## 3. How to Compute `cost_price` and `previous_cost_price`

### 3.1 Data Needed

For each item, you need a **price history** ordered by time, typically from:

- `purchase_invoices` + `purchase_invoice_items` (preferred), or
- `purchase_orders` + `purchase_order_items` (fallback).

Each record should provide:

- `item_id`
- `purchase_date` (invoice or order date)
- `unit_price` (supplier cost)
- Optional: `purchase_invoice_id`, `invoice_number`, `supplier_id`, `supplier_name`

### 3.2 Price Timeline per Item

For each `item_id`:

1. Load all purchase records (`purchase_date`, `unit_price`, etc.).
2. Sort them by `purchase_date ASC, id ASC`.
3. This gives you a **timeline of cost changes**.

Example:

```text
Dec 01 – cost = 1,300
Dec 10 – cost = 1,500
Dec 20 – cost = 1,700
```

### 3.3 Cost at Time of Sale

For each sale item (with `sale_date` and `item_id`):

1. From the item’s price timeline, pick the **latest purchase whose date is ≤ sale_date**.
   - That purchase’s `unit_price` becomes `cost_price` (cost at time of sale).
   - If none exists (no purchase before that sale), you can:
     - Either **skip that transaction**, or
     - Use `item.last_purchase_price` as fallback (document the choice).

2. The **previous_cost_price** is:
   - The `unit_price` of the purchase **immediately before** the one you just picked in the timeline.
   - Or `null` if the chosen purchase is the first in the list.

Example:

```text
Price history:
- Dec 01: 1,300
- Dec 10: 1,500
- Dec 20: 1,700

Sale A on Dec 12:
- cost_price = 1,500   (latest price ≤ Dec 12)
- previous_cost_price = 1,300

Sale B on Dec 22:
- cost_price = 1,700   (latest price ≤ Dec 22)
- previous_cost_price = 1,500
```

### 3.4 Profit Calculation per Sale

Once you have `cost_price` for that sale:

```text
total_cost     = quantity * cost_price
total_revenue  = quantity * selling_price
profit         = total_revenue - total_cost
margin %       = (profit / total_revenue) * 100
```

These values are what you return in each transaction.

---

## 4. Implementation Sketch (Pseudocode)

High‑level PHP / Laravel‑style pseudocode:

```php
function getCustomerStockProfitStats($customerId, $filters): array {
    $sales = getCustomerSalesWithItems($customerId, $filters); // sales + sale_items

    // 1) Build purchase history per item
    $itemIds = collectItemIdsFromSales($sales);
    $purchaseHistory = getPurchaseHistoryByItem($itemIds); // [item_id => [records...]] ordered ASC

    $transactions = [];
    $itemTotals = []; // per-item aggregates

    foreach ($sales as $sale) {
        foreach ($sale->items as $item) {
            $itemId   = $item->item_id;
            $qty      = $item->quantity;
            $sellPrice = $item->unit_price;
            $saleDate = $sale->sale_date;

            $history = $purchaseHistory[$itemId] ?? [];
            [$costRecord, $previousCostRecord] = findCostAndPreviousForDate($history, $saleDate);
            
            // ⚠️ CRITICAL: costRecord MUST be the purchase on/before saleDate, NOT the latest purchase!

            if (!$costRecord) {
                // optional: fallback to last_purchase_price or skip
                continue;
            }

            $costPrice         = $costRecord['unit_price'];
            $previousCostPrice = $previousCostRecord['unit_price'] ?? null;

            $totalRevenue = $qty * $sellPrice;
            $totalCost    = $qty * $costPrice;
            $profit       = $totalRevenue - $totalCost;
            $margin       = $totalRevenue > 0 ? ($profit / $totalRevenue) * 100 : 0;

            $transactions[] = [
                'id'                       => $item->id,
                'sale_id'                  => $sale->id,
                'sale_number'              => $sale->sale_number,
                'invoice_id'               => $sale->invoice_id,
                'invoice_number'           => optional($sale->invoice)->invoice_number,
                'item_id'                  => $itemId,
                'item_name'                => $item->item->name,
                'item_brand'               => $item->item->brand,
                'quantity'                 => $qty,
                'unit'                     => $item->unit,
                'cost_price'               => $costPrice,
                'previous_cost_price'      => $previousCostPrice,
                'selling_price'            => $sellPrice,
                'total_cost'               => $totalCost,
                'total_revenue'            => $totalRevenue,
                'profit'                   => $profit,
                'profit_margin_percentage' => $margin,
                'sale_date'                => $saleDate,
                'purchase_invoice_id'      => $costRecord['purchase_invoice_id'] ?? null,
                'purchase_invoice_number'  => $costRecord['purchase_invoice_number'] ?? null,
                'supplier_id'              => $costRecord['supplier_id'] ?? null,
                'supplier_name'            => $costRecord['supplier_name'] ?? null,
            ];

            updateItemTotals($itemTotals, $itemId, $item, $totalCost, $totalRevenue, $profit, $saleDate);
        }
    }

    $items = finalizeItemTotals($itemTotals);

    return [
        'customer_id'           => $customerId,
        'customer_name'         => getCustomerName($customerId),
        'total_items_sold'      => count($items),
        'total_quantity_sold'   => array_sum(array_column($items, 'total_quantity_sold')),
        'total_cost'            => array_sum(array_column($items, 'total_cost')),
        'total_revenue'         => array_sum(array_column($items, 'total_revenue')),
        'total_profit'          => array_sum(array_column($items, 'total_profit')),
        'overall_profit_margin' => /* (total_profit / total_revenue) * 100 */,
        'items'                 => $items,
        'transactions'          => $transactions,
        'period_start'          => $filters['start_date'] ?? null,
        'period_end'            => $filters['end_date'] ?? null,
    ];
}
```

Helper `findCostAndPreviousForDate`:

```php
function findCostAndPreviousForDate(array $history, string $saleDate): array {
    $costRecord = null;
    $previous   = null;

    foreach ($history as $record) {
        if ($record['purchase_date'] <= $saleDate) {
            $previous   = $costRecord;
            $costRecord = $record;
        } else {
            break;
        }
    }

    return [$costRecord, $previous];
}
```

---

## 5. Frontend Expectations (Summary)

Once these changes are implemented, the frontend will:

- Show `Cost: cost_price` (cost at time of sale).
- Show `Previous Cost: previous_cost_price` **only if** it’s not null and different from `cost_price`.
- Compute nothing fancy – it will just display what the backend sends and use `profit` / `profit_margin_percentage` as-is.


