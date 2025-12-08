# Reorder Level Management API Documentation

## Overview

This API allows management of reorder levels for inventory items. The reorder level (also called reorder point) is the minimum stock threshold that triggers low stock alerts. When an item's `quantity_on_hand` falls to or below the `reorder_level`, it appears in the "Low Stock Alerts" section.

**Base URL:** `/api`

**Authentication:** All endpoints require Bearer token authentication (`auth:sanctum`)

---

## Table of Contents

1. [Update Reorder Level (Single Item)](#1-update-reorder-level-single-item)
2. [Bulk Update Reorder Levels](#2-bulk-update-reorder-levels)
3. [Suggest Reorder Level](#3-suggest-reorder-level)
4. [Stock Status Logic](#stock-status-logic)
5. [Error Responses](#error-responses)

---

## 1. Update Reorder Level (Single Item)

Update the reorder level for a single item.

### Endpoint

```
PATCH /api/stock/item/{item_id}/reorder-level
```

### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `item_id` | integer | Yes | The ID of the item |

### Request Body

```json
{
  "reorder_level": 50
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `reorder_level` | number | Yes | >= 0 | The new reorder level threshold |

### Success Response (200 OK)

```json
{
  "stock": {
    "id": 1,
    "item_id": 9,
    "item": {
      "id": 9,
      "serial_number": "CONSTR-000008",
      "name": "Cement",
      "primary_unit": "Bags",
      "secondary_unit": "Kg",
      "conversion_rate": 50.0000
    },
    "quantity_on_hand": "24.0000",
    "reorder_level": "50.0000",
    "stock_value": "240000.00",
    "stock_status": "low_stock",
    "last_restocked_at": "2025-12-08T10:30:00Z",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-12-08T15:45:00Z"
  },
  "message": "Reorder level updated successfully"
}
```

### Error Responses

**404 Not Found** - Item stock not found
```json
{
  "message": "No query results for model [App\\Models\\ItemStock]."
}
```

**422 Unprocessable Entity** - Validation error
```json
{
  "message": "The reorder level field is required.",
  "errors": {
    "reorder_level": [
      "The reorder level field is required."
    ]
  }
}
```

### Example Usage

#### cURL
```bash
curl -X PATCH "http://localhost:8000/api/stock/item/9/reorder-level" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reorder_level": 50
  }'
```

#### JavaScript (Fetch)
```javascript
const response = await fetch(`/api/stock/item/${itemId}/reorder-level`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  body: JSON.stringify({
    reorder_level: 50
  })
});

const data = await response.json();
```

---

## 2. Bulk Update Reorder Levels

Update reorder levels for multiple items in a single request. This is useful for batch operations.

### Endpoint

```
PATCH /api/stock/reorder-levels/bulk
```

### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

### Request Body

```json
{
  "updates": [
    {
      "item_id": 9,
      "reorder_level": 50
    },
    {
      "item_id": 10,
      "reorder_level": 100
    },
    {
      "item_id": 11,
      "reorder_level": 75
    }
  ]
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `updates` | array | Yes | min:1 | Array of update objects |
| `updates[].item_id` | integer | Yes | exists:items,id | The ID of the item to update |
| `updates[].reorder_level` | number | Yes | >= 0 | The new reorder level |

### Success Response (200 OK)

All updates successful:

```json
{
  "updated_count": 3,
  "errors": [],
  "message": "Reorder levels updated for 3 item(s)"
}
```

### Partial Success Response (207 Multi-Status)

Some updates succeeded, some failed:

```json
{
  "updated_count": 2,
  "errors": [
    "Stock record not found for item_id: 999"
  ],
  "message": "Reorder levels updated for 2 item(s). Some updates failed."
}
```

### Error Responses

**422 Unprocessable Entity** - Validation error
```json
{
  "message": "The updates field is required.",
  "errors": {
    "updates": [
      "The updates field is required."
    ]
  }
}
```

**422 Unprocessable Entity** - Invalid item_id
```json
{
  "message": "The updates.0.item_id does not exist.",
  "errors": {
    "updates.0.item_id": [
      "The selected updates.0.item_id is invalid."
    ]
  }
}
```

### Example Usage

#### cURL
```bash
curl -X PATCH "http://localhost:8000/api/stock/reorder-levels/bulk" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {
        "item_id": 9,
        "reorder_level": 50
      },
      {
        "item_id": 10,
        "reorder_level": 100
      }
    ]
  }'
```

#### JavaScript (Fetch)
```javascript
const response = await fetch('/api/stock/reorder-levels/bulk', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  body: JSON.stringify({
    updates: [
      { item_id: 9, reorder_level: 50 },
      { item_id: 10, reorder_level: 100 },
      { item_id: 11, reorder_level: 75 }
    ]
  })
});

const data = await response.json();
```

---

## 3. Suggest Reorder Level

Get a smart suggestion for optimal reorder level based on sales history from the last 30 days.

### Endpoint

```
POST /api/stock/item/{item_id}/suggest-reorder-level
```

### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `item_id` | integer | Yes | The ID of the item |

### Request Body (Optional)

```json
{
  "lead_time_days": 7,
  "safety_stock_percentage": 20
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `lead_time_days` | integer | No | 7 | Days to receive stock from supplier |
| `safety_stock_percentage` | integer | No | 20 | Buffer percentage to prevent stockouts |

### Formula

```
Reorder Level = (Average Daily Sales × Lead Time) + Safety Stock
```

Where:
- **Average Daily Sales** = Total sales in last 30 days ÷ 30
- **Lead Time Demand** = Average Daily Sales × Lead Time Days
- **Safety Stock** = Lead Time Demand × (Safety Stock Percentage / 100)

### Success Response (200 OK)

With sales history:

```json
{
  "item": {
    "id": 9,
    "serial_number": "CONSTR-000008",
    "name": "Cement",
    "primary_unit": "Bags"
  },
  "suggested_reorder_level": 42,
  "calculation": {
    "average_daily_sales": 5.0,
    "lead_time_days": 7,
    "safety_stock_percentage": 20,
    "lead_time_demand": 35.0,
    "safety_stock": 7.0,
    "total_sold_last_30_days": 150,
    "sales_records_count": 15
  },
  "message": "Based on sales history from the last 30 days"
}
```

Without sales history:

```json
{
  "item": {
    "id": 12,
    "serial_number": "CONSTR-000011",
    "name": "Bricks",
    "primary_unit": "Pieces"
  },
  "suggested_reorder_level": 10,
  "calculation": {
    "average_daily_sales": 0,
    "lead_time_days": 7,
    "safety_stock_percentage": 20,
    "lead_time_demand": 0,
    "safety_stock": 0,
    "total_sold_last_30_days": 0,
    "sales_records_count": 0
  },
  "message": "No sales history available. Using default minimal reorder level."
}
```

### Error Responses

**404 Not Found** - Item not found
```json
{
  "message": "No query results for model [App\\Models\\Item] 999"
}
```

### Example Usage

#### cURL (with defaults)
```bash
curl -X POST "http://localhost:8000/api/stock/item/9/suggest-reorder-level" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

#### cURL (with custom parameters)
```bash
curl -X POST "http://localhost:8000/api/stock/item/9/suggest-reorder-level" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_time_days": 14,
    "safety_stock_percentage": 30
  }'
```

#### JavaScript (Fetch)
```javascript
const response = await fetch(`/api/stock/item/${itemId}/suggest-reorder-level`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  body: JSON.stringify({
    lead_time_days: 7,
    safety_stock_percentage: 20
  })
});

const data = await response.json();

// Use the suggestion
console.log(`Suggested reorder level: ${data.suggested_reorder_level}`);
console.log(`Based on ${data.calculation.total_sold_last_30_days} units sold in last 30 days`);
```

### Workflow Example

1. **Get Suggestion**
```javascript
// Step 1: Get suggestion
const suggestion = await fetch(`/api/stock/item/9/suggest-reorder-level`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log(`Suggested: ${suggestion.suggested_reorder_level}`);
```

2. **Apply Suggestion**
```javascript
// Step 2: Apply the suggested reorder level
const update = await fetch(`/api/stock/item/9/reorder-level`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reorder_level: suggestion.suggested_reorder_level
  })
}).then(r => r.json());

console.log(update.message); // "Reorder level updated successfully"
```

---

## Stock Status Logic

Stock status is automatically determined based on the relationship between `quantity_on_hand` and `reorder_level`:

| Status | Condition | Badge Color | Priority |
|--------|-----------|-------------|----------|
| `out_of_stock` | `quantity_on_hand = 0` | Red | Critical |
| `low_stock` | `quantity_on_hand <= reorder_level AND quantity_on_hand > 0` | Yellow | Warning |
| `in_stock` | `quantity_on_hand > reorder_level` | Green | Normal |

### Example Status Transitions

```
Item: Cement
Reorder Level: 50 bags

Scenario 1: Stock = 0 bags
→ Status: out_of_stock (Critical)

Scenario 2: Stock = 24 bags
→ Status: low_stock (24 <= 50)

Scenario 3: Stock = 100 bags
→ Status: in_stock (100 > 50)
```

---

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "message": "Error description",
  "errors": {
    "field_name": [
      "Specific error message"
    ]
  }
}
```

### Common HTTP Status Codes

| Status Code | Meaning | When It Occurs |
|-------------|---------|----------------|
| 200 | OK | Request successful |
| 207 | Multi-Status | Bulk operation with partial success |
| 401 | Unauthorized | Invalid or missing authentication token |
| 403 | Forbidden | User lacks required permissions |
| 404 | Not Found | Item or stock record not found |
| 422 | Unprocessable Entity | Validation failed |
| 500 | Internal Server Error | Unexpected server error |

---

## Complete Integration Example

### React Component Example

```typescript
// hooks/useReorderLevel.ts
import { useState } from 'react';

interface ReorderLevelSuggestion {
  suggested_reorder_level: number;
  calculation: {
    average_daily_sales: number;
    total_sold_last_30_days: number;
    sales_records_count: number;
  };
  message: string;
}

export const useReorderLevel = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateReorderLevel = async (itemId: number, reorderLevel: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/stock/item/${itemId}/reorder-level`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reorder_level: reorderLevel })
      });

      if (!response.ok) throw new Error('Failed to update reorder level');
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSuggestion = async (
    itemId: number,
    leadTimeDays = 7,
    safetyStockPercentage = 20
  ): Promise<ReorderLevelSuggestion> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/stock/item/${itemId}/suggest-reorder-level`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          lead_time_days: leadTimeDays,
          safety_stock_percentage: safetyStockPercentage 
        })
      });

      if (!response.ok) throw new Error('Failed to get suggestion');
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const bulkUpdate = async (updates: Array<{ item_id: number; reorder_level: number }>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stock/reorder-levels/bulk', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) throw new Error('Failed to bulk update');
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateReorderLevel,
    getSuggestion,
    bulkUpdate,
    loading,
    error
  };
};
```

### Usage in Component

```tsx
import React, { useState } from 'react';
import { useReorderLevel } from './hooks/useReorderLevel';

const ReorderLevelManager = ({ item }) => {
  const [reorderLevel, setReorderLevel] = useState(item.reorder_level);
  const { updateReorderLevel, getSuggestion, loading } = useReorderLevel();

  const handleGetSuggestion = async () => {
    const suggestion = await getSuggestion(item.id);
    setReorderLevel(suggestion.suggested_reorder_level);
    
    // Show details to user
    alert(`Suggested: ${suggestion.suggested_reorder_level}\n${suggestion.message}`);
  };

  const handleUpdate = async () => {
    await updateReorderLevel(item.id, reorderLevel);
    alert('Reorder level updated successfully!');
  };

  return (
    <div className="reorder-level-manager">
      <label>
        Reorder Level:
        <input
          type="number"
          value={reorderLevel}
          onChange={(e) => setReorderLevel(Number(e.target.value))}
          min="0"
        />
      </label>
      
      <button onClick={handleGetSuggestion} disabled={loading}>
        Get Smart Suggestion
      </button>
      
      <button onClick={handleUpdate} disabled={loading}>
        Update
      </button>
    </div>
  );
};
```

---

## Testing Checklist

### Backend Tests

- [x] Can update reorder level for a single item
- [x] Reorder level cannot be negative
- [x] Stock status updates correctly after changing reorder level
- [x] Low stock alerts include items where `quantity_on_hand <= reorder_level`
- [x] Out of stock alerts show items with `quantity_on_hand = 0`
- [x] Decimal precision is maintained (4 decimal places)
- [x] Bulk update successfully updates multiple items
- [x] Bulk update handles partial failures gracefully
- [x] Suggest reorder level calculates correctly with sales history
- [x] Suggest reorder level returns default when no sales history

### Frontend Tests

- [ ] Reorder level displays without trailing zeros (e.g., "50" not "50.0000")
- [ ] Can edit reorder level inline in stock table
- [ ] Low Stock Alerts tab shows items correctly
- [ ] Stock status badge updates in real-time after reorder level change
- [ ] Toast notification confirms successful update
- [ ] Suggestion dialog shows calculation details
- [ ] Bulk update UI handles multiple selections

---

## Best Practices

### 1. Setting Reorder Levels

- Use the **suggest endpoint** to get data-driven recommendations
- Consider **seasonal variations** in sales
- Factor in **supplier reliability** when setting lead time
- Review and adjust reorder levels **quarterly**

### 2. Bulk Updates

- Update similar items together (same category, supplier, etc.)
- Use bulk updates for **initial setup** of new items
- Limit bulk requests to **50 items maximum** for performance

### 3. Smart Suggestions

- Run suggestions **after major sales events**
- Compare suggestions with **current levels** before applying
- Use higher safety stock (30-50%) for **critical items**
- Use standard safety stock (20%) for **regular items**

### 4. Monitoring

- Set up **automated alerts** for low stock items
- Review items that **frequently** hit reorder level
- Track **stockout incidents** to adjust reorder levels
- Monitor **lead time accuracy** and adjust parameters

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-08 | Initial release with single, bulk, and smart suggestion endpoints |

---

## Support

For questions or issues, please contact the development team or create an issue in the project repository.

**Last Updated:** December 8, 2025
