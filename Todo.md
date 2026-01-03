# Purchase Order Trends Chart - Backend Requirements

## Overview

The Buying page displays a "Purchase Order Trends" area chart showing monthly purchase order amounts over the last 12 months. Currently, the frontend uses mock data and needs a backend API endpoint to fetch real-time aggregated purchase order data.

---

## API Endpoint Requirements

### Endpoint: GET `/purchase-orders/trends`

**Purpose:** Get monthly aggregated purchase order amounts for the trends chart.

**Authentication:** Required (standard Bearer token)

**Query Parameters (Optional):**
- `start_date` (string, optional, format: YYYY-MM-DD): Start date for the trend period (default: 12 months ago from today)
- `end_date` (string, optional, format: YYYY-MM-DD): End date for the trend period (default: today)
- `period_type` (string, optional): Aggregation period - "monthly" (default), "weekly", "quarterly", "yearly"
- `supplier_id` (integer, optional): Filter by specific supplier
- `status` (string, optional): Filter by purchase order status ('draft', 'sent', 'partial', 'received', 'cancelled')

**Response Structure:**

```json
{
  "data": [
    {
      "period": "2025-07",
      "month_abbr": "Jul",
      "value": 552247.00,
      "count": 5
    },
    {
      "period": "2025-08",
      "month_abbr": "Aug",
      "value": 0.00,
      "count": 0
    },
    {
      "period": "2025-09",
      "month_abbr": "Sep",
      "value": 0.00,
      "count": 0
    },
    {
      "period": "2025-10",
      "month_abbr": "Oct",
      "value": 0.00,
      "count": 0
    },
    {
      "period": "2025-11",
      "month_abbr": "Nov",
      "value": 0.00,
      "count": 0
    },
    {
      "period": "2025-12",
      "month_abbr": "Dec",
      "value": 0.00,
      "count": 0
    },
    {
      "period": "2026-01",
      "month_abbr": "Jan",
      "value": 0.00,
      "count": 0
    },
    {
      "period": "2026-02",
      "month_abbr": "Feb",
      "value": 0.00,
      "count": 0
    },
    {
      "period": "2026-03",
      "month_abbr": "Mar",
      "value": 0.00,
      "count": 0
    },
    {
      "period": "2026-04",
      "month_abbr": "Apr",
      "value": 0.00,
      "count": 0
    },
    {
      "period": "2026-05",
      "month_abbr": "May",
      "value": 0.00,
      "count": 0
    },
    {
      "period": "2026-06",
      "month_abbr": "Jun",
      "value": 0.00,
      "count": 0
    }
  ],
  "summary": {
    "total_amount": 552247.00,
    "total_orders": 5,
    "average_order_value": 110449.40,
    "period_start": "2025-07-01",
    "period_end": "2026-06-30"
  },
  "generated_at": "2026-01-15T10:30:00Z"
}
```

### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | Array of monthly purchase order aggregations |
| `data[].period` | string | Period identifier in YYYY-MM format (e.g., "2025-07") |
| `data[].month_abbr` | string | Month abbreviation (Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec) |
| `data[].value` | number | Total purchase order amount for this month (sum of `purchase_orders.total`) |
| `data[].count` | integer | Number of purchase orders in this month |
| `summary.total_amount` | number | Total purchase order amount across all periods |
| `summary.total_orders` | integer | Total number of purchase orders |
| `summary.average_order_value` | number | Average purchase order value |
| `summary.period_start` | string | Start date of the period (YYYY-MM-DD) |
| `summary.period_end` | string | End date of the period (YYYY-MM-DD) |
| `generated_at` | string | Timestamp when the report was generated (ISO 8601) |

---

## Data Calculation Logic

### Purchase Order Amount Calculation

For each month, calculate:
1. **Total Amount:** Sum of `purchase_orders.total` for all purchase orders with `order_date` in that month
   - Formula: `SUM(purchase_orders.total)` WHERE `DATE_FORMAT(order_date, '%Y-%m') = period`
   - Use `purchase_orders.total` field (includes subtotal, tax, discount)

2. **Order Count:** Count of purchase orders in that month
   - Formula: `COUNT(purchase_orders.id)` WHERE `DATE_FORMAT(order_date, '%Y-%m') = period`

### Monthly Period Generation

- Generate data for the last 12 months (default behavior)
- Include all 12 months even if no purchase orders exist (value = 0, count = 0)
- Months should be ordered chronologically (oldest to newest)
- Month abbreviations should match standard English abbreviations (Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec)

### SQL Query Example (Pseudo-code)

```sql
-- Generate last 12 months
WITH months AS (
  SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS period,
         DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%b') AS month_abbr
  FROM (
    SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
    SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
  ) months
)
SELECT 
  m.period,
  m.month_abbr,
  COALESCE(SUM(po.total), 0) AS value,
  COALESCE(COUNT(po.id), 0) AS count
FROM months m
LEFT JOIN purchase_orders po 
  ON DATE_FORMAT(po.order_date, '%Y-%m') = m.period
  AND po.status != 'cancelled'  -- Exclude cancelled orders
  AND (po.supplier_id = :supplier_id OR :supplier_id IS NULL)
  AND (po.status = :status OR :status IS NULL)
GROUP BY m.period, m.month_abbr
ORDER BY m.period ASC;
```

---

## Business Rules

1. **Order Date:** Use `purchase_orders.order_date` to determine which month a purchase order belongs to
2. **Cancelled Orders:** Exclude purchase orders with `status = 'cancelled'` from calculations (unless explicitly requested)
3. **Amount Field:** Use `purchase_orders.total` field (already includes subtotal, tax, and discount)
4. **Month Format:** Month abbreviations should be 3-letter uppercase (JUL, AUG, etc.) - frontend will handle formatting
5. **Zero Values:** Include months with zero purchase orders (value = 0, count = 0) to maintain chart continuity
6. **Date Range:** Default to last 12 months if `start_date` and `end_date` are not provided
7. **Precision:** Purchase order amounts should be returned with 2 decimal places

---

## Filtering Options

### By Supplier
- If `supplier_id` is provided, filter purchase orders by `purchase_orders.supplier_id`
- Useful for supplier-specific trend analysis

### By Status
- If `status` is provided, filter purchase orders by `purchase_orders.status`
- Valid values: 'draft', 'sent', 'partial', 'received', 'cancelled'
- By default, exclude 'cancelled' orders

### By Date Range
- If `start_date` and `end_date` are provided, generate periods for that range
- If only one date is provided, use default range
- Ensure all months in the range are included (even with zero values)

---

## Error Handling

**400 Bad Request:**
- Invalid date format
- Invalid status value
- Invalid supplier_id

**401 Unauthorized:**
- Missing or invalid authentication token

**500 Internal Server Error:**
- Database errors
- Calculation errors

**Response Format for Errors:**
```json
{
  "message": "Error description",
  "errors": {
    "field_name": ["Error detail"]
  }
}
```

---

## Frontend Integration

The frontend component `PurchaseOrderTrendsChart.tsx` expects:

1. **Data Format:** Array of objects with `month` (string) and `value` (number) properties
2. **Month Format:** Frontend will format as "{month_abbr} (Amt)" (e.g., "Jul (Amt)")
3. **Mapping:** Frontend will map:
   - `month_abbr` → `month` (with "(Amt)" suffix added)
   - `value` → `value`
4. **Chart Type:** Area chart with pink gradient fill
5. **Y-Axis:** Automatically scales based on max value (default domain 0-600000, but will adjust)

**Frontend API Call (to be implemented):**
```typescript
// In app/lib/apiClient.ts
async getPurchaseOrderTrends(params?: {
  start_date?: string;
  end_date?: string;
  period_type?: "monthly" | "weekly" | "quarterly" | "yearly";
  supplier_id?: number;
  status?: string;
}): Promise<{
  data: Array<{
    period: string;
    month_abbr: string;
    value: number;
    count: number;
  }>;
  summary: {
    total_amount: number;
    total_orders: number;
    average_order_value: number;
    period_start: string;
    period_end: string;
  };
  generated_at: string;
}> {
  const queryParams = new URLSearchParams();
  if (params?.start_date) queryParams.append("start_date", params.start_date);
  if (params?.end_date) queryParams.append("end_date", params.end_date);
  if (params?.period_type) queryParams.append("period_type", params.period_type);
  if (params?.supplier_id) queryParams.append("supplier_id", String(params.supplier_id));
  if (params?.status) queryParams.append("status", params.status);
  
  const queryString = queryParams.toString();
  const url = `/purchase-orders/trends${queryString ? `?${queryString}` : ""}`;
  
  return await apiClient.get(url);
}
```

---

## Testing Scenarios

### Test Case 1: Basic Monthly Aggregation
- **Setup:** Multiple purchase orders across different months
- **Expected:** Returns all months with aggregated amounts

### Test Case 2: Empty Months
- **Setup:** Some months have no purchase orders
- **Expected:** Includes all months with value = 0 and count = 0

### Test Case 3: Single Month
- **Setup:** All purchase orders in one month
- **Expected:** Returns that month with correct total, all others with zero

### Test Case 4: Filtered by Supplier
- **Setup:** Purchase orders from multiple suppliers
- **Expected:** Only includes purchase orders from specified supplier

### Test Case 5: Filtered by Status
- **Setup:** Purchase orders with different statuses
- **Expected:** Only includes purchase orders with specified status

### Test Case 6: Cancelled Orders
- **Setup:** Purchase orders including cancelled ones
- **Expected:** Cancelled orders excluded by default (value = 0 for those months)

### Test Case 7: Date Range
- **Setup:** Purchase orders across multiple years
- **Expected:** Only includes months within the specified date range

---

## Implementation Checklist

- [ ] Create `/purchase-orders/trends` endpoint
- [ ] Implement SQL query to aggregate purchase orders by month
- [ ] Generate last 12 months (or date range) with zero values for empty months
- [ ] Add query parameter support (start_date, end_date, period_type, supplier_id, status)
- [ ] Calculate summary totals (total_amount, total_orders, average_order_value)
- [ ] Exclude cancelled orders by default
- [ ] Format month abbreviations correctly
- [ ] Sort results chronologically
- [ ] Add error handling and validation
- [ ] Write unit tests for aggregation logic
- [ ] Write integration tests for API endpoint
- [ ] Update API documentation
- [ ] Test with real data

---

## Important Notes

1. **Performance:** Consider adding database indexes on `purchase_orders.order_date` and `purchase_orders.supplier_id` if not already present
2. **Caching:** This endpoint is a good candidate for caching (cache for 5-10 minutes) since purchase order trends don't change frequently
3. **Real-time Updates:** The chart should refresh when new purchase orders are created (frontend will handle refresh)
4. **Consistency:** Ensure `purchase_orders.total` field is always up-to-date and accurate
5. **Month Ordering:** Always return months in chronological order (oldest to newest) for proper chart display

---

## Summary

**Key Points:**
- Endpoint: `GET /purchase-orders/trends`
- Aggregates `purchase_orders.total` by month based on `order_date`
- Returns last 12 months by default (or specified date range)
- Includes all months even with zero values
- Excludes cancelled orders by default
- Supports filtering by supplier and status
- Returns summary statistics (total amount, count, average)
- Month format: 3-letter abbreviation (Jan, Feb, Mar, etc.)

