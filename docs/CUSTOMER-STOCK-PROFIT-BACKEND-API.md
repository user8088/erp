# Customer Stock Profit Backend API Specification

## Overview

This API endpoint calculates the profit earned from selling stock items to a specific customer. It tracks the cost price (from supplier purchases) versus the selling price (from customer sales) to determine profit margins.

**Key Challenge**: Supplier prices change over time (e.g., cement bag: PKR 1,300 → PKR 1,400). The system must dynamically match each sale to the correct purchase cost using FIFO (First In, First Out) or similar inventory valuation method.

---

## Endpoint

```
GET /api/customers/{customer_id}/stock-profit-stats
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (YYYY-MM-DD) | No | Filter sales from this date onwards |
| `end_date` | string (YYYY-MM-DD) | No | Filter sales up to this date |
| `month` | string (YYYY-MM) | No | Filter sales for a specific month (alternative to start_date/end_date) |

**Note**: If `month` is provided, it takes precedence over `start_date` and `end_date`.

---

## Response Structure

```json
{
  "customer_id": 1,
  "customer_name": "John Doe",
  "total_items_sold": 3,
  "total_quantity_sold": 45.00,
  "total_cost": 58500.00,
  "total_revenue": 67500.00,
  "total_profit": 9000.00,
  "overall_profit_margin": 13.33,
  "items": [
    {
      "item_id": 1,
      "item_name": "Portland Cement 50kg",
      "item_brand": "Fauji",
      "item_category": "Construction Material",
      "total_quantity_sold": 20.00,
      "unit": "bag",
      "average_cost_price": 1300.00,
      "average_selling_price": 1500.00,
      "total_cost": 26000.00,
      "total_revenue": 30000.00,
      "total_profit": 4000.00,
      "profit_margin_percentage": 13.33,
      "transactions_count": 3,
      "last_sale_date": "2025-12-24"
    }
  ],
  "transactions": [
    {
      "id": 1,
      "sale_id": 101,
      "sale_number": "SAL-20251224-001",
      "invoice_id": 201,
      "invoice_number": "INV-20251224-001",
      "item_id": 1,
      "item_name": "Portland Cement 50kg",
      "item_brand": "Fauji",
      "quantity": 5.00,
      "unit": "bag",
      "cost_price": 1500.00,
      "historical_cost_price": 1300.00,
      "selling_price": 1500.00,
      "total_cost": 7500.00,
      "total_revenue": 7500.00,
      "profit": 0.00,
      "historical_profit": 1000.00,
      "profit_margin_percentage": 0.00,
      "historical_profit_margin_percentage": 13.33,
      "sale_date": "2025-12-20",
      "purchase_invoice_id": 501,
      "purchase_invoice_number": "PINV-20251215-001",
      "supplier_id": 10,
      "supplier_name": "ABC Suppliers"
    }
  ],
  "period_start": "2025-12-01",
  "period_end": "2025-12-31"
}
```

---

## Critical Requirements

### 1. **Cost Price Matching (Latest Purchase Price Method with Historical Tracking)**

The system uses the **most recent purchase price** for profit calculation, but **tracks the historical cost** at the time of sale for trend analysis.

**⚠️ IMPORTANT: Uses LATEST purchase price, but records what cost was at time of sale!**

1. **Track Purchase History**: For each item, maintain a record of all purchase batches with:
   - Purchase date
   - Cost price per unit
   - Quantity purchased
   - Purchase invoice/order reference

2. **For Each Sale**:
   - **Profit Calculation**: Use the **most recent purchase price** available at the time of calculation
   - **Historical Tracking**: Record the **actual cost price at the time of sale** (what was the latest purchase price when this sale happened)
   - This allows tracking pricing trends over time

**Example to Clarify Behavior**:
```
Purchase History:
- Dec 1: Bought 10 bags @ PKR 1,300/bag
- Dec 15: Bought 10 bags @ PKR 1,400/bag
- Dec 20: Bought 10 bags @ PKR 1,500/bag (latest purchase)

Sale on Dec 18: Sold 5 bags
→ Historical Cost at Time of Sale: PKR 1,400/bag (latest purchase price on Dec 18 was from Dec 15)
→ Current Cost Used for Profit: PKR 1,500/bag (most recent purchase as of now)
→ Selling Price: PKR 1,800/bag
→ Profit (using current cost): (1,800 - 1,500) × 5 = PKR 1,500
→ Historical Profit (at time of sale): (1,800 - 1,400) × 5 = PKR 2,000

Sale on Dec 25: Sold 3 bags
→ Historical Cost at Time of Sale: PKR 1,500/bag (latest purchase price on Dec 25 was from Dec 20)
→ Current Cost Used for Profit: PKR 1,500/bag (most recent purchase as of now)
→ Selling Price: PKR 1,800/bag
→ Profit (using current cost): (1,800 - 1,500) × 3 = PKR 900
→ Historical Profit (at time of sale): (1,800 - 1,500) × 3 = PKR 900
```

**Why This Method?**
- **Current Profit Analysis**: Shows profit margins based on current market costs
- **Historical Tracking**: Records what costs were when sales happened (pricing trend)
- **Better Decision Making**: See how profit margins change as supplier prices fluctuate
- **Simpler Calculation**: No need to track which specific purchase batch was used

**Example Scenario**:
```
Purchase History:
- Dec 1: Bought 20 bags @ PKR 1,300/bag (Purchase Invoice #501)
- Dec 15: Bought 30 bags @ PKR 1,400/bag (Purchase Invoice #502)

Sale History:
- Dec 20: Sold 5 bags to Customer A
  → Cost: 5 × 1,300 = PKR 6,500 (from batch #501)
  → Selling Price: 5 × 1,500 = PKR 7,500
  → Profit: PKR 1,000

- Dec 22: Sold 25 bags to Customer A
  → Cost: 15 × 1,300 + 10 × 1,400 = PKR 33,500 (15 from batch #501, 10 from batch #502)
  → Selling Price: 25 × 1,500 = PKR 37,500
  → Profit: PKR 4,000
```

### 2. **Data Sources**

#### Purchase Data (Cost Price)
- **Primary Source**: `purchase_invoices` table with `purchase_invoice_items`
- **Alternative**: `purchase_orders` table with `purchase_order_items` (if invoices not available)
- **Fields Needed**:
  - `item_id`
  - `quantity`
  - `unit_price` (cost price per unit)
  - `purchase_date` or `invoice_date`
  - `supplier_id`
  - `invoice_number` or `order_number`

#### Sale Data (Selling Price)
- **Source**: `sales` table with `sale_items`
- **Filter**: Only sales where `customer_id` matches and `status != 'cancelled'`
- **Fields Needed**:
  - `sale_id`
  - `sale_number`
  - `sale_date`
  - `item_id`
  - `quantity`
  - `unit_price` (selling price per unit)
  - `unit`
  - Related `invoice_id` and `invoice_number` (if exists)

### 3. **Calculation Logic**

#### For Each Sale Item:
```python
# Pseudo-code for profit calculation using latest cost with historical tracking
FOR EACH sale_item IN customer_sales:
  item_id = sale_item.item_id
  sale_date = sale_item.sale_date
  quantity = sale_item.quantity
  selling_price = sale_item.unit_price
  
  # Get the MOST RECENT purchase price (as of now - for current profit calculation)
  latest_purchase = GET_LATEST_PURCHASE(item_id)
  current_cost_price = latest_purchase.unit_price
  
  # Get the purchase price that was LATEST at the TIME OF SALE (for historical tracking)
  historical_purchase = GET_LATEST_PURCHASE_AT_DATE(item_id, sale_date)
  historical_cost_price = historical_purchase.unit_price
  
  # Calculate profit using CURRENT latest cost
  total_cost = quantity * current_cost_price
  total_revenue = quantity * selling_price
  profit = total_revenue - total_cost
  profit_margin = (profit / total_revenue) * 100 if total_revenue > 0 else 0
  
  # Calculate historical profit (what it was at time of sale)
  historical_total_cost = quantity * historical_cost_price
  historical_profit = total_revenue - historical_total_cost
  historical_profit_margin = (historical_profit / total_revenue) * 100 if total_revenue > 0 else 0
  
  # Store transaction with both current and historical data
  transaction = {
    'cost_price': current_cost_price,  # Latest cost (for current profit)
    'historical_cost_price': historical_cost_price,  # Cost at time of sale
    'selling_price': selling_price,
    'total_cost': total_cost,
    'total_revenue': total_revenue,
    'profit': profit,  # Current profit calculation
    'historical_profit': historical_profit,  # Profit at time of sale
    'profit_margin_percentage': profit_margin,
    'historical_profit_margin_percentage': historical_profit_margin,
    'purchase_invoice_id': historical_purchase.invoice_id,
    'purchase_invoice_number': historical_purchase.invoice_number,
    'supplier_id': historical_purchase.supplier_id,
    'supplier_name': historical_purchase.supplier_name
  }
END FOR
```

#### Aggregation by Item:
- Group all sale items by `item_id`
- Calculate:
  - `total_quantity_sold` = SUM(quantity)
  - `average_cost_price` = Use latest purchase price (weighted average if multiple latest purchases)
  - `average_selling_price` = SUM(total_revenue) / SUM(quantity)
  - `total_cost` = SUM(total_cost) using latest cost prices
  - `total_revenue` = SUM(total_revenue)
  - `total_profit` = SUM(profit) using latest cost prices
  - `profit_margin_percentage` = (total_profit / total_revenue) * 100
  - `average_historical_cost_price` = SUM(historical_total_cost) / SUM(quantity) (for trend analysis)
  - `total_historical_profit` = SUM(historical_profit) (what profit was at time of sales)

#### Overall Totals:
- Sum across all items
- `overall_profit_margin` = (total_profit / total_revenue) * 100 (using latest costs)
- `overall_historical_profit_margin` = (total_historical_profit / total_revenue) * 100 (for comparison)

---

## SQL Implementation Guide

### Step 1: Get All Sales for Customer (Filtered by Date)

```sql
SELECT 
  s.id AS sale_id,
  s.sale_number,
  s.sale_date,
  s.invoice_id,
  i.invoice_number,
  si.item_id,
  si.quantity,
  si.unit_price AS selling_price,
  si.unit,
  it.name AS item_name,
  it.brand AS item_brand,
  cat.name AS item_category
FROM sales s
INNER JOIN sale_items si ON s.id = si.sale_id
INNER JOIN items it ON si.item_id = it.id
LEFT JOIN categories cat ON it.category_id = cat.id
LEFT JOIN invoices i ON s.invoice_id = i.id
WHERE s.customer_id = :customer_id
  AND s.status != 'cancelled'
  AND (:start_date IS NULL OR s.sale_date >= :start_date)
  AND (:end_date IS NULL OR s.sale_date <= :end_date)
ORDER BY s.sale_date ASC, s.id ASC;
```

### Step 2: Get Latest Purchase Price (Current) and Historical Purchase Prices

```sql
-- Get the MOST RECENT purchase price for each item (for current profit calculation)
SELECT 
  pii.item_id,
  pi.id AS purchase_invoice_id,
  pi.invoice_number AS purchase_invoice_number,
  pi.invoice_date AS purchase_date,
  pi.supplier_id,
  s.name AS supplier_name,
  pii.unit_price AS cost_price,
  pii.unit,
  ROW_NUMBER() OVER (PARTITION BY pii.item_id ORDER BY pi.invoice_date DESC, pi.id DESC) AS rn
FROM purchase_invoices pi
INNER JOIN purchase_invoice_items pii ON pi.id = pii.purchase_invoice_id
INNER JOIN suppliers s ON pi.supplier_id = s.id
WHERE pi.status != 'cancelled'
  AND pii.item_id IN (:item_ids)
HAVING rn = 1;  -- Only the latest purchase for each item

-- Get ALL purchase prices for historical lookup (to find cost at time of sale)
SELECT 
  pii.item_id,
  pi.id AS purchase_invoice_id,
  pi.invoice_number AS purchase_invoice_number,
  pi.invoice_date AS purchase_date,
  pi.supplier_id,
  s.name AS supplier_name,
  pii.unit_price AS cost_price,
  pii.unit
FROM purchase_invoices pi
INNER JOIN purchase_invoice_items pii ON pi.id = pii.purchase_invoice_id
INNER JOIN suppliers s ON pi.supplier_id = s.id
WHERE pi.status != 'cancelled'
  AND pii.item_id IN (:item_ids)
ORDER BY pii.item_id, pi.invoice_date DESC, pi.id DESC;
-- Note: Ordered DESC to get latest first for each item
```

### Step 3: Latest Cost with Historical Tracking Logic (Application Layer)

**Important**: This is best implemented in application code (PHP/Python) rather than pure SQL, as it requires looking up historical costs.

**Pseudocode**:
```python
def calculate_stock_profit(customer_id, start_date=None, end_date=None):
    # 1. Get all sales for customer
    sales = get_customer_sales(customer_id, start_date, end_date)
    
    # 2. Get latest purchase price for each item (for current profit calculation)
    latest_purchases = get_latest_purchase_prices()  # {item_id: {cost_price, purchase_invoice_id, ...}}
    
    # 3. Get all purchase history (for historical cost lookup)
    purchase_history = get_all_purchase_history()  # {item_id: [{date, cost_price, ...}, ...]}
    
    transactions = []
    item_totals = {}  # {item_id: {...totals...}}
    
    # 4. Process each sale item
    for sale in sales:
        for sale_item in sale.items:
            item_id = sale_item.item_id
            sale_date = sale_item.sale_date
            quantity = sale_item.quantity
            selling_price = sale_item.unit_price
            
            # Get CURRENT latest cost (for profit calculation)
            latest_purchase = latest_purchases.get(item_id)
            if not latest_purchase:
                # Fallback: use item.last_purchase_price or skip
                continue
            
            current_cost_price = latest_purchase['cost_price']
            
            # Get HISTORICAL cost (what was the latest purchase price at time of sale)
            historical_purchase = get_latest_purchase_at_date(
                purchase_history.get(item_id, []), 
                sale_date
            )
            
            if not historical_purchase:
                # If no purchase before sale date, use current cost as fallback
                historical_cost_price = current_cost_price
                historical_purchase = latest_purchase
            else:
                historical_cost_price = historical_purchase['cost_price']
            
            # Calculate profit using CURRENT latest cost
            total_cost = quantity * current_cost_price
            total_revenue = quantity * selling_price
            profit = total_revenue - total_cost
            profit_margin = (profit / total_revenue * 100) if total_revenue > 0 else 0
            
            # Calculate historical profit (what it was at time of sale)
            historical_total_cost = quantity * historical_cost_price
            historical_profit = total_revenue - historical_total_cost
            historical_profit_margin = (historical_profit / total_revenue * 100) if total_revenue > 0 else 0
            
            # Store transaction with both current and historical data
            transactions.append({
                'sale_id': sale.id,
                'sale_number': sale.sale_number,
                'invoice_id': sale.invoice_id,
                'invoice_number': sale.invoice_number,
                'item_id': item_id,
                'item_name': sale_item.item_name,
                'item_brand': sale_item.item_brand,
                'quantity': quantity,
                'unit': sale_item.unit,
                'cost_price': current_cost_price,  # Latest cost (for current profit)
                'historical_cost_price': historical_cost_price,  # Cost at time of sale
                'selling_price': selling_price,
                'total_cost': total_cost,
                'total_revenue': total_revenue,
                'profit': profit,  # Current profit calculation
                'historical_profit': historical_profit,  # Profit at time of sale
                'profit_margin_percentage': profit_margin,
                'historical_profit_margin_percentage': historical_profit_margin,
                'sale_date': sale_date,
                'purchase_invoice_id': historical_purchase.get('purchase_invoice_id'),
                'purchase_invoice_number': historical_purchase.get('purchase_invoice_number'),
                'supplier_id': historical_purchase.get('supplier_id'),
                'supplier_name': historical_purchase.get('supplier_name'),
            })
            
            # Aggregate by item
            if item_id not in item_totals:
                item_totals[item_id] = {
                    'item_id': item_id,
                    'item_name': sale_item.item_name,
                    'item_brand': sale_item.item_brand,
                    'item_category': sale_item.item_category,
                    'total_quantity_sold': 0,
                    'total_cost': 0,
                    'total_historical_cost': 0,
                    'total_revenue': 0,
                    'transactions_count': 0,
                    'last_sale_date': None
                }
            
            item_totals[item_id]['total_quantity_sold'] += quantity
            item_totals[item_id]['total_cost'] += total_cost  # Using current cost
            item_totals[item_id]['total_historical_cost'] += historical_total_cost  # Historical cost
            item_totals[item_id]['total_revenue'] += total_revenue
            item_totals[item_id]['transactions_count'] += 1
            if not item_totals[item_id]['last_sale_date'] or sale_date > item_totals[item_id]['last_sale_date']:
                item_totals[item_id]['last_sale_date'] = sale_date
    
    # Calculate item-level averages
    items = []
    for item_id, totals in item_totals.items():
        avg_cost = totals['total_cost'] / totals['total_quantity_sold'] if totals['total_quantity_sold'] > 0 else 0
        avg_historical_cost = totals['total_historical_cost'] / totals['total_quantity_sold'] if totals['total_quantity_sold'] > 0 else 0
        avg_selling = totals['total_revenue'] / totals['total_quantity_sold'] if totals['total_quantity_sold'] > 0 else 0
        profit = totals['total_revenue'] - totals['total_cost']  # Current profit
        historical_profit = totals['total_revenue'] - totals['total_historical_cost']  # Historical profit
        margin = (profit / totals['total_revenue'] * 100) if totals['total_revenue'] > 0 else 0
        
        items.append({
            **totals,
            'average_cost_price': avg_cost,  # Current average cost
            'average_historical_cost_price': avg_historical_cost,  # Historical average cost
            'average_selling_price': avg_selling,
            'total_profit': profit,  # Current profit
            'total_historical_profit': historical_profit,  # Historical profit
            'profit_margin_percentage': margin
        })
    
    # Calculate overall totals
    total_cost = sum(item['total_cost'] for item in items)
    total_historical_cost = sum(item['total_historical_cost'] for item in items)
    total_revenue = sum(item['total_revenue'] for item in items)
    total_profit = total_revenue - total_cost  # Current profit
    total_historical_profit = total_revenue - total_historical_cost  # Historical profit
    overall_margin = (total_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    return {
        'customer_id': customer_id,
        'customer_name': get_customer_name(customer_id),
        'total_items_sold': len(items),
        'total_quantity_sold': sum(item['total_quantity_sold'] for item in items),
        'total_cost': total_cost,  # Using latest costs
        'total_revenue': total_revenue,
        'total_profit': total_profit,  # Current profit
        'total_historical_profit': total_historical_profit,  # Historical profit for comparison
        'overall_profit_margin': overall_margin,
        'items': items,
        'transactions': transactions,
        'period_start': start_date,
        'period_end': end_date
    }

def get_latest_purchase_at_date(purchase_list, target_date):
    """Get the most recent purchase that occurred on or before target_date"""
    # Filter purchases on or before sale date, then get the latest one
    valid_purchases = [p for p in purchase_list if p['purchase_date'] <= target_date]
    if not valid_purchases:
        return None
    # Sort by date descending and return the first (latest)
    return sorted(valid_purchases, key=lambda x: (x['purchase_date'], x.get('id', 0)), reverse=True)[0]
```

---

## Important Notes

### 1. **Handling Missing Purchase Data**

If a sale item cannot be matched to a purchase (e.g., item was purchased before system implementation):
- **Option A**: Use `item.last_purchase_price` as fallback cost price
- **Option B**: Exclude from profit calculation (show warning)
- **Option C**: Use average cost price from available purchases for that item

**Recommendation**: Use Option A with a flag indicating estimated cost.

### 2. **Date Filtering**

- Filter sales by `sale_date` (not purchase date)
- Include all purchases that could have been used for those sales (even if purchase date is before `start_date`)

### 3. **Unit Conversion**

Ensure units match between purchases and sales. If different:
- Convert to a common unit (e.g., convert "kg" to "bags" using item conversion factors)
- Or track unit conversions in the allocation logic

### 4. **Performance Considerations**

- For large datasets, consider caching purchase batch availability
- Index on `sales.customer_id`, `sales.sale_date`, `sale_items.item_id`
- Index on `purchase_invoices.invoice_date`, `purchase_invoice_items.item_id`

### 5. **Edge Cases**

- **Negative Stock**: If sales exceed purchases (shouldn't happen, but handle gracefully)
- **Zero Cost**: If cost_price is 0, profit = revenue (100% margin)
- **Cancelled Purchases**: Exclude cancelled purchase invoices from allocation
- **Returned Items**: Handle sale returns/refunds (deduct from profit calculation)

---

## Example Calculation

**Scenario**:
- Customer: John Doe (ID: 1)
- Item: Portland Cement 50kg (ID: 1)
- Period: December 2025

**Purchase History**:
1. Dec 1: Purchased 20 bags @ PKR 1,300/bag (Invoice #PINV-001)
2. Dec 15: Purchased 30 bags @ PKR 1,400/bag (Invoice #PINV-002)

**Sale History**:
1. Dec 20: Sold 5 bags @ PKR 1,500/bag (Sale #SAL-001)
2. Dec 22: Sold 25 bags @ PKR 1,500/bag (Sale #SAL-002)

**Calculation**:

**Transaction 1 (Dec 20, 5 bags)**:
- Cost: 5 × 1,300 = PKR 6,500 (from PINV-001)
- Revenue: 5 × 1,500 = PKR 7,500
- Profit: PKR 1,000
- Margin: 13.33%

**Transaction 2 (Dec 22, 25 bags)**:
- Cost: 15 × 1,300 + 10 × 1,400 = PKR 33,500 (15 from PINV-001, 10 from PINV-002)
- Revenue: 25 × 1,500 = PKR 37,500
- Profit: PKR 4,000
- Margin: 10.67%

**Item Summary**:
- Total Quantity: 30 bags
- Average Cost: (6,500 + 33,500) / 30 = PKR 1,333.33/bag
- Average Selling: PKR 1,500/bag
- Total Cost: PKR 40,000
- Total Revenue: PKR 45,000
- Total Profit: PKR 5,000
- Profit Margin: 11.11%

---

## Testing Checklist

- [ ] Test with single purchase batch
- [ ] Test with multiple purchase batches (FIFO allocation)
- [ ] Test with date filtering
- [ ] Test with items that have no purchase history (fallback handling)
- [ ] Test with cancelled purchases (should be excluded)
- [ ] Test with different units (unit conversion)
- [ ] Test with large quantities spanning multiple batches
- [ ] Test performance with 1000+ transactions
- [ ] Test edge case: sales exceed purchases
- [ ] Test edge case: zero cost price

---

## Related Endpoints

- `GET /api/customers/{id}/earnings-stats` - Revenue/earnings statistics
- `GET /api/customers/{id}/delivery-profitability-stats` - Delivery profit (maintenance costs)

---

## Frontend Integration

The frontend component `CustomerStockProfit.tsx` expects this exact response structure. Ensure the backend matches the interface definitions in the component.

