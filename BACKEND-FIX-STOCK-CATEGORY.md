# Backend Fix Required: Stock API Missing Category Data

## Issue

The Stock Management page cannot display item categories because the backend API `/api/stock` endpoint is **not returning the category relationship** in the item object.

### Current Behavior

When calling `GET /api/stock`, the API returns:

```json
{
  "stock": [
    {
      "id": 1,
      "item_id": 1,
      "item": {
        "id": 1,
        "serial_number": "CONST-000001",
        "name": "Portland Cement 50kg",
        "brand": "Fauji",
        "category_id": 1,
        // ❌ category object is MISSING
        "picture_url": null,
        "selling_price": "1200.00",
        // ... other fields
      },
      "quantity_on_hand": "450.0000",
      // ... other fields
    }
  ]
}
```

### Expected Behavior (Per Documentation)

According to `docs/STOCK-MANAGEMENT-BACKEND-PROMPT.md` (lines 234-239), the API **should** return:

```json
{
  "stock": [
    {
      "id": 1,
      "item_id": 1,
      "item": {
        "id": 1,
        "serial_number": "CONST-000001",
        "name": "Portland Cement 50kg",
        "brand": "Fauji",
        "category_id": 1,
        "category": {  // ✅ Should include category object
          "id": 1,
          "name": "Construction Material",
          "alias": "CONST"
        },
        "picture_url": null,
        // ... other fields
      },
      // ... other fields
    }
  ]
}
```

## Root Cause

The Laravel backend `StockController` is not eager loading the `category` relationship when fetching stock items.

## Required Fix

### File: `app/Http/Controllers/StockController.php`

**In the `index()` method** (which handles `GET /api/stock`), the query needs to eager load the category relationship:

#### ❌ Current Code (Incorrect):
```php
public function index(Request $request)
{
    $query = Stock::with(['item']); // Only loads item, not category
    
    // ... filters and pagination ...
    
    return response()->json([
        'stock' => $stock,
        'pagination' => $pagination
    ]);
}
```

#### ✅ Fixed Code:
```php
public function index(Request $request)
{
    // Add 'item.category' to eager load the category relationship
    $query = Stock::with(['item.category']);
    
    // ... filters and pagination ...
    
    return response()->json([
        'stock' => $stock,
        'pagination' => $pagination
    ]);
}
```

### Additional Methods to Fix

The same eager loading fix is needed for these methods:

1. **`getItemStock()`** - `GET /api/stock/item/{item_id}`
   ```php
   Stock::with(['item.category'])->where('item_id', $itemId)->firstOrFail();
   ```

2. **`getLowStockAlerts()`** - `GET /api/stock/alerts` (if this method exists)
   ```php
   Stock::with(['item.category'])->where('quantity_on_hand', '<=', 'reorder_level')->get();
   ```

## Impact

Without this fix, the following frontend pages cannot display categories:
- ✅ Stock Management > Inventory Overview tab
- ✅ Stock Management > Low Stock Alerts tab
- ✅ Any other page that displays stock items with categories

## Testing

After implementing the fix, verify:

1. Call `GET /api/stock` and confirm `category` object is present in each `item`
2. Check the Stock Management page in the frontend - the Category column should display category names instead of "—"
3. Verify Low Stock Alerts page also shows categories correctly

## Priority

**HIGH** - This affects user experience as users cannot filter or view items by category in stock management.

---

**Date Reported:** December 8, 2025  
**Reported By:** Frontend Team  
**Status:** Pending Backend Fix
