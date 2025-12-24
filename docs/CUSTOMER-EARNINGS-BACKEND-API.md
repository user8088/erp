# Customer Earnings Statistics API - Backend Implementation Guide

## Overview

This document provides detailed requirements for implementing the Customer Earnings Statistics API endpoint. The frontend needs accurate, non-duplicated earnings data broken down by sale type (walk-in vs delivery/order) and rental agreements.

## Endpoint

**GET** `/api/customers/{customer_id}/earnings-stats`

## Query Parameters

- `start_date` (optional, string, format: YYYY-MM-DD): Filter sales/rentals from this date onwards
- `end_date` (optional, string, format: YYYY-MM-DD): Filter sales/rentals up to this date
- `month` (optional, string, format: YYYY-MM): Filter for a specific month (alternative to start_date/end_date)

**Note:** If `month` is provided, calculate start_date as the first day of that month and end_date as the last day of that month.

## Critical Requirements

### 1. **Avoid Double-Counting**

**IMPORTANT:** A sale should be counted ONLY ONCE, regardless of whether it has an invoice or not.

- **Walk-in Sales:** Count sales where `sale_type = 'walk-in'` and `status != 'cancelled'`
- **Delivery/Order Sales:** Count sales where `sale_type = 'delivery'` and `status != 'cancelled'`
- **DO NOT** count invoices separately - invoices are just documents generated from sales, not separate revenue sources

### 2. **Revenue Calculation**

All revenue should be calculated as **GROSS** (before discounts):

- **Gross Revenue = Net Revenue (total_amount) + Discounts (total_discount)**
- For each sale: `gross_revenue = sale.total_amount + sale.total_discount`
- For rentals: Sum all rental payments (already paid amounts)

### 3. **Sale Type Distinction**

Use the `sale_type` field from the `sales` table to distinguish:
- `sale_type = 'walk-in'` → Walk-in Sales
- `sale_type = 'delivery'` → Order/Delivery Sales

**DO NOT** use invoice presence to determine sale type. A sale's type is determined at creation time and stored in the `sale_type` field.

## Response Structure

```json
{
  "customer_id": 1,
  "customer_name": "John Doe",
  "statistics": {
    // Walk-in Sales (sales with sale_type = 'walk-in')
    "walk_in_sales_revenue": 2200.00,        // GROSS revenue (total_amount + total_discount)
    "walk_in_sales_discount": 0.00,          // Total discounts for walk-in sales
    "walk_in_sales_count": 1,                // Number of walk-in sales
    
    // Delivery/Order Sales (sales with sale_type = 'delivery')
    "order_sales_revenue": 2300.00,          // GROSS revenue (total_amount + total_discount)
    "order_sales_discount": 200.00,          // Total discounts for order sales
    "order_sales_count": 1,                  // Number of delivery/order sales
    
    // Rental Agreements
    "rental_revenue": 0.00,                  // Sum of all rental payments
    "rental_count": 0,                       // Number of rental agreements
    
    // Aggregated Totals
    "total_sales_revenue": 4500.00,          // walk_in_sales_revenue + order_sales_revenue
    "total_sales_discount": 200.00,          // walk_in_sales_discount + order_sales_discount
    "total_earnings": 4500.00,                // total_sales_revenue + rental_revenue (GROSS)
    "total_discounts_given": 200.00,         // Same as total_sales_discount
    "net_earnings": 4300.00,                 // total_earnings - total_discounts_given
    
    // Transaction Counts
    "total_orders": 1,                       // walk_in_sales_count
    "total_invoices": 1,                     // order_sales_count (confusing name, but keep for compatibility)
    "total_rentals": 0,                      // rental_count
    
    // Period Information
    "period_start": "2025-12-01",            // Start date of the period (if filtered)
    "period_end": "2025-12-31"               // End date of the period (if filtered)
  }
}
```

## Database Query Logic

### Step 1: Filter Sales by Customer and Date Range

```sql
SELECT 
  id,
  sale_type,
  total_amount,
  total_discount,
  status,
  created_at
FROM sales
WHERE customer_id = :customer_id
  AND status != 'cancelled'
  AND (:start_date IS NULL OR DATE(created_at) >= :start_date)
  AND (:end_date IS NULL OR DATE(created_at) <= :end_date)
```

### Step 2: Calculate Walk-in Sales

```sql
-- Walk-in Sales
SELECT 
  COUNT(*) as count,
  SUM(total_amount) as net_revenue,
  SUM(total_discount) as total_discount
FROM sales
WHERE customer_id = :customer_id
  AND sale_type = 'walk-in'
  AND status != 'cancelled'
  AND (:start_date IS NULL OR DATE(created_at) >= :start_date)
  AND (:end_date IS NULL OR DATE(created_at) <= :end_date)
```

**Calculate:**
- `walk_in_sales_revenue` = `net_revenue + total_discount` (GROSS)
- `walk_in_sales_discount` = `total_discount`
- `walk_in_sales_count` = `count`

### Step 3: Calculate Delivery/Order Sales

```sql
-- Delivery/Order Sales
SELECT 
  COUNT(*) as count,
  SUM(total_amount) as net_revenue,
  SUM(total_discount) as total_discount
FROM sales
WHERE customer_id = :customer_id
  AND sale_type = 'delivery'
  AND status != 'cancelled'
  AND (:start_date IS NULL OR DATE(created_at) >= :start_date)
  AND (:end_date IS NULL OR DATE(created_at) <= :end_date)
```

**Calculate:**
- `order_sales_revenue` = `net_revenue + total_discount` (GROSS)
- `order_sales_discount` = `total_discount`
- `order_sales_count` = `count`

### Step 4: Calculate Rental Revenue

```sql
-- Rental Agreements and Payments
SELECT 
  ra.id,
  ra.customer_id,
  COALESCE(SUM(rp.amount_paid), 0) as total_paid
FROM rental_agreements ra
LEFT JOIN rental_payments rp ON rp.rental_agreement_id = ra.id
WHERE ra.customer_id = :customer_id
  AND (:start_date IS NULL OR DATE(ra.created_at) >= :start_date)
  AND (:end_date IS NULL OR DATE(ra.created_at) <= :end_date)
GROUP BY ra.id
```

**Calculate:**
- `rental_revenue` = Sum of all `total_paid` values
- `rental_count` = Count of rental agreements

### Step 5: Aggregate Totals

```php
// Pseudocode
$statistics = [
  'walk_in_sales_revenue' => $walkInGross,
  'walk_in_sales_discount' => $walkInDiscount,
  'walk_in_sales_count' => $walkInCount,
  
  'order_sales_revenue' => $orderGross,
  'order_sales_discount' => $orderDiscount,
  'order_sales_count' => $orderCount,
  
  'rental_revenue' => $rentalRevenue,
  'rental_count' => $rentalCount,
  
  'total_sales_revenue' => $walkInGross + $orderGross,
  'total_sales_discount' => $walkInDiscount + $orderDiscount,
  'total_earnings' => $walkInGross + $orderGross + $rentalRevenue,
  'total_discounts_given' => $walkInDiscount + $orderDiscount,
  'net_earnings' => ($walkInGross + $orderGross + $rentalRevenue) - ($walkInDiscount + $orderDiscount),
  
  'total_orders' => $walkInCount,
  'total_invoices' => $orderCount,  // Legacy field name, represents order sales
  'total_rentals' => $rentalCount,
];
```

## Important Notes

### 1. **Never Count Invoices as Separate Revenue**

Invoices are documents generated from sales. They should NOT be counted as separate revenue sources. The revenue comes from the sale itself, not the invoice.

### 2. **Status Filtering**

Only count sales where `status != 'cancelled'`. Cancelled sales should be excluded from all calculations.

### 3. **Date Filtering**

When filtering by date range:
- Use `created_at` field from the `sales` table
- For rentals, use `created_at` from `rental_agreements` table
- All dates should be compared in the same timezone (preferably UTC)

### 4. **Gross vs Net Revenue**

- **Gross Revenue:** `total_amount + total_discount` (what customer was charged before discounts)
- **Net Revenue:** `total_amount` (what customer actually paid after discounts)
- **Total Earnings:** Should always be GROSS revenue
- **Net Earnings:** Gross revenue minus discounts

### 5. **Rental Revenue**

Rental revenue is the sum of all payments made for rental agreements, not the rental agreement amount itself. Sum the `amount_paid` field from `rental_payments` table.

## Example Calculation

**Scenario:**
- 1 Walk-in Sale: total_amount = 2200, total_discount = 0
- 1 Delivery Sale: total_amount = 2100, total_discount = 200
- 0 Rentals

**Expected Response:**
```json
{
  "walk_in_sales_revenue": 2200.00,    // 2200 + 0
  "walk_in_sales_discount": 0.00,
  "walk_in_sales_count": 1,
  
  "order_sales_revenue": 2300.00,      // 2100 + 200
  "order_sales_discount": 200.00,
  "order_sales_count": 1,
  
  "rental_revenue": 0.00,
  "rental_count": 0,
  
  "total_sales_revenue": 4500.00,       // 2200 + 2300
  "total_sales_discount": 200.00,       // 0 + 200
  "total_earnings": 4500.00,            // 4500 + 0
  "total_discounts_given": 200.00,
  "net_earnings": 4300.00,             // 4500 - 200
  
  "total_orders": 1,
  "total_invoices": 1,
  "total_rentals": 0
}
```

## Validation Rules

1. `total_sales_revenue` MUST equal `walk_in_sales_revenue + order_sales_revenue`
2. `total_sales_discount` MUST equal `walk_in_sales_discount + order_sales_discount`
3. `total_earnings` MUST equal `total_sales_revenue + rental_revenue`
4. `net_earnings` MUST equal `total_earnings - total_discounts_given`
5. `total_orders` MUST equal `walk_in_sales_count`
6. `total_invoices` MUST equal `order_sales_count`
7. All revenue values must be GROSS (before discounts), except `net_earnings`

## Error Handling

- If customer doesn't exist: Return 404 with appropriate error message
- If date range is invalid: Return 400 with validation error
- If no sales/rentals found: Return all zeros, not null values

## Testing Checklist

- [ ] Single walk-in sale returns correct count and revenue
- [ ] Single delivery sale returns correct count and revenue
- [ ] Multiple sales of each type are counted correctly
- [ ] Cancelled sales are excluded
- [ ] Date filtering works correctly
- [ ] Month filtering works correctly
- [ ] Rental revenue is calculated correctly
- [ ] Gross revenue includes discounts
- [ ] Net earnings = gross - discounts
- [ ] No double-counting occurs
- [ ] Invoices are NOT counted as separate revenue

