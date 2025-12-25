# Customer Stock Profit API - Backend Changes Documentation

## Overview

The backend has been updated to fix a critical bug where creating new purchase orders at different prices was retroactively updating the cost for all previous sales. The fix ensures that **each sale retains the cost that was active at the time it was made**, based on ID-based comparison rather than date/time.

---

## What Changed

### Previous Behavior (BUG)
- When a new purchase order was created with a different price, ALL previous sales would show the new cost
- Example: If you bought cement at PKR 2,000, then later bought at PKR 2,100, ALL sales would show cost = 2,100

### New Behavior (FIXED)
- Each sale now "remembers" the cost that was active when it was created
- New purchase orders only affect sales created AFTER them (based on ID comparison)
- Example: 
  - Purchase Order ID 10: cost = 2,000
  - Sale ID 15: cost = 2,000 (uses PO 10, since 10 < 15)
  - Purchase Order ID 20: cost = 2,100
  - Sale ID 25: cost = 2,100 (uses PO 20, since 20 < 25)
  - Sale ID 15 still shows cost = 2,000 (unchanged!)

---

## How Cost Calculation Works

### ID-Based Comparison
The backend now uses **ID comparison** instead of date/time comparison:

1. **Purchase orders are sorted by `purchase_order_id` (ASC)**
2. **For each sale, the backend finds the latest purchase order where `purchase_order_id < sale_id`**
3. **That purchase order's cost is used for that sale**

### Important Notes
- Only purchase orders with `received_date` set (stock actually received) are included
- Purchase orders with status `cancelled` are excluded
- If no purchase order is found before a sale, it falls back to `item.last_purchase_price` or skips the transaction

---

## API Endpoint (Unchanged)

```
GET /api/customers/{customer_id}/stock-profit-stats
```

### Query Parameters (Unchanged)
- `start_date` (optional): Filter sales from this date
- `end_date` (optional): Filter sales until this date
- `month` (optional): Filter by month (format: YYYY-MM)

---

## Response Structure (Unchanged)

The response structure remains the same. The only difference is that `cost_price` values are now **historically accurate** and won't change when new purchase orders are created.

### Response Example

```json
{
  "customer_id": 1,
  "customer_name": "ABC Company",
  "total_items_sold": 1,
  "total_quantity_sold": 3.0,
  "total_cost": 6000.00,
  "total_revenue": 6600.00,
  "total_profit": 600.00,
  "overall_profit_margin": 9.09,
  "items": [
    {
      "item_id": 1,
      "item_name": "Cement (Paidar)",
      "item_brand": "Paidar",
      "item_category": "Construction Material",
      "total_quantity_sold": 3.0,
      "unit": "bag",
      "average_cost_price": 2000.00,
      "average_selling_price": 2200.00,
      "total_cost": 6000.00,
      "total_revenue": 6600.00,
      "total_profit": 600.00,
      "profit_margin_percentage": 9.09,
      "transactions_count": 3,
      "last_sale_date": "2025-12-24"
    }
  ],
  "transactions": [
    {
      "id": 1,
      "sale_id": 15,
      "sale_number": "SALE-20251224-000001",
      "invoice_id": 101,
      "invoice_number": "SAL-20251224-001",
      "item_id": 1,
      "item_name": "Cement (Paidar)",
      "item_brand": "Paidar",
      "quantity": 1.0,
      "unit": "bag",
      "cost_price": 2000.00,           // ✅ Cost at time of sale (from PO ID 10)
      "previous_cost_price": null,      // No previous purchase
      "selling_price": 2000.00,
      "total_cost": 2000.00,
      "total_revenue": 2000.00,
      "profit": 0.00,
      "profit_margin_percentage": 0.00,
      "sale_date": "2025-12-24",
      "purchase_invoice_id": 10,
      "purchase_invoice_number": "PO-20251220-001",
      "supplier_id": 5,
      "supplier_name": "Bhati building Material Store"
    },
    {
      "id": 2,
      "sale_id": 16,
      "sale_number": "SALE-20251224-000002",
      "invoice_id": 102,
      "invoice_number": "SAL-20251224-002",
      "item_id": 1,
      "item_name": "Cement (Paidar)",
      "item_brand": "Paidar",
      "quantity": 1.0,
      "unit": "bag",
      "cost_price": 2000.00,           // ✅ Still uses PO 10 (since 10 < 16)
      "previous_cost_price": null,
      "selling_price": 2200.00,
      "total_cost": 2000.00,
      "total_revenue": 2200.00,
      "profit": 200.00,
      "profit_margin_percentage": 9.09,
      "sale_date": "2025-12-24",
      "purchase_invoice_id": 10,
      "purchase_invoice_number": "PO-20251220-001",
      "supplier_id": 5,
      "supplier_name": "Bhati building Material Store"
    },
    {
      "id": 3,
      "sale_id": 25,
      "sale_number": "SALE-20251224-000003",
      "invoice_id": 103,
      "invoice_number": "SAL-20251224-003",
      "item_id": 1,
      "item_name": "Cement (Paidar)",
      "item_brand": "Paidar",
      "quantity": 1.0,
      "unit": "bag",
      "cost_price": 2100.00,           // ✅ Uses PO 20 (since 20 < 25)
      "previous_cost_price": 2000.00,  // Previous cost from PO 10
      "selling_price": 2200.00,
      "total_cost": 2100.00,
      "total_revenue": 2200.00,
      "profit": 100.00,
      "profit_margin_percentage": 4.55,
      "sale_date": "2025-12-24",
      "purchase_invoice_id": 20,
      "purchase_invoice_number": "PO-20251224-002",
      "supplier_id": 5,
      "supplier_name": "Bhati building Material Store"
    }
  ],
  "period_start": "2025-12-24",
  "period_end": "2025-12-24"
}
```

---

## Key Fields in Transaction Object

| Field | Type | Description |
|-------|------|-------------|
| `cost_price` | `number` | **Cost at time of sale** - This is now historically accurate and won't change |
| `previous_cost_price` | `number\|null` | The cost from the purchase order immediately before the one used for `cost_price` |
| `selling_price` | `number` | The price at which the item was sold |
| `total_cost` | `number` | `quantity × cost_price` |
| `total_revenue` | `number` | `quantity × selling_price` |
| `profit` | `number` | `total_revenue - total_cost` |
| `profit_margin_percentage` | `number` | `(profit / total_revenue) × 100` |
| `purchase_invoice_id` | `number\|null` | The purchase order ID that provided this cost |
| `purchase_invoice_number` | `string\|null` | The purchase order number (e.g., "PO-20251224-002") |

---

## Frontend Implementation Notes

### ✅ What You Can Rely On

1. **`cost_price` is historically accurate**: Once a sale is made, its `cost_price` will never change, even if new purchase orders are created at different prices.

2. **`previous_cost_price` shows cost trend**: This field shows the cost from the purchase order immediately before the one used for the sale, useful for showing cost changes.

3. **All calculations are done in backend**: `total_cost`, `total_revenue`, `profit`, and `profit_margin_percentage` are all calculated and provided by the backend. You don't need to recalculate them.

### 🔄 What Changed for Frontend

**Nothing!** The API response structure is unchanged. The only difference is that the `cost_price` values are now correct and won't retroactively change.

### 📊 Display Recommendations

1. **Show `cost_price` clearly**: Display it prominently as "Cost at time of sale" or similar
2. **Use `previous_cost_price` for trends**: Show it as "Previous Cost" or use it to display cost change indicators (↑/↓)
3. **Profit calculations**: Use the provided `profit` and `profit_margin_percentage` values directly - don't recalculate

### ⚠️ Important Considerations

- **ID-based comparison**: The cost is determined by comparing `purchase_order_id` with `sale_id`. This means:
  - If a purchase order is created with a lower ID than an existing sale, that sale won't use it
  - This is intentional - it preserves historical accuracy
  - In practice, purchase orders are usually created before sales, so this works correctly

---

## Example Scenario

### Timeline of Events

1. **Purchase Order ID 10** created on Dec 20
   - Cost: PKR 2,000/bag
   - Received on Dec 20

2. **Sale ID 15** created on Dec 24
   - Uses cost: PKR 2,000 (from PO 10, since 10 < 15)
   - Selling price: PKR 2,200
   - Profit: PKR 200

3. **Sale ID 16** created on Dec 24 (after sale 15)
   - Uses cost: PKR 2,000 (from PO 10, since 10 < 16)
   - Selling price: PKR 2,200
   - Profit: PKR 200

4. **Purchase Order ID 20** created on Dec 24
   - Cost: PKR 2,100/bag
   - Received on Dec 24

5. **Sale ID 25** created on Dec 24 (after PO 20)
   - Uses cost: PKR 2,100 (from PO 20, since 20 < 25)
   - Selling price: PKR 2,200
   - Profit: PKR 100

### Result

- Sale ID 15: **cost = 2,000** ✅ (unchanged, even after PO 20 was created)
- Sale ID 16: **cost = 2,000** ✅ (unchanged, even after PO 20 was created)
- Sale ID 25: **cost = 2,100** ✅ (uses new PO 20)

---

## Testing Checklist

When testing the frontend, verify:

- [ ] Each transaction shows the correct `cost_price` that was active when it was sold
- [ ] Creating a new purchase order doesn't change the cost of previous sales
- [ ] `previous_cost_price` is shown correctly (or null if no previous purchase)
- [ ] Profit calculations match the displayed cost and selling price
- [ ] Item-level aggregates (totals, averages) are correct
- [ ] Overall totals are correct

---

## Support

If you encounter any issues or have questions about the API response, please refer to this document or contact the backend team.

**Last Updated**: December 2025
**API Version**: Unchanged (backward compatible)

