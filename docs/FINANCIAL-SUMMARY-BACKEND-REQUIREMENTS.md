# Financial Summary Dashboard - Backend API Requirements

## Overview

This document outlines the backend API requirements for the Financial Summary cards on the Accounting dashboard. These cards display key financial metrics at a glance: Total Income, Total Expenses, Accounts Receivable, and Accounts Payable.

## API Endpoint

```
GET /api/financial-reports/summary
```

**Authentication Required:** Yes (via Sanctum token)  
**Permission Required:** `module.accounting.read`

## Request Parameters

### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `company_id` | integer | The company ID for which to generate the summary | `1` |

### Optional Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `period` | string | Time period for the summary: `"current_month"`, `"current_year"`, `"all_time"` | `"current_month"` |
| `start_date` | string | Custom start date (YYYY-MM-DD). If provided, `end_date` is required | `"2025-01-01"` |
| `end_date` | string | Custom end date (YYYY-MM-DD). If provided, `start_date` is required | `"2025-01-31"` |

### Period Behavior

- **`current_month`**: Current calendar month (e.g., if today is Jan 15, 2025, shows data from Jan 1-31, 2025)
- **`current_year`**: Current calendar year (e.g., if today is Jan 15, 2025, shows data from Jan 1, 2025 to Dec 31, 2025)
- **`all_time`**: All transactions from the beginning (no date filtering)
- **Custom dates**: When `start_date` and `end_date` are provided, use this date range instead of period

## Response Structure

### Success Response (200 OK)

```json
{
  "company_id": 1,
  "period": "current_month",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "summary": {
    "total_income": 349000.00,
    "total_expenses": 165000.00,
    "accounts_receivable": 20000.00,
    "accounts_payable": 0.00
  },
  "breakdown": {
    "income": {
      "sales_revenue": 300000.00,
      "delivery_charges": 20000.00,
      "rental_income": 25000.00,
      "other_income": 4000.00
    },
    "expenses": {
      "purchases": 120000.00,
      "operating_expenses": 30000.00,
      "discounts": 10000.00,
      "other_expenses": 5000.00
    }
  },
  "generated_at": "2025-01-15T10:30:00Z"
}
```

### Response Fields

#### Summary Object
- `total_income`: Sum of all credits to income accounts within the period
- `total_expenses`: Sum of all debits to expense accounts within the period
- `accounts_receivable`: Total outstanding customer dues (unpaid invoices)
- `accounts_payable`: Total outstanding supplier dues (unpaid purchase invoices)

#### Breakdown Object (Optional)
Provides detailed breakdown of income and expense categories:
- `income`: Breakdown by income source (sales revenue, delivery charges, rental income, etc.)
- `expenses`: Breakdown by expense category (purchases, operating expenses, discounts, etc.)

## Data Calculation Logic

### Total Income

1. **Source**: Journal entry lines where `account.root_type = "income"` and `credit > 0`
2. **Date Filter**: Only include journal entries where `journal_entries.date` is within the specified period
3. **Status**: Only include posted journal entries (`is_posted = true`)
4. **Calculation**: `SUM(journal_entry_lines.credit)` for income accounts

### Total Expenses

1. **Source**: Journal entry lines where `account.root_type = "expense"` and `debit > 0`
2. **Date Filter**: Only include journal entries where `journal_entries.date` is within the specified period
3. **Status**: Only include posted journal entries (`is_posted = true`)
4. **Calculation**: `SUM(journal_entry_lines.debit)` for expense accounts

### Accounts Receivable

1. **Source**: Unpaid customer invoices (sales invoices with status != "paid")
2. **Calculation**: 
   - Sum of `invoices.amount` where:
     - `invoice_type` = "sale" (or reference_type = "sale")
     - `status` != "paid" AND `status` != "cancelled"
     - Invoice date is within the period (or all-time if period = "all_time")
3. **Alternative**: Can also be calculated from Accounts Receivable account balance if mapped

### Accounts Payable

1. **Source**: Unpaid supplier invoices (purchase invoices with status != "paid")
2. **Calculation**:
   - Sum of `invoices.amount` where:
     - `invoice_type` = "purchase" (or reference_type = "purchase_order")
     - `status` != "paid" AND `status` != "cancelled"
     - Invoice date is within the period (or all-time if period = "all_time")
3. **Alternative**: Can also be calculated from Accounts Payable account balance if mapped

## Breakdown Calculation (Optional)

If `breakdown` is requested, provide detailed categorization:

### Income Breakdown
- **Sales Revenue**: From sales invoices (mapped to `pos_sales_revenue` account)
- **Delivery Charges**: From delivery charges (mapped to `pos_delivery_revenue` account)
- **Rental Income**: From rental agreements
- **Other Income**: Any other income accounts not categorized above

### Expense Breakdown
- **Purchases**: From purchase invoices (mapped to purchase expense accounts)
- **Operating Expenses**: General operating expenses (salaries, rent, utilities, etc.)
- **Discounts**: Discounts given to customers (mapped to `pos_discount` account)
- **Other Expenses**: Any other expense accounts not categorized above

## Date Range Handling

### Current Month
```php
$startDate = date('Y-m-01'); // First day of current month
$endDate = date('Y-m-t'); // Last day of current month
```

### Current Year
```php
$startDate = date('Y-01-01'); // January 1st of current year
$endDate = date('Y-12-31'); // December 31st of current year
```

### All Time
- No date filtering on journal entries
- Include all posted transactions

### Custom Date Range
- Use provided `start_date` and `end_date`
- Validate that `start_date <= end_date`

## Performance Considerations

1. **Caching**: Consider caching summary data for completed periods (past months/years)
   - Cache key: `financial_summary_{company_id}_{period}_{start_date}_{end_date}`
   - Invalidate cache when new journal entries are posted

2. **Indexing**: Ensure proper database indexes on:
   - `journal_entries.company_id`
   - `journal_entries.date`
   - `journal_entries.is_posted`
   - `journal_entry_lines.journal_entry_id`
   - `journal_entry_lines.account_id`
   - `accounts.root_type`
   - `invoices.status`
   - `invoices.invoice_type`

3. **Query Optimization**:
   - Use efficient aggregation queries (GROUP BY, SUM)
   - Consider materialized views for frequently accessed periods
   - Limit breakdown detail if not needed (make it optional)

## Error Handling

The API should return appropriate HTTP status codes:

- `200 OK`: Successful request with data
- `400 Bad Request`: Invalid date range, invalid company_id, or malformed parameters
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User doesn't have permission to view financial reports
- `404 Not Found`: Company not found
- `500 Internal Server Error`: Server error during calculation

Error response format:
```json
{
  "message": "Error description",
  "errors": {
    "start_date": ["The start date must be before the end date."]
  }
}
```

## Permissions

The endpoint should check for:
- `module.accounting.read` permission (minimum)

## Example API Calls

### Current Month Summary
```
GET /api/financial-reports/summary?company_id=1&period=current_month
```

### Current Year Summary
```
GET /api/financial-reports/summary?company_id=1&period=current_year
```

### All Time Summary
```
GET /api/financial-reports/summary?company_id=1&period=all_time
```

### Custom Date Range
```
GET /api/financial-reports/summary?company_id=1&start_date=2025-01-01&end_date=2025-01-31
```

### With Breakdown
```
GET /api/financial-reports/summary?company_id=1&period=current_month&include_breakdown=1
```

## Frontend Usage

The frontend component (`FinancialSummary.tsx`) will:
1. Fetch summary data on component mount
2. Display four cards:
   - **Total Income**: Shows `summary.total_income`
   - **Total Expenses**: Shows `summary.total_expenses`
   - **Accounts Receivable**: Shows `summary.accounts_receivable`
   - **Accounts Payable**: Shows `summary.accounts_payable`
3. Format values in Lakhs (L) or Thousands (K) for readability
4. Support period selection (current month, current year, all time, custom)

## Testing Checklist

- [ ] Current month calculation
- [ ] Current year calculation
- [ ] All time calculation
- [ ] Custom date range
- [ ] Income aggregation from income accounts
- [ ] Expense aggregation from expense accounts
- [ ] Accounts Receivable calculation from unpaid invoices
- [ ] Accounts Payable calculation from unpaid purchase invoices
- [ ] Empty period handling (no transactions)
- [ ] Date range validation
- [ ] Permission checks
- [ ] Performance with large datasets
- [ ] Breakdown calculation (if implemented)

## Notes

- The frontend currently hardcodes `company_id: 1`. This should be replaced with actual company selection when multi-company support is implemented.
- Accounts Receivable and Accounts Payable can be calculated either from invoice statuses or from account balances (if account mappings are configured). The backend should use the most reliable method available.
- The breakdown is optional and can be omitted if not needed for performance reasons.

