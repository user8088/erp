# Profitability Reports API Documentation

This document provides comprehensive API documentation for the Profitability Reports feature. All endpoints require authentication and the `module.accounting.read` permission.

## Base URL

All endpoints are prefixed with `/api/financial-reports`

## Authentication

All endpoints require:
- **Authentication**: Bearer token via Sanctum
- **Permission**: `module.accounting.read` (read access to accounting module)

## Common Query Parameters

The following parameters are common across all endpoints:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `company_id` | integer | Yes | The company ID to generate reports for |
| `start_date` | string (YYYY-MM-DD) | Yes | Start date of the reporting period |
| `end_date` | string (YYYY-MM-DD) | Yes | End date of the reporting period (must be >= start_date) |
| `comparison_type` | string | No | Type of comparison: `previous_period`, `previous_year`, or `none` (default: `none`) |

---

## 1. Gross Profit Report (Profit & Loss)

### Endpoint

```
GET /api/financial-reports/profit-loss
```

### Description

Generates a comprehensive Profit & Loss report showing revenue, cost of goods sold (COGS), gross profit, operating expenses, and net profit. Includes line-by-line breakdown of accounts and optional period comparisons.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `company_id` | integer | Yes | Company ID |
| `start_date` | string | Yes | Start date (YYYY-MM-DD) |
| `end_date` | string | Yes | End date (YYYY-MM-DD) |
| `comparison_type` | string | No | `previous_period`, `previous_year`, or `none` |

### Example Request

```http
GET /api/financial-reports/profit-loss?company_id=1&start_date=2025-01-01&end_date=2025-01-31&comparison_type=previous_period
Authorization: Bearer {token}
```

### Response Structure

```json
{
  "filters": {
    "company_id": 1,
    "start_date": "2025-01-01",
    "end_date": "2025-01-31",
    "comparison_type": "previous_period"
  },
  "lines": [
    {
      "account_id": 10,
      "account_number": "4100",
      "account_name": "Sales Revenue",
      "section": "income",
      "category": "sales_revenue",
      "current_period": 100000.00,
      "previous_period": 95000.00,
      "change_amount": 5000.00,
      "change_percentage": 5.26,
      "order": 1
    },
    {
      "account_id": 25,
      "account_number": "5100",
      "account_name": "Cost of Goods Sold",
      "section": "cogs",
      "category": "purchase_costs",
      "current_period": 60000.00,
      "previous_period": 57000.00,
      "change_amount": 3000.00,
      "change_percentage": 5.26,
      "order": 1
    }
  ],
  "summary": {
    "total_income": 100000.00,
    "total_cogs": 60000.00,
    "gross_profit": 40000.00,
    "total_operating_expenses": 15000.00,
    "operating_profit": 25000.00,
    "total_non_operating_income": 2000.00,
    "total_non_operating_expenses": 1000.00,
    "net_profit_before_tax": 26000.00,
    "tax": 0.00,
    "net_profit": 26000.00
  },
  "previous_summary": {
    "total_income": 95000.00,
    "total_cogs": 57000.00,
    "gross_profit": 38000.00
  },
  "generated_at": "2025-01-31T10:30:00Z"
}
```

### Response Fields

#### `filters` Object
- `company_id` (integer): Company ID used for the report
- `start_date` (string): Start date of the reporting period
- `end_date` (string): End date of the reporting period
- `comparison_type` (string): Comparison type used

#### `lines` Array
Array of account line items with the following fields:
- `account_id` (integer): Account ID
- `account_number` (string): Account number/code
- `account_name` (string): Account name
- `section` (string): Section type: `income` or `cogs`
- `category` (string|null): Account category from mapping (if available)
- `current_period` (float): Amount for current period
- `previous_period` (float): Amount for comparison period (only if comparison_type is set)
- `change_amount` (float): Difference between current and previous (only if comparison_type is set)
- `change_percentage` (float): Percentage change (only if comparison_type is set)
- `order` (integer): Display order

#### `summary` Object
Summary totals for the current period:
- `total_income` (float): Total revenue/income
- `total_cogs` (float): Total cost of goods sold
- `gross_profit` (float): Revenue minus COGS
- `total_operating_expenses` (float): Total operating expenses
- `operating_profit` (float): Gross profit minus operating expenses
- `total_non_operating_income` (float): Non-operating income
- `total_non_operating_expenses` (float): Non-operating expenses
- `net_profit_before_tax` (float): Profit before tax
- `tax` (float): Tax amount (currently always 0)
- `net_profit` (float): Final net profit

#### `previous_summary` Object (optional)
Summary totals for the comparison period (only included if `comparison_type` is set):
- `total_income` (float)
- `total_cogs` (float)
- `gross_profit` (float)

### Account Identification Logic

1. **Income Accounts**: All ledger accounts with `root_type='income'`, `is_group=false`, `is_disabled=false`
2. **COGS Accounts**: 
   - Primary: Accounts mapped via `financial_account_mappings` with `pnl_section='cogs'`
   - Fallback: Expense accounts with names matching: 'Purchase', 'Cost of Goods Sold', 'COGS', 'Direct Costs'
3. **Operating Expenses**: Expense accounts mapped with `pnl_section='operating_expense'` or all expense accounts excluding COGS
4. **Non-operating Income/Expenses**: Accounts mapped with respective P&L sections

### Calculation Notes

- **Income**: Net = Credits - Debits (income increases on credit side)
- **Expenses**: Net = Debits - Credits (expenses increase on debit side)
- Only includes journal entries with dates within the specified range
- Excludes disabled accounts and group accounts
- Amounts are rounded to 2 decimal places

---

## 2. Profitability Analysis Report

### Endpoint

```
GET /api/financial-reports/profitability-analysis
```

### Description

Calculates key financial ratios and metrics to assess overall business profitability, efficiency, and return on investment. Includes margins, ROA, and ROE calculations with optional period comparisons.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `company_id` | integer | Yes | Company ID |
| `start_date` | string | Yes | Start date (YYYY-MM-DD) |
| `end_date` | string | Yes | End date (YYYY-MM-DD) |
| `comparison_type` | string | No | `previous_period`, `previous_year`, or `none` |

### Example Request

```http
GET /api/financial-reports/profitability-analysis?company_id=1&start_date=2025-01-01&end_date=2025-12-31&comparison_type=previous_year
Authorization: Bearer {token}
```

### Response Structure

```json
{
  "filters": {
    "company_id": 1,
    "start_date": "2025-01-01",
    "end_date": "2025-12-31",
    "comparison_type": "previous_year"
  },
  "ratios": [
    {
      "name": "gross_profit_margin",
      "label": "Gross Profit Margin",
      "value": 40.00,
      "unit": "%",
      "description": "Percentage of revenue remaining after COGS",
      "trend": "up",
      "previous_value": 38.50
    },
    {
      "name": "operating_profit_margin",
      "label": "Operating Profit Margin",
      "value": 25.00,
      "unit": "%",
      "description": "Percentage of revenue remaining after operating expenses",
      "trend": "up",
      "previous_value": 23.50
    },
    {
      "name": "net_profit_margin",
      "label": "Net Profit Margin",
      "value": 20.00,
      "unit": "%",
      "description": "Percentage of revenue remaining as net profit",
      "trend": "stable",
      "previous_value": 20.00
    },
    {
      "name": "return_on_assets",
      "label": "Return on Assets (ROA)",
      "value": 15.50,
      "unit": "%",
      "description": "Net profit generated per unit of assets",
      "trend": "up",
      "previous_value": 14.20
    },
    {
      "name": "return_on_equity",
      "label": "Return on Equity (ROE)",
      "value": 22.30,
      "unit": "%",
      "description": "Net profit generated per unit of equity",
      "trend": "down",
      "previous_value": 23.10
    }
  ],
  "generated_at": "2025-12-31T10:30:00Z"
}
```

### Response Fields

#### `ratios` Array
Array of financial ratio objects with the following fields:
- `name` (string): Internal identifier for the ratio
- `label` (string): Human-readable label
- `value` (float): Calculated ratio value
- `unit` (string): Unit of measurement (always "%")
- `description` (string): Description of what the ratio represents
- `trend` (string|null): Trend direction: `up`, `down`, `stable`, or `null` (if no comparison)
- `previous_value` (float|null): Previous period value (only if comparison_type is set)

### Ratio Calculations

1. **Gross Profit Margin**: (Gross Profit / Revenue) × 100
2. **Operating Profit Margin**: (Operating Profit / Revenue) × 100
3. **Net Profit Margin**: (Net Profit / Revenue) × 100
4. **Return on Assets (ROA)**: (Net Profit / Total Assets) × 100
5. **Return on Equity (ROE)**: (Net Profit / Total Equity) × 100

### Trend Values

- `up`: Current value is higher than previous (improvement)
- `down`: Current value is lower than previous (decline)
- `stable`: Change is less than 0.01 (essentially unchanged)
- `null`: No comparison data available

### Balance Sheet Data

- **Total Assets**: Sum of all asset accounts (root_type='asset') as of end_date
- **Total Equity**: Sum of all equity accounts (root_type='equity') as of end_date
- Assets and equity are calculated using cumulative balances up to the end date

---

## 3. Trends Report (Sales & Purchase)

### Endpoint

```
GET /api/financial-reports/trends
```

### Description

Analyzes revenue or expense trends over time from sales or purchase invoices. Supports monthly, quarterly, or yearly period grouping with trend direction and growth rate calculations.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `company_id` | integer | Yes | Company ID |
| `start_date` | string | Yes | Start date (YYYY-MM-DD) |
| `end_date` | string | Yes | End date (YYYY-MM-DD) |
| `metric` | string | Yes | `revenue` or `expense` |
| `period` | string | No | `monthly`, `quarterly`, or `yearly` (default: `monthly`) |

### Example Requests

**Sales Revenue Trends (Monthly)**
```http
GET /api/financial-reports/trends?company_id=1&start_date=2024-01-01&end_date=2025-12-31&metric=revenue&period=monthly
Authorization: Bearer {token}
```

**Purchase Expense Trends (Quarterly)**
```http
GET /api/financial-reports/trends?company_id=1&start_date=2024-01-01&end_date=2025-12-31&metric=expense&period=quarterly
Authorization: Bearer {token}
```

### Response Structure

```json
{
  "filters": {
    "company_id": 1,
    "start_date": "2024-01-01",
    "end_date": "2025-12-31",
    "comparison_type": "none"
  },
  "metric": "revenue",
  "data_points": [
    {
      "period": "2024-01",
      "value": 85000.00,
      "label": "January 2024"
    },
    {
      "period": "2024-02",
      "value": 92000.00,
      "label": "February 2024"
    },
    {
      "period": "2024-03",
      "value": 105000.00,
      "label": "March 2024"
    }
  ],
  "trend": "increasing",
  "average_growth_rate": 5.25,
  "generated_at": "2025-12-31T10:30:00Z"
}
```

### Response Fields

#### `metric` (string)
The metric type: `revenue` or `expense`

#### `data_points` Array
Array of data points with the following fields:
- `period` (string): Period identifier (format depends on period type)
  - Monthly: `YYYY-MM` (e.g., "2024-01")
  - Quarterly: `YYYY-QN` (e.g., "2024-Q1")
  - Yearly: `YYYY` (e.g., "2024")
- `value` (float): Total amount for the period
- `label` (string): Human-readable period label
  - Monthly: "January 2024"
  - Quarterly: "Q1 2024"
  - Yearly: "2024"

#### `trend` (string)
Overall trend direction:
- `increasing`: Last value is higher than first value
- `decreasing`: Last value is lower than first value
- `stable`: Change is less than 1% of first value

#### `average_growth_rate` (float|null)
Average percentage growth rate between consecutive periods. Returns `null` if less than 2 data points.

### Period Grouping

- **Monthly**: Groups by year and month (YYYY-MM)
- **Quarterly**: Groups by year and quarter
  - Q1: January-March
  - Q2: April-June
  - Q3: July-September
  - Q4: October-December
- **Yearly**: Groups by year only (YYYY)

### Data Source

- **Revenue Trends**: Journal entries linked to income accounts where `voucher_type` contains "Sales Invoice"
- **Expense Trends**: Journal entries linked to expense accounts where `voucher_type` contains "Purchase Invoice"

### Calculation Notes

- Only includes journal entries with dates within the specified range
- Revenue: Credits - Debits (for income accounts)
- Expenses: Debits - Credits (for expense accounts)
- Growth rate is calculated as: ((Current - Previous) / Previous) × 100
- Average growth rate is the mean of all period-over-period growth rates

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "start_date": ["The start date field is required."],
    "end_date": ["The end date must be a date after or equal to start date."]
  }
}
```

### 401 Unauthorized

```json
{
  "message": "Unauthenticated."
}
```

### 403 Forbidden

```json
{
  "message": "Insufficient module access."
}
```

### 422 Validation Error

```json
{
  "message": "The metric field is required for trends endpoint.",
  "errors": {
    "metric": ["The metric field is required."]
  }
}
```

---

## Comparison Types

### `previous_period`
Compares with the same duration immediately before the current period.

**Example:**
- Current: 2025-01-01 to 2025-01-31 (31 days)
- Previous: 2024-12-01 to 2024-12-31 (31 days)

### `previous_year`
Compares with the same date range one year earlier.

**Example:**
- Current: 2025-01-01 to 2025-12-31
- Previous: 2024-01-01 to 2024-12-31

### `none`
No comparison data is included (default).

---

## Account Mapping System

For more accurate reporting, accounts can be mapped to P&L sections using the `financial_account_mappings` table:

### P&L Sections

- `income`: Revenue/income accounts
- `cogs`: Cost of goods sold accounts
- `operating_expense`: Operating expense accounts
- `non_operating_income`: Non-operating income accounts
- `non_operating_expense`: Non-operating expense accounts

### Fallback Behavior

If no mappings exist:
- **COGS**: Falls back to expense accounts with names: 'Purchase', 'Cost of Goods Sold', 'COGS', 'Direct Costs'
- **Operating Expenses**: All expense accounts excluding COGS
- **Non-operating**: Empty (no accounts included)

---

## Performance Considerations

- Reports are calculated in real-time from journal entries
- Large date ranges may take 2-3 seconds to process
- Consider caching for frequently accessed reports (future enhancement)
- Database indexes on `journal_entries.date` and `journal_entry_lines.account_id` are recommended

---

## Date Format

All dates must be in `YYYY-MM-DD` format (ISO 8601 date format).

**Examples:**
- ✅ `2025-01-01`
- ✅ `2025-12-31`
- ❌ `01/01/2025`
- ❌ `2025-1-1`

---

## Notes for Frontend Integration

1. **Period Selector**: The trends endpoint supports a `period` parameter for monthly/quarterly/yearly grouping. The frontend should provide a period selector UI.

2. **Comparison Toggle**: All endpoints support comparison data. The frontend should provide a UI to select comparison type.

3. **Chart Data**: The trends endpoint returns data in a format suitable for charting libraries:
   - `data_points` array with `period`, `value`, and `label` fields
   - `label` is human-readable for display
   - Periods are sorted chronologically

4. **Account Numbers**: All line items include `account_number` for display purposes.

5. **Trend Indicators**: Profitability analysis ratios include `trend` and `previous_value` fields for displaying trend indicators (up/down arrows, etc.).

6. **Empty States**: If no data exists for a period, the endpoint will return empty arrays or zero values. Handle these gracefully in the UI.

7. **Loading States**: Reports may take 1-3 seconds to generate. Show appropriate loading indicators.

8. **Error Handling**: Always handle validation errors and display user-friendly error messages.

---

## Example Frontend Integration

### React/TypeScript Example

```typescript
interface ProfitLossResponse {
  filters: {
    company_id: number;
    start_date: string;
    end_date: string;
    comparison_type: string;
  };
  lines: Array<{
    account_id: number;
    account_number: string;
    account_name: string;
    section: 'income' | 'cogs';
    current_period: number;
    previous_period?: number;
    change_amount?: number;
    change_percentage?: number;
  }>;
  summary: {
    total_income: number;
    total_cogs: number;
    gross_profit: number;
    // ... other fields
  };
  previous_summary?: {
    total_income: number;
    total_cogs: number;
    gross_profit: number;
  };
  generated_at: string;
}

async function fetchProfitLoss(
  companyId: number,
  startDate: string,
  endDate: string,
  comparisonType: string = 'none'
): Promise<ProfitLossResponse> {
  const response = await fetch(
    `/api/financial-reports/profit-loss?` +
    `company_id=${companyId}&` +
    `start_date=${startDate}&` +
    `end_date=${endDate}&` +
    `comparison_type=${comparisonType}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch profit loss report');
  }

  return response.json();
}
```

---

## Support

For issues or questions regarding the Profitability Reports API, please contact the development team or refer to the backend implementation documentation.

