# Pricing Logic Explanation

## Overview

The system tracks **two types of prices** for each item:

### 1. **Purchase Prices** (What you PAY suppliers)
- `last_purchase_price`: Most recent price you bought from supplier
- `lowest_purchase_price`: Best (cheapest) price ever paid
- `highest_purchase_price`: Worst (most expensive) price ever paid

### 2. **Selling Price** (What you CHARGE customers)
- `selling_price`: Price at which you sell to customers

---

## Stock Value Calculation

### ⚠️ **IMPORTANT: Stock Value = Revenue Potential, NOT Cost**

```
Stock Value = Quantity On Hand × Selling Price
```

**Example:**
```
Item: Portland Cement 50kg
- Quantity on hand: 450 bags
- Last purchase price: PKR 850/bag (what you paid)
- Selling price: PKR 1200/bag (what you charge)

Stock Value = 450 × 1200 = PKR 540,000
```

### Why Use Selling Price (Not Purchase Price)?

**Stock value represents:** "How much revenue can I generate if I sell all my inventory?"

This is more useful for business decisions because:

1. **Revenue Potential**: Shows what your inventory is worth at current market prices
2. **Realistic Valuation**: Reflects the value customers will pay
3. **Profit Visibility**: Combined with purchase prices, you can see profit margins
4. **Better Decision Making**: Helps decide which products to stock more of

---

## Profit Margin Calculation

```
Profit per Unit = Selling Price - Last Purchase Price
Profit Margin % = ((Selling Price - Purchase Price) / Selling Price) × 100
```

**Example:**
```
Item: Portland Cement
- Purchase price: PKR 850
- Selling price: PKR 1200

Profit per bag: PKR 1200 - 850 = PKR 350
Profit margin: (350 / 1200) × 100 = 29.2%

Total potential profit in stock:
450 bags × PKR 350 = PKR 157,500
```

---

## Complete Example

### Item Setup
```json
{
  "name": "Portland Cement 50kg",
  "last_purchase_price": 850.00,
  "lowest_purchase_price": 820.00,
  "highest_purchase_price": 900.00,
  "selling_price": 1200.00
}
```

### Stock Record
```json
{
  "quantity_on_hand": 450,
  "stock_value": 540000.00
}
```

### Financial Summary
```
Cost Basis (what you paid):
450 bags × PKR 850 = PKR 382,500

Revenue Potential (what you'll earn):
450 bags × PKR 1200 = PKR 540,000

Gross Profit Potential:
PKR 540,000 - PKR 382,500 = PKR 157,500
```

---

## When Stock Value Changes

Stock value is **automatically recalculated** when:

1. **Quantity changes:**
   - Receive new stock (PO)
   - Sell items (invoice)
   - Manual adjustment

2. **Selling price changes:**
   - Update item's selling price
   - All stock value recalculated immediately

**Formula always:** `stock_value = quantity_on_hand × selling_price`

---

## Comparison with Cost-Based Valuation

| Method | Formula | Shows |
|--------|---------|-------|
| **Cost-Based** (Traditional) | qty × purchase_price | What you invested |
| **Revenue-Based** (Our System) | qty × selling_price | What you can earn |

**We use Revenue-Based** because:
- More relevant for decision-making
- Shows true business value
- Better for profit planning
- Accounts for market conditions

---

## UI Display Examples

### Inventory Table
```
Item: Portland Cement 50kg
Quantity: 450 bags
Stock Value: PKR 540,000
(450 bags at selling price of PKR 1200/bag)
```

### Item Detail Page
```
Purchase Prices (Cost):
- Last: PKR 850
- Lowest: PKR 820
- Highest: PKR 900

Selling Price (Revenue): PKR 1200

Profit Margin: PKR 350 per bag (29.2%)

Stock Summary:
- Quantity: 450 bags
- Stock Value (at selling price): PKR 540,000
- Potential Profit: PKR 157,500
```

---

## Backend Implementation Notes

### Database Updates
When **quantity changes** (PO received, stock adjusted):
```php
$itemStock->quantity_on_hand = $newQuantity;
$itemStock->stock_value = $newQuantity * $item->selling_price;
```

When **selling price changes**:
```php
$item->selling_price = $newSellingPrice;
// Automatically trigger stock value recalculation
$itemStock->stock_value = $itemStock->quantity_on_hand * $newSellingPrice;
```

### Important Validations
- `selling_price` should generally be > `last_purchase_price` (to ensure profit)
- System should warn if selling price < purchase price (selling at loss)
- Allow flexibility for clearance sales, promotions, etc.

---

## Summary

✅ **Stock Value = Quantity × Selling Price**  
✅ Represents revenue potential, not cost  
✅ Auto-updates when quantity or selling price changes  
✅ Purchase prices tracked separately for profit analysis  
✅ Both values needed for complete financial picture  
