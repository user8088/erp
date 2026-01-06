# Profit & Loss Chart - Frontend Integration Guide

## Overview

This document provides comprehensive guidance for integrating the Profit & Loss Chart API into the frontend application. The API returns Income, Expense, and Net Profit/Loss data with support for filtering and comparative analysis.

## API Endpoint

```
GET /api/financial-reports/profit-loss
```

**Authentication Required:** Yes (via Sanctum token)  
**Permission Required:** `module.accounting.read`

## Request Parameters

### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `company_id` | integer | The company ID for which to generate the report | `1` |
| `start_date` | string | Start date of the reporting period (YYYY-MM-DD) | `"2025-01-01"` |
| `end_date` | string | End date of the reporting period (YYYY-MM-DD) | `"2025-12-31"` |

### Optional Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `comparison_type` | string | Type of comparison: `"previous_period"`, `"previous_year"`, or `"none"` | `"previous_year"` |
| `comparison_start_date` | string | Custom comparison start date (YYYY-MM-DD). Required if `comparison_end_date` is provided | `"2024-01-01"` |
| `comparison_end_date` | string | Custom comparison end date (YYYY-MM-DD). Required if `comparison_start_date` is provided | `"2024-12-31"` |
| `account_ids` | array | Filter by specific account IDs | `[10, 15, 20]` |
| `root_types` | array | Filter by account root types: `"income"`, `"expense"` | `["income"]` |

### Comparison Type Behavior

- **`previous_period`**: Automatically calculates the previous period
  - For month periods: Previous month (e.g., Jan 2025 → Dec 2024)
  - For year periods: Previous year (e.g., 2025 → 2024)
- **`previous_year`**: Same date range in the previous year
  - Example: `2025-01-01` to `2025-01-31` → `2024-01-01` to `2024-01-31`
- **`none`**: No comparison data (default)

## Response Structure

### Success Response (200 OK)

```json
{
  "filters": {
    "company_id": 1,
    "start_date": "2025-01-01",
    "end_date": "2025-12-31",
    "comparison_type": "previous_year",
    "comparison_start_date": "2024-01-01",
    "comparison_end_date": "2024-12-31"
  },
  "lines": [
    {
      "account_id": 10,
      "account_number": "4001",
      "account_name": "Sales Revenue",
      "section": "income",
      "category": null,
      "current_period": 500000.00,
      "previous_period": 450000.00,
      "change_amount": 50000.00,
      "change_percentage": 11.11,
      "order": 1
    },
    {
      "account_id": 15,
      "account_number": "5001",
      "account_name": "Cost of Goods Sold",
      "section": "cogs",
      "category": null,
      "current_period": 200000.00,
      "previous_period": 180000.00,
      "change_amount": 20000.00,
      "change_percentage": 11.11,
      "order": 2
    }
    // ... more lines
  ],
  "summary": {
    "total_income": 500000.00,
    "total_cogs": 200000.00,
    "gross_profit": 300000.00,
    "total_operating_expenses": 150000.00,
    "operating_profit": 150000.00,
    "total_non_operating_income": 10000.00,
    "total_non_operating_expenses": 5000.00,
    "net_profit_before_tax": 155000.00,
    "tax": 15500.00,
    "net_profit": 139500.00
  },
  "previous_summary": {
    "total_income": 450000.00,
    "total_cogs": 180000.00,
    "gross_profit": 270000.00,
    "total_operating_expenses": 140000.00,
    "operating_profit": 130000.00,
    "total_non_operating_income": 8000.00,
    "total_non_operating_expenses": 4000.00,
    "net_profit_before_tax": 134000.00,
    "tax": 13400.00,
    "net_profit": 120600.00
  },
  "generated_at": "2025-01-15T10:30:00Z"
}
```

### Response Fields

#### Filters Object
- `company_id`: Company ID used for the report
- `start_date`: Start date of the current period
- `end_date`: End date of the current period
- `comparison_type`: Type of comparison used
- `comparison_start_date`: Start date of comparison period (if applicable)
- `comparison_end_date`: End date of comparison period (if applicable)

#### Lines Array
Each line represents an account with the following fields:
- `account_id`: Unique account identifier
- `account_number`: Account number/code
- `account_name`: Account name
- `section`: P&L section (`income`, `cogs`, `operating_expense`, `non_operating_income`, `non_operating_expense`, `tax`)
- `category`: Account category (if mapped, otherwise `null`)
- `current_period`: Amount for the current period
- `previous_period`: Amount for the comparison period (only if comparison is enabled)
- `change_amount`: Difference between current and previous period
- `change_percentage`: Percentage change (only if comparison is enabled)
- `order`: Display order

#### Summary Object
Contains aggregated totals for the current period:
- `total_income`: Total income/revenue
- `total_cogs`: Total cost of goods sold
- `gross_profit`: Total income - COGS
- `total_operating_expenses`: Total operating expenses
- `operating_profit`: Gross profit - Operating expenses
- `total_non_operating_income`: Total non-operating income
- `total_non_operating_expenses`: Total non-operating expenses
- `net_profit_before_tax`: Operating profit + Non-operating income - Non-operating expenses
- `tax`: Total tax expense
- `net_profit`: Net profit after tax

#### Previous Summary Object
Same structure as `summary`, but for the comparison period. Only present when `comparison_type` is not `"none"`.

### Error Responses

#### 400 Bad Request
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "start_date": ["The start date field is required."],
    "end_date": ["The end date must be after or equal to start date."]
  }
}
```

#### 401 Unauthorized
```json
{
  "message": "Unauthenticated."
}
```

#### 403 Forbidden
```json
{
  "message": "This action is unauthorized."
}
```

#### 404 Not Found
```json
{
  "message": "Company not found."
}
```

#### 500 Internal Server Error
```json
{
  "message": "Server Error"
}
```

## Frontend Integration Examples

### React/TypeScript Example

```typescript
// types/profitLoss.ts
export interface ProfitLossFilters {
  company_id: number;
  start_date: string;
  end_date: string;
  comparison_type?: 'previous_period' | 'previous_year' | 'none';
  comparison_start_date?: string;
  comparison_end_date?: string;
  account_ids?: number[];
  root_types?: ('income' | 'expense')[];
}

export interface ProfitLossLine {
  account_id: number;
  account_number: string | null;
  account_name: string;
  section: 'income' | 'cogs' | 'operating_expense' | 'non_operating_income' | 'non_operating_expense' | 'tax';
  category: string | null;
  current_period: number;
  previous_period?: number;
  change_amount?: number;
  change_percentage?: number;
  order: number;
}

export interface ProfitLossSummary {
  total_income: number;
  total_cogs: number;
  gross_profit: number;
  total_operating_expenses: number;
  operating_profit: number;
  total_non_operating_income: number;
  total_non_operating_expenses: number;
  net_profit_before_tax: number;
  tax: number;
  net_profit: number;
}

export interface ProfitLossResponse {
  filters: ProfitLossFilters;
  lines: ProfitLossLine[];
  summary: ProfitLossSummary;
  previous_summary?: ProfitLossSummary;
  generated_at: string;
}

// services/profitLossService.ts
import axios from 'axios';
import { ProfitLossResponse, ProfitLossFilters } from '../types/profitLoss';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://erp-server-main-xegmvt.laravel.cloud';

export const profitLossService = {
  async getProfitLoss(filters: ProfitLossFilters): Promise<ProfitLossResponse> {
    const params = new URLSearchParams();
    
    // Required parameters
    params.append('company_id', filters.company_id.toString());
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);
    
    // Optional parameters
    if (filters.comparison_type) {
      params.append('comparison_type', filters.comparison_type);
    }
    if (filters.comparison_start_date) {
      params.append('comparison_start_date', filters.comparison_start_date);
    }
    if (filters.comparison_end_date) {
      params.append('comparison_end_date', filters.comparison_end_date);
    }
    if (filters.account_ids && filters.account_ids.length > 0) {
      filters.account_ids.forEach(id => params.append('account_ids[]', id.toString()));
    }
    if (filters.root_types && filters.root_types.length > 0) {
      filters.root_types.forEach(type => params.append('root_types[]', type));
    }
    
    const response = await axios.get<ProfitLossResponse>(
      `${API_BASE_URL}/api/financial-reports/profit-loss`,
      {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json',
        },
      }
    );
    
    return response.data;
  },
};

// components/ProfitLossChart.tsx
import React, { useState, useEffect } from 'react';
import { profitLossService } from '../services/profitLossService';
import { ProfitLossResponse } from '../types/profitLoss';

interface ProfitLossChartProps {
  companyId: number;
  startDate: string;
  endDate: string;
  comparisonType?: 'previous_period' | 'previous_year' | 'none';
}

export const ProfitLossChart: React.FC<ProfitLossChartProps> = ({
  companyId,
  startDate,
  endDate,
  comparisonType = 'none',
}) => {
  const [data, setData] = useState<ProfitLossResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await profitLossService.getProfitLoss({
          company_id: companyId,
          start_date: startDate,
          end_date: endDate,
          comparison_type: comparisonType,
        });
        
        setData(response);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load profit & loss data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyId, startDate, endDate, comparisonType]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  // Format number for display (e.g., in Lakhs or Thousands)
  const formatAmount = (amount: number): string => {
    if (Math.abs(amount) >= 100000) {
      return `${(amount / 100000).toFixed(2)}L`;
    } else if (Math.abs(amount) >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }
    return amount.toFixed(2);
  };

  return (
    <div className="profit-loss-chart">
      <h2>Profit & Loss Report</h2>
      
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card">
          <h3>Total Income</h3>
          <p>{formatAmount(data.summary.total_income)}</p>
          {data.previous_summary && (
            <span className="change">
              {data.summary.total_income > data.previous_summary.total_income ? '↑' : '↓'}
              {formatAmount(Math.abs(data.summary.total_income - data.previous_summary.total_income))}
            </span>
          )}
        </div>
        
        <div className="card">
          <h3>Total Expenses</h3>
          <p>{formatAmount(data.summary.total_cogs + data.summary.total_operating_expenses)}</p>
        </div>
        
        <div className="card">
          <h3>Net Profit</h3>
          <p className={data.summary.net_profit >= 0 ? 'positive' : 'negative'}>
            {formatAmount(data.summary.net_profit)}
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="chart-container">
        {/* Implement your chart library here (e.g., Chart.js, Recharts, etc.) */}
        {/* Example structure: */}
        <BarChart
          data={[
            {
              name: 'Income',
              current: data.summary.total_income,
              previous: data.previous_summary?.total_income,
            },
            {
              name: 'Expenses',
              current: Math.abs(data.summary.total_cogs + data.summary.total_operating_expenses),
              previous: data.previous_summary 
                ? Math.abs(data.previous_summary.total_cogs + data.previous_summary.total_operating_expenses)
                : undefined,
            },
            {
              name: 'Net Profit',
              current: data.summary.net_profit,
              previous: data.previous_summary?.net_profit,
            },
          ]}
        />
      </div>

      {/* Account Lines Table (optional) */}
      <div className="account-lines">
        <h3>Account Details</h3>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Section</th>
              <th>Current Period</th>
              {data.previous_summary && (
                <>
                  <th>Previous Period</th>
                  <th>Change</th>
                  <th>% Change</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line) => (
              <tr key={line.account_id}>
                <td>{line.account_name}</td>
                <td>{line.section}</td>
                <td>{formatAmount(line.current_period)}</td>
                {line.previous_period !== undefined && (
                  <>
                    <td>{formatAmount(line.previous_period)}</td>
                    <td>{formatAmount(line.change_amount || 0)}</td>
                    <td>{line.change_percentage?.toFixed(2)}%</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### Vue.js Example

```javascript
// services/profitLossService.js
import axios from 'axios';

const API_BASE_URL = process.env.VUE_APP_API_URL || 'https://erp-server-main-xegmvt.laravel.cloud';

export const profitLossService = {
  async getProfitLoss(filters) {
    const params = {
      company_id: filters.companyId,
      start_date: filters.startDate,
      end_date: filters.endDate,
    };

    if (filters.comparisonType) {
      params.comparison_type = filters.comparisonType;
    }
    if (filters.comparisonStartDate) {
      params.comparison_start_date = filters.comparisonStartDate;
    }
    if (filters.comparisonEndDate) {
      params.comparison_end_date = filters.comparisonEndDate;
    }
    if (filters.accountIds && filters.accountIds.length > 0) {
      params.account_ids = filters.accountIds;
    }
    if (filters.rootTypes && filters.rootTypes.length > 0) {
      params.root_types = filters.rootTypes;
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/financial-reports/profit-loss`,
      {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    );

    return response.data;
  },
};
```

## Common Use Cases

### 1. Year Comparison (2025 vs 2024)

```typescript
const filters = {
  company_id: 1,
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  comparison_type: 'previous_year',
};

const data = await profitLossService.getProfitLoss(filters);
```

### 2. Month Comparison (January 2025 vs January 2024)

```typescript
const filters = {
  company_id: 1,
  start_date: '2025-01-01',
  end_date: '2025-01-31',
  comparison_type: 'previous_year',
};

const data = await profitLossService.getProfitLoss(filters);
```

### 3. Custom Comparison Period

```typescript
const filters = {
  company_id: 1,
  start_date: '2025-01-01',
  end_date: '2025-01-31',
  comparison_start_date: '2024-06-01',
  comparison_end_date: '2024-06-30',
};

const data = await profitLossService.getProfitLoss(filters);
```

### 4. Filter by Income Accounts Only

```typescript
const filters = {
  company_id: 1,
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  root_types: ['income'],
};

const data = await profitLossService.getProfitLoss(filters);
```

### 5. Filter by Specific Accounts

```typescript
const filters = {
  company_id: 1,
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  account_ids: [10, 15, 20],
};

const data = await profitLossService.getProfitLoss(filters);
```

## Data Formatting Tips

### Format Amounts for Display

```typescript
function formatAmount(amount: number): string {
  const absAmount = Math.abs(amount);
  
  if (absAmount >= 100000) {
    return `${(amount / 100000).toFixed(2)}L`;
  } else if (absAmount >= 1000) {
    return `${(amount / 1000).toFixed(2)}K`;
  }
  return amount.toFixed(2);
}
```

### Handle Negative Values (Losses)

```typescript
// Expenses are returned as positive values
// Net profit can be negative (loss)
const displayValue = section === 'expense' 
  ? Math.abs(amount) 
  : amount;
```

### Calculate Percentage Change

```typescript
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}
```

## Chart Implementation Recommendations

### Chart Libraries

1. **Recharts** (React)
   - Good TypeScript support
   - Responsive by default
   - Easy to customize

2. **Chart.js** (Universal)
   - Lightweight
   - Good documentation
   - Works with React, Vue, Angular

3. **Victory** (React)
   - Highly customizable
   - Good for complex visualizations

### Chart Data Structure

```typescript
const chartData = [
  {
    name: 'Income',
    current: data.summary.total_income,
    previous: data.previous_summary?.total_income,
  },
  {
    name: 'Expenses',
    current: Math.abs(data.summary.total_cogs + data.summary.total_operating_expenses),
    previous: data.previous_summary 
      ? Math.abs(data.previous_summary.total_cogs + data.previous_summary.total_operating_expenses)
      : undefined,
  },
  {
    name: 'Net Profit',
    current: data.summary.net_profit,
    previous: data.previous_summary?.net_profit,
  },
];
```

### Y-Axis Scaling

```typescript
// Dynamically adjust Y-axis scale based on data values
const maxValue = Math.max(
  ...chartData.map(d => Math.max(
    Math.abs(d.current),
    d.previous ? Math.abs(d.previous) : 0
  ))
);

// Add padding (e.g., 10% above max value)
const yAxisMax = maxValue * 1.1;
const yAxisMin = -maxValue * 1.1; // For negative values (losses)
```

## Error Handling Best Practices

```typescript
try {
  const data = await profitLossService.getProfitLoss(filters);
  // Handle success
} catch (error: any) {
  if (error.response) {
    // Server responded with error
    switch (error.response.status) {
      case 400:
        // Validation errors
        console.error('Validation errors:', error.response.data.errors);
        break;
      case 401:
        // Unauthorized - redirect to login
        router.push('/login');
        break;
      case 403:
        // Forbidden - show permission error
        showError('You do not have permission to view this report');
        break;
      case 404:
        // Not found
        showError('Company not found');
        break;
      case 500:
        // Server error
        showError('Server error. Please try again later.');
        break;
      default:
        showError('An unexpected error occurred');
    }
  } else if (error.request) {
    // Request made but no response
    showError('Network error. Please check your connection.');
  } else {
    // Something else happened
    showError('An error occurred while processing your request');
  }
}
```

## Performance Considerations

1. **Caching**: Consider caching responses for completed periods (past months/years)
2. **Debouncing**: Debounce date range changes to avoid excessive API calls
3. **Loading States**: Show loading indicators during API calls
4. **Pagination**: For large datasets, consider paginating account lines if needed

## Testing

### Example Test Cases

```typescript
describe('ProfitLossService', () => {
  it('should fetch profit loss data for a year', async () => {
    const filters = {
      company_id: 1,
      start_date: '2025-01-01',
      end_date: '2025-12-31',
    };
    
    const data = await profitLossService.getProfitLoss(filters);
    
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('lines');
    expect(data.summary).toHaveProperty('total_income');
    expect(data.summary).toHaveProperty('net_profit');
  });

  it('should include comparison data when comparison_type is provided', async () => {
    const filters = {
      company_id: 1,
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      comparison_type: 'previous_year',
    };
    
    const data = await profitLossService.getProfitLoss(filters);
    
    expect(data).toHaveProperty('previous_summary');
    expect(data.lines[0]).toHaveProperty('previous_period');
  });
});
```

## Troubleshooting

### Issue: No Data Showing (All Zeros)

If you see all zeros in the chart despite having sales and COA data, check the following:

#### 1. Use Diagnostics Endpoint

First, call the diagnostics endpoint to identify the issue:

```typescript
GET /api/financial-reports/profit-loss/diagnostics?company_id=1&start_date=2025-12-01&end_date=2025-12-31
```

This will return:
- Number of income accounts found
- List of income accounts
- Number of journal entries in date range
- Number of income transactions
- Total income amount
- Sales revenue account mapping status

#### 2. Common Issues and Solutions

**Issue: No Income Accounts Found**
- **Cause**: Income accounts not created or have wrong `company_id`
- **Solution**: 
  - Verify accounts exist: `GET /api/accounts?root_type=income`
  - Ensure accounts have correct `company_id`
  - Check accounts are not disabled (`is_disabled = false`)

**Issue: No Journal Entries Found**
- **Cause**: Sales not creating journal entries or entries not posted
- **Solution**:
  - Verify sales are creating journal entries (check `journal_entries` table)
  - Ensure `is_posted = true` for journal entries
  - Check journal entry dates match your date range

**Issue: Journal Entries Exist But No Income Transactions**
- **Cause**: Sales posting to wrong accounts or account mapping incorrect
- **Solution**:
  - Check account mappings: `GET /api/account-mappings`
  - Verify `pos_sales_revenue` mapping points to an income account
  - Ensure mapped account has `root_type = 'income'`

**Issue: Date Range Mismatch**
- **Cause**: Requesting future dates or dates with no transactions
- **Solution**:
  - Use actual dates where sales occurred
  - Check journal entry dates: `SELECT DISTINCT date FROM journal_entries ORDER BY date DESC`

**Issue: Company ID Mismatch**
- **Cause**: Journal entries have different `company_id` than requested
- **Solution**:
  - Verify journal entries have correct `company_id`
  - Check if using `company_id = null` (system-wide) vs specific company

#### 3. Database Queries for Debugging

```sql
-- Check income accounts
SELECT * FROM accounts 
WHERE company_id = 1 
  AND root_type = 'income' 
  AND is_disabled = false;

-- Check journal entries in date range
SELECT COUNT(*) FROM journal_entries 
WHERE company_id = 1 
  AND date BETWEEN '2025-12-01' AND '2025-12-31'
  AND is_posted = true;

-- Check income transactions
SELECT SUM(jel.credit - jel.debit) as income
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN accounts a ON jel.account_id = a.id
WHERE a.company_id = 1
  AND a.root_type = 'income'
  AND je.company_id = 1
  AND je.date BETWEEN '2025-12-01' AND '2025-12-31'
  AND je.is_posted = true;

-- Check account mappings
SELECT * FROM account_mappings 
WHERE mapping_type = 'pos_sales_revenue' 
  AND company_id = 1;
```

## Support

For issues or questions:
1. Use the diagnostics endpoint first to identify the problem
2. Check the API response structure matches this documentation
3. Verify authentication token is valid
4. Ensure required permissions are granted
5. Check network tab for actual API requests/responses
6. Review backend logs for server-side errors
7. Run the SQL queries above to verify data exists

## Changelog

- **2025-01-15**: Initial API implementation
  - Support for income, expense, and net profit calculations
  - Comparison period support (previous period, previous year, custom)
  - Account filtering (by IDs and root types)
  - Group account recursive aggregation
  - Tax calculation support

