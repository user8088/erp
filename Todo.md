# Backend Requirements: Item Analytics & Visualizations

## 1. Item Sales Analytics
**Endpoint**: `GET /api/items/{id}/analytics/sales`

**Description**: Retrieve aggregated sales data for graphing and comparative analysis.

**Query Parameters**:
- `period`: `daily` | `weekly` | `monthly` | `yearly` (default: `monthly`)
- `start_date` (optional): Filter start date
- `end_date` (optional): Filter end date

**Response Structure**:
```json
{
  "summary": {
    "total_revenue": 45000.00,
    "total_quantity": 150,
    "revenue_growth": 12.5, // Percentage change from previous equivalent period
    "quantity_growth": 5.2
  },
  "chart_data": [
    {
      "label": "2026-01-01", // Date or Week/Month label
      "revenue": 5000.00,
      "quantity": 20
    },
    // ... more data points
  ]
}
```

## 2. Stock Movement Analytics
**Endpoint**: `GET /api/items/{id}/analytics/stock`

**Description**: Retrieve aggregated stock movement data (incoming vs outgoing) over time.

**Query Parameters**:
- `period`: `daily` | `weekly` | `monthly` (default: `monthly`)

**Response Structure**:
```json
{
  "summary": {
    "current_stock": 450,
    "turnover_rate": 0.8 // Optional: Stock turnover ratio
  },
  "chart_data": [
    {
      "label": "2026-01-01",
      "incoming": 50, // Purchases, Returns, Adjustments (+)
      "outgoing": 30, // Sales, Adjustments (-)
      "net_change": 20
    }
    // ...
  ]
}
```
