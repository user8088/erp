# Sales Trends Chart - Backend API Requirements

## Overview

This document outlines the backend API requirements for the Sales Order Trends chart on the Selling dashboard. The chart displays sales revenue trends over time with support for different period groupings (daily, weekly, monthly, quarterly, yearly) and filtering options.

## API Endpoint

```
GET /api/sales/trends
```

**Authentication Required:** Yes (via Sanctum token)  
**Permission Required:** `module.selling.read` (or appropriate selling permissions)

## Request Parameters

### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `company_id` | integer | The company ID for which to generate the trends | `1` |
| `period_type` | string | How to group the data: `"daily"`, `"weekly"`, `"monthly"`, `"quarterly"`, `"yearly"` | `"monthly"` |
| `start_date` | string | Start date of the reporting period (YYYY-MM-DD) | `"2025-01-01"` |
| `end_date` | string | End date of the reporting period (YYYY-MM-DD) | `"2025-12-31"` |

### Optional Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `sale_type` | string | Filter by sale type: `"walk-in"` or `"delivery"`. If omitted, includes all sales | `"walk-in"` |
| `customer_id` | integer | Filter by specific customer ID | `10` |

## Response Structure

### Success Response (200 OK)

```json
{
  "data": [
    {
      "period": "2025-01",
      "value": 349000.00,
      "count": 45
    },
    {
      "period": "2025-02",
      "value": 280000.00,
      "count": 38
    },
    {
      "period": "2025-03",
      "value": 420000.00,
      "count": 52
    }
  ],
  "summary": {
    "total_revenue": 1049000.00,
    "total_sales": 135,
    "average_sale_value": 7770.37
  },
  "generated_at": "2025-01-15T10:30:00Z"
}
```

### Response Fields

#### Data Array
Each object represents aggregated sales for a period:
- `period`: Period label/identifier (format depends on `period_type`)
  - **Daily**: `"2025-01-15"` (YYYY-MM-DD)
  - **Weekly**: `"2025-W03"` (YYYY-Www) or `"Week 3, Jan 2025"`
  - **Monthly**: `"2025-01"` (YYYY-MM) or `"January 2025"`
  - **Quarterly**: `"2025-Q1"` or `"Q1 2025"` or `"Jan-Mar 2025"`
  - **Yearly**: `"2025"` (YYYY)
- `value`: Total sales revenue for this period (sum of sale totals)
- `count`: Number of sales in this period (optional but recommended)

#### Summary Object
Aggregated totals across all periods:
- `total_revenue`: Sum of all sales revenue in the date range
- `total_sales`: Total number of sales in the date range
- `average_sale_value`: Average sale value (total_revenue / total_sales)

## Period Type Behavior

### Daily
- Groups sales by individual days
- Period format: `"YYYY-MM-DD"` (e.g., `"2025-01-15"`)
- Use sale date (`sales.date` or `sales.created_at` date part)
- Example: If date range is Jan 1-31, returns 31 data points (one per day)

### Weekly
- Groups sales by calendar weeks
- Period format: `"YYYY-Www"` (ISO week format) or `"Week w, Month YYYY"`
- Week starts on Monday (ISO 8601 standard)
- Example: If date range is Jan 1-31, returns ~4-5 data points (one per week)

### Monthly
- Groups sales by calendar months
- Period format: `"YYYY-MM"` (e.g., `"2025-01"`) or `"January 2025"`
- Example: If date range is Jan 1 - Dec 31, returns 12 data points (one per month)

### Quarterly
- Groups sales by calendar quarters
- Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
- Period format: `"2025-Q1"` or `"Q1 2025"` or `"Jan-Mar 2025"`
- Example: If date range is Jan 1 - Dec 31, returns 4 data points (one per quarter)

### Yearly
- Groups sales by calendar years
- Period format: `"YYYY"` (e.g., `"2025"`)
- Example: If date range spans multiple years, returns one data point per year

## Data Calculation Logic

### Revenue Calculation

1. **Source**: Completed sales from `sales` table
   - Only include sales where `status = 'completed'`
   - Exclude cancelled sales (`status != 'cancelled'`)

2. **Sale Total**: Sum of `sale_items.quantity * sale_items.unit_price` minus discounts
   - For each sale: `SUM((quantity * unit_price) - discount_amount)` for all items
   - Include `overall_discount` if present (subtract from total)
   - Formula: `(SUM(item totals) - overall_discount)`

3. **Date Filtering**: 
   - Use `sales.date` if available, otherwise use `sales.created_at` (date part only)
   - Only include sales where date is between `start_date` and `end_date` (inclusive)

4. **Grouping**: 
   - Group by period based on `period_type`
   - Sum all sale totals within each period
   - Count number of sales in each period

### Filtering Logic

1. **Sale Type Filter**:
   - If `sale_type = "walk-in"`: Only include sales where `sale_type = 'walk-in'`
   - If `sale_type = "delivery"`: Only include sales where `sale_type = 'delivery'`
   - If omitted: Include all sale types

2. **Customer Filter**:
   - If `customer_id` is provided: Only include sales for that customer
   - Exclude guest sales (where `is_guest = true`) unless explicitly requested

3. **Company Filter**:
   - Always filter by `company_id` to ensure data isolation

## Period Label Formatting

The backend should return period labels in a format suitable for display:

### Recommended Formats

- **Daily**: `"Jan 15"` or `"15 Jan"` (short month + day)
- **Weekly**: `"Week 3, Jan"` or `"Jan 15-21"`
- **Monthly**: `"January"` or `"Jan 2025"` (if spanning multiple years, include year)
- **Quarterly**: `"Q1 2025"` or `"Jan-Mar 2025"`
- **Yearly**: `"2025"`

Alternatively, return raw period identifiers and let the frontend format them:
- Daily: `"2025-01-15"`
- Monthly: `"2025-01"`
- Quarterly: `"2025-Q1"`
- Yearly: `"2025"`

## Data Source

The trends should be calculated from:

1. **Sales Table**: Primary source
   - `sales.id`
   - `sales.company_id`
   - `sales.customer_id`
   - `sales.sale_type` ('walk-in' or 'delivery')
   - `sales.status` ('draft', 'completed', 'cancelled')
   - `sales.date` or `sales.created_at` (for date filtering)
   - `sales.total` (if pre-calculated) or calculate from items
   - `sales.overall_discount` (if present)

2. **Sale Items Table**: For calculating sale totals
   - `sale_items.sale_id`
   - `sale_items.quantity`
   - `sale_items.unit_price`
   - `sale_items.discount_amount` (item-level discount)

3. **Calculation Query** (SQL example):
```sql
SELECT 
  DATE_FORMAT(s.date, '%Y-%m') as period,  -- Adjust format based on period_type
  SUM(
    (SELECT SUM(si.quantity * si.unit_price - COALESCE(si.discount_amount, 0))
     FROM sale_items si 
     WHERE si.sale_id = s.id)
    - COALESCE(s.overall_discount, 0)
  ) as value,
  COUNT(*) as count
FROM sales s
WHERE s.company_id = ?
  AND s.status = 'completed'
  AND s.date BETWEEN ? AND ?
  AND (? IS NULL OR s.sale_type = ?)
  AND (? IS NULL OR s.customer_id = ?)
GROUP BY period
ORDER BY period;
```

## Performance Considerations

1. **Caching**: Consider caching trends for completed periods (past months/years)
   - Cache key: `sales_trends_{company_id}_{period_type}_{start_date}_{end_date}_{sale_type}_{customer_id}`
   - Invalidate cache when new sales are completed

2. **Indexing**: Ensure proper database indexes on:
   - `sales.company_id`
   - `sales.date` (or `sales.created_at`)
   - `sales.status`
   - `sales.sale_type`
   - `sales.customer_id`
   - `sale_items.sale_id`

3. **Query Optimization**:
   - Use efficient aggregation queries (GROUP BY, SUM, COUNT)
   - Consider materialized views for frequently accessed periods
   - For large date ranges, consider pagination or limiting results

4. **Empty Periods**:
   - Optionally include periods with zero sales to show gaps in the chart
   - Or exclude them to show only periods with activity (frontend can handle gaps)

## Error Handling

The API should return appropriate HTTP status codes:

- `200 OK`: Successful request with data
- `400 Bad Request`: Invalid date range, invalid period_type, or malformed parameters
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User doesn't have permission to view sales data
- `404 Not Found`: Company not found
- `500 Internal Server Error`: Server error during calculation

Error response format:
```json
{
  "message": "Error description",
  "errors": {
    "period_type": ["The period type must be one of: daily, weekly, monthly, quarterly, yearly."],
    "start_date": ["The start date must be before the end date."]
  }
}
```

## Permissions

The endpoint should check for:
- `module.selling.read` permission (minimum)
- Optionally: `module.selling.sales.read` if you have granular permissions

## Example API Calls

### Monthly Trends for Current Year
```
GET /api/sales/trends?company_id=1&period_type=monthly&start_date=2025-01-01&end_date=2025-12-31
```

### Quarterly Trends for Walk-in Sales
```
GET /api/sales/trends?company_id=1&period_type=quarterly&start_date=2025-01-01&end_date=2025-12-31&sale_type=walk-in
```

### Daily Trends for Specific Month
```
GET /api/sales/trends?company_id=1&period_type=daily&start_date=2025-01-01&end_date=2025-01-31
```

### Weekly Trends for Specific Customer
```
GET /api/sales/trends?company_id=1&period_type=weekly&start_date=2025-01-01&end_date=2025-12-31&customer_id=10
```

### Yearly Trends (Multi-year)
```
GET /api/sales/trends?company_id=1&period_type=yearly&start_date=2020-01-01&end_date=2025-12-31
```

## Frontend Usage

The frontend component (`SalesOrderTrendsChart.tsx`) will:
1. Fetch trends data based on selected filters
2. Display sales revenue as an area chart
3. Show period labels on X-axis
4. Format values in Lakhs (L) or Thousands (K) for readability
5. Support filtering by period type, date range, sale type, and customer
6. Show tooltip with revenue amount and sale count

## Special Considerations

### Guest Sales
- Guest sales (`is_guest = true`) should be included in trends unless explicitly filtered out
- Consider adding a filter option for including/excluding guest sales if needed

### Cancelled Sales
- Cancelled sales should be excluded from trends
- Only count completed sales (`status = 'completed'`)

### Date Handling
- Use `sales.date` if available (the actual sale date)
- Fallback to `sales.created_at` date part if `sales.date` is null
- Ensure timezone consistency (use company timezone or UTC)

### Empty Periods
- Decide whether to include periods with zero sales
- If including: Frontend can show gaps or zero values
- If excluding: Frontend will only show periods with activity

## Testing Checklist

- [ ] Daily grouping (one data point per day)
- [ ] Weekly grouping (one data point per week)
- [ ] Monthly grouping (one data point per month)
- [ ] Quarterly grouping (one data point per quarter)
- [ ] Yearly grouping (one data point per year)
- [ ] Walk-in sales filter
- [ ] Delivery sales filter
- [ ] All sales (no filter)
- [ ] Customer-specific filter
- [ ] Date range filtering
- [ ] Revenue calculation (including discounts)
- [ ] Sale count calculation
- [ ] Summary totals calculation
- [ ] Empty period handling
- [ ] Performance with large datasets
- [ ] Permission checks

## Notes

- The frontend currently hardcodes `company_id: 1`. This should be replaced with actual company selection when multi-company support is implemented.
- The chart displays revenue (sales totals), not profit. For profit trends, use a different endpoint or calculate from COGS.
- Period labels can be formatted on the frontend if the backend returns raw period identifiers (e.g., "2025-01" for monthly).

