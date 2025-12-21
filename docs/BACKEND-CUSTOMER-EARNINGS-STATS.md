# Customer Earnings Statistics API Documentation

This document provides comprehensive API documentation for the Customer Earnings Statistics endpoint. This endpoint aggregates revenue and discount data from sales, invoices, and rentals for a specific customer.

## Base URL

All endpoints are prefixed with `/api/customers`

## Authentication

All endpoints require:
- **Authentication**: Bearer token via Sanctum
- **Permission**: `module.customer.read` (read access to customer module)

---

## Endpoint: Get Customer Earnings Statistics

### Overview

Retrieves comprehensive earnings statistics for a specific customer, including:
- Total revenue from sales, invoices, and rentals
- Total discounts given across all transactions
- Transaction counts for each type
- Optional date range filtering for time-based analysis

### Endpoint

```
GET /api/customers/{id}/earnings-stats
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | The customer ID to retrieve statistics for |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `month` | string (YYYY-MM) | No | Filter by specific month (e.g., `2025-12`). Alternative to `start_date`/`end_date` |
| `start_date` | string (YYYY-MM-DD) | No | Start date for filtering transactions |
| `end_date` | string (YYYY-MM-DD) | No | End date for filtering transactions |

**Date Filtering Rules:**
- If `month` is provided, it calculates the full month range automatically
- If both `start_date` and `end_date` are provided, filters transactions within that range
- If only `start_date` is provided, filters from that date to today
- If only `end_date` is provided, filters from beginning to that date
- If no date parameters are provided, returns all-time statistics

---

## Request Examples

### Example 1: Monthly Statistics

Get earnings statistics for December 2025:

```http
GET /api/customers/1/earnings-stats?month=2025-12
Authorization: Bearer {token}
```

### Example 2: Custom Date Range

Get earnings statistics for a specific date range:

```http
GET /api/customers/1/earnings-stats?start_date=2025-12-01&end_date=2025-12-31
Authorization: Bearer {token}
```

### Example 3: From Date to Today

Get earnings statistics from a start date to today:

```http
GET /api/customers/1/earnings-stats?start_date=2025-01-01
Authorization: Bearer {token}
```

### Example 4: All-Time Statistics

Get all-time earnings statistics (no date filtering):

```http
GET /api/customers/1/earnings-stats
Authorization: Bearer {token}
```

---

## Response Structure

### Success Response (200 OK)

```json
{
  "customer_id": 1,
  "customer_name": "John Doe",
  "statistics": {
    "total_sales_revenue": 50000.00,
    "total_sales_discount": 2500.00,
    "total_rental_revenue": 15000.00,
    "total_invoice_revenue": 30000.00,
    "total_invoice_discount": 1000.00,
    "total_earnings": 95000.00,
    "total_discounts_given": 3500.00,
    "total_orders": 25,
    "total_rentals": 5,
    "total_invoices": 10,
    "period_start": "2025-12-01",
    "period_end": "2025-12-31"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `customer_id` | integer | The customer ID |
| `customer_name` | string | The customer's name |
| `statistics.total_sales_revenue` | float | Total revenue from all sales (walk-in + delivery). Excludes cancelled sales. |
| `statistics.total_sales_discount` | float | Total discounts applied to sales. Sum of `total_discount` from all non-cancelled sales. |
| `statistics.total_rental_revenue` | float | Total revenue from rental payments. Sum of `amount_paid` from all rental payments with status 'paid'. |
| `statistics.total_invoice_revenue` | float | Total revenue from sale invoices. Sum of `total_amount` from all non-cancelled sale invoices. |
| `statistics.total_invoice_discount` | float | Total discounts from invoices. Calculated from related sale records' `total_discount` field. |
| `statistics.total_earnings` | float | Total earnings across all sources. Calculated as: `total_sales_revenue + total_invoice_revenue + total_rental_revenue` |
| `statistics.total_discounts_given` | float | Total discounts given across all transaction types. Calculated as: `total_sales_discount + total_invoice_discount` |
| `statistics.total_orders` | integer | Count of non-cancelled sales (both walk-in and delivery) |
| `statistics.total_rentals` | integer | Count of rental agreements |
| `statistics.total_invoices` | integer | Count of non-cancelled sale invoices |
| `statistics.period_start` | string\|null | Start date of the filtered period (YYYY-MM-DD). Null if no date filter applied. |
| `statistics.period_end` | string\|null | End date of the filtered period (YYYY-MM-DD). Null if no date filter applied. |

---

## Error Responses

### 404 Not Found

Customer not found:

```json
{
  "message": "No query results for model [App\\Models\\Customer] {id}"
}
```

### 401 Unauthorized

Missing or invalid authentication token:

```json
{
  "message": "Unauthenticated."
}
```

### 403 Forbidden

Missing required permission:

```json
{
  "message": "This action is unauthorized."
}
```

### 422 Unprocessable Entity

Invalid date format:

```json
{
  "message": "The month does not match the format Y-m.",
  "errors": {
    "month": ["The month does not match the format Y-m."]
  }
}
```

---

## Calculation Details

### Sales Revenue and Discounts

**Sales Revenue:**
- Sum of `total_amount` from all sales where:
  - `customer_id` matches the requested customer
  - `status != 'cancelled'`
  - Date filter applies to `created_at` (sale creation date)

**Sales Discounts:**
- Sum of `total_discount` from all sales matching the same criteria
- Discounts are recorded at the sale level and item level
- Each sale item can have a `discount_percentage` or `discount_amount`
- Sale's `total_discount` is the sum of all item discounts

**Note:** Discounts are recorded for both walk-in sales and delivery/order sales.

### Invoice Revenue and Discounts

**Invoice Revenue:**
- Sum of `total_amount` from all invoices where:
  - `invoice_type = 'sale'`
  - `customer_id` matches the requested customer
  - `status != 'cancelled'`
  - Date filter applies to `invoice_date`

**Invoice Discounts:**
- Calculated from related sale records
- Each sale invoice references a sale via polymorphic relationship (`reference_type` and `reference_id`)
- Invoice discount = sum of related sale's `total_discount`

**Important:** Invoices are created from sales when a sale is processed. The invoice revenue represents the same transaction as the sale revenue. The system tracks both for comprehensive reporting.

### Rental Revenue

**Rental Revenue:**
- Sum of `amount_paid` from rental payments where:
  - Related rental agreement's `customer_id` matches the requested customer
  - Payment `status = 'paid'`
  - Date filter applies to rental agreement's `rental_start_date` or `created_at`

**Note:** Only payments with status 'paid' are counted in rental revenue. Partial payments or unpaid rentals are excluded.

### Total Earnings

Total earnings is the sum of all revenue sources:
```
total_earnings = total_sales_revenue + total_invoice_revenue + total_rental_revenue
```

### Total Discounts Given

Total discounts is the sum of all discount sources:
```
total_discounts_given = total_sales_discount + total_invoice_discount
```

---

## Use Cases

### 1. Customer Lifetime Value Analysis

Get all-time earnings statistics to understand total customer value:

```http
GET /api/customers/1/earnings-stats
```

**Use Case:** Identify top customers by total earnings for loyalty programs or special offers.

### 2. Monthly Performance Tracking

Track customer engagement and revenue for a specific month:

```http
GET /api/customers/1/earnings-stats?month=2025-12
```

**Use Case:** Monthly customer reports, identify seasonal patterns, or track growth trends.

### 3. Discount Analysis

Compare total revenue vs. discounts given to analyze discount effectiveness:

```http
GET /api/customers/1/earnings-stats?start_date=2025-01-01&end_date=2025-12-31
```

**Response Analysis:**
- Discount percentage: `(total_discounts_given / total_earnings) * 100`
- Net revenue after discounts: `total_earnings - total_discounts_given`

**Use Case:** Evaluate discount strategies, identify customers with high discount rates, optimize pricing.

### 4. Customer Segmentation

Segment customers by total earnings or transaction counts:

```http
GET /api/customers/{id}/earnings-stats
```

**Segmentation Criteria:**
- **VIP Customers:** `total_earnings > 100000`
- **Active Customers:** `total_orders > 10` or `total_rentals > 5`
- **High-Value Customers:** High `total_earnings` with low `total_discounts_given`

### 5. Period Comparison

Compare different time periods to track customer growth:

**Current Period:**
```http
GET /api/customers/1/earnings-stats?month=2025-12
```

**Previous Period:**
```http
GET /api/customers/1/earnings-stats?month=2025-11
```

**Use Case:** Track month-over-month growth, identify declining customers, measure marketing campaign effectiveness.

---

## Example Scenarios

### Scenario 1: Regular Customer with Mixed Transactions

**Customer:** John Doe (ID: 1)

**Transactions:**
- 10 walk-in sales in December: Total = 20,000, Discounts = 1,000
- 5 delivery orders in December: Total = 15,000, Discounts = 500
- 2 rental agreements in December: Payments = 8,000

**Request:**
```http
GET /api/customers/1/earnings-stats?month=2025-12
```

**Response:**
```json
{
  "customer_id": 1,
  "customer_name": "John Doe",
  "statistics": {
    "total_sales_revenue": 35000.00,
    "total_sales_discount": 1500.00,
    "total_rental_revenue": 8000.00,
    "total_invoice_revenue": 35000.00,
    "total_invoice_discount": 1500.00,
    "total_earnings": 78000.00,
    "total_discounts_given": 3000.00,
    "total_orders": 15,
    "total_rentals": 2,
    "total_invoices": 15,
    "period_start": "2025-12-01",
    "period_end": "2025-12-31"
  }
}
```

**Analysis:**
- Total revenue: 78,000
- Discount rate: (3,000 / 78,000) * 100 = 3.85%
- Net revenue after discounts: 75,000

### Scenario 2: New Customer (No Transactions)

**Customer:** New Customer (ID: 99)

**Request:**
```http
GET /api/customers/99/earnings-stats
```

**Response:**
```json
{
  "customer_id": 99,
  "customer_name": "New Customer",
  "statistics": {
    "total_sales_revenue": 0.00,
    "total_sales_discount": 0.00,
    "total_rental_revenue": 0.00,
    "total_invoice_revenue": 0.00,
    "total_invoice_discount": 0.00,
    "total_earnings": 0.00,
    "total_discounts_given": 0.00,
    "total_orders": 0,
    "total_rentals": 0,
    "total_invoices": 0,
    "period_start": null,
    "period_end": null
  }
}
```

### Scenario 3: Customer with Cancelled Transactions

**Important:** Cancelled sales and invoices are excluded from all calculations. Only active, completed transactions are counted.

If a customer has:
- 5 completed sales: 10,000
- 2 cancelled sales: 3,000

**Response will show:**
- `total_sales_revenue`: 10,000 (cancelled sales excluded)
- `total_orders`: 5 (cancelled sales excluded)

---

## Date Filtering Details

### Month Filter (YYYY-MM format)

When `month=2025-12` is provided:
- `start_date` is automatically set to: `2025-12-01 00:00:00`
- `end_date` is automatically set to: `2025-12-31 23:59:59`
- Sales are filtered by `created_at`
- Invoices are filtered by `invoice_date`
- Rentals are filtered by `rental_start_date` or `created_at`

### Custom Date Range

When both `start_date` and `end_date` are provided:
- Sales: `created_at BETWEEN start_date AND end_date`
- Invoices: `invoice_date BETWEEN start_date AND end_date`
- Rentals: `rental_start_date BETWEEN start_date AND end_date` OR `created_at BETWEEN start_date AND end_date`

### Partial Date Filters

**Only `start_date` provided:**
- Filters from `start_date` to current date/time

**Only `end_date` provided:**
- Filters from beginning (2000-01-01) to `end_date`

**No date parameters:**
- Returns all-time statistics (no date filtering)

---

## Performance Considerations

1. **Large Date Ranges:** Very large date ranges (e.g., all-time for customers with many transactions) may take longer to process. Consider implementing pagination or caching for frequently accessed customers.

2. **Eager Loading:** The endpoint uses eager loading (`with('reference')`, `with('payments')`) to minimize database queries.

3. **Indexes:** Ensure the following database indexes exist for optimal performance:
   - `sales.customer_id`, `sales.status`, `sales.created_at`
   - `invoices.customer_id`, `invoices.invoice_type`, `invoices.status`, `invoices.invoice_date`
   - `rental_agreements.customer_id`, `rental_agreements.rental_start_date`
   - `rental_payments.rental_agreement_id`, `rental_payments.payment_status`

---

## Integration Notes

### Frontend Integration

**TypeScript Interface:**

```typescript
interface CustomerEarningsStats {
  customer_id: number;
  customer_name: string;
  statistics: {
    total_sales_revenue: number;
    total_sales_discount: number;
    total_rental_revenue: number;
    total_invoice_revenue: number;
    total_invoice_discount: number;
    total_earnings: number;
    total_discounts_given: number;
    total_orders: number;
    total_rentals: number;
    total_invoices: number;
    period_start: string | null;
    period_end: string | null;
  };
}
```

**React Example:**

```typescript
const fetchCustomerEarnings = async (customerId: number, month?: string) => {
  const url = month
    ? `/api/customers/${customerId}/earnings-stats?month=${month}`
    : `/api/customers/${customerId}/earnings-stats`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch customer earnings');
  }
  
  return response.json() as Promise<CustomerEarningsStats>;
};
```

### Display Recommendations

1. **Total Earnings:** Display prominently as the primary metric
2. **Discount Percentage:** Calculate and display: `(total_discounts_given / total_earnings) * 100`
3. **Transaction Counts:** Show as badges or secondary metrics
4. **Period Information:** Display `period_start` and `period_end` when date filters are applied
5. **Comparison Views:** Allow users to compare different time periods side-by-side

---

## Changelog

### Version 1.0.0 (2025-12-19)
- Initial release
- Customer earnings statistics endpoint
- Support for sales, invoices, and rentals
- Date range filtering (monthly and custom)
- Discount tracking across all transaction types

---

## Support

For issues or questions regarding this API, please contact the development team or refer to the main API documentation.

