
## 3. Item Stock Value Analytics
**Endpoint**: `GET /api/stock/analytics/value-by-item`

**Description**: Retrieve top items by total stock value (Inventory Valuation).

**Query Parameters**:
- `limit`: number (default: 10, max: 50)

**Response Structure**:
```json
{
  "data": [
    {
      "item_id": 12,
      "item_name": "Cement Bag (50kg)",
      "stock_value": 150000.00,
      "quantity_on_hand": 100,
      "unit": "bag"
    }
    // ... sorted by stock_value desc
  ],
  "summary": {
    "total_value": 1500000.00, // Total of ALL items, not just top N
    "total_items": 450
  }
}
```
