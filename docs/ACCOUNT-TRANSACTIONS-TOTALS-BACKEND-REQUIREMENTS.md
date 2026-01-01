# Account Transactions Totals - Backend Requirements

## Overview

This document specifies the backend requirements for including transaction totals (total debit and total credit amounts) in the account transactions API response. These totals help users understand the cumulative effect of transactions on an account.

## API Endpoint

**Endpoint**: `GET /api/accounts/{id}/transactions`

## Current Response Structure

Currently, the API returns a paginated list of transactions:

```json
{
  "data": [
    {
      "id": 1,
      "date": "2026-01-01",
      "voucher_type": "Journal Entry",
      "reference_number": "JV-001",
      "description": "Opening balance",
      "debit": 1000.00,
      "credit": 0.00,
      "balance": 1000.00,
      "created_at": "2026-01-01T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 50,
    "last_page": 3
  }
}
```

## Required Changes

### 1. Add Totals to Response

Add a `totals` object to the response that includes:

- `total_debit`: Sum of all debit amounts across **all transactions** (respecting filters, but not pagination)
- `total_credit`: Sum of all credit amounts across **all transactions** (respecting filters, but not pagination)
- `net_change`: Difference between total_debit and total_credit (total_debit - total_credit)
- `page_total_debit`: Sum of all debit amounts in the current page's transactions (optional, for per-page display)
- `page_total_credit`: Sum of all credit amounts in the current page's transactions (optional, for per-page display)

**Note**: The main totals (`total_debit`, `total_credit`, `net_change`) represent the cumulative totals for **all transactions** matching the filters, regardless of pagination. This gives users insight into the overall activity on the account.

### 2. Updated Response Structure

```json
{
  "data": [
    {
      "id": 1,
      "date": "2026-01-01",
      "voucher_type": "Journal Entry",
      "reference_number": "JV-001",
      "description": "Opening balance",
      "debit": 1000.00,
      "credit": 0.00,
      "balance": 1000.00,
      "created_at": "2026-01-01T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 50,
    "last_page": 3
  },
  "totals": {
    "total_debit": 150000.00,
    "total_credit": 50000.00,
    "net_change": 100000.00,
    "page_total_debit": 50000.00,
    "page_total_credit": 20000.00
  }
}
```

### 3. Calculation Logic

**Important**: Exclude net-zero transactions (where both debit and credit are non-zero on the same account in the same transaction) from totals calculation to prevent account discrepancies.

```php
// Calculate totals for ALL transactions (respecting filters, not pagination)
$allTransactionsQuery = JournalEntryLine::where('account_id', $accountId)
    ->when($startDate, fn($q) => $q->where('date', '>=', $startDate))
    ->when($endDate, fn($q) => $q->where('date', '<=', $endDate));

// Filter out net-zero transactions (both debit and credit > 0)
$validTransactions = $allTransactionsQuery->get()->filter(function ($tx) {
    return !($tx->debit > 0 && $tx->credit > 0);
});

$totalDebit = (float) $validTransactions->sum('debit');
$totalCredit = (float) $validTransactions->sum('credit');
$netChange = $totalDebit - $totalCredit;

// Calculate totals for current page only (optional)
$pageValidTransactions = $paginatedTransactions->filter(function ($tx) {
    return !($tx->debit > 0 && $tx->credit > 0);
});

$pageTotalDebit = (float) $pageValidTransactions->sum('debit');
$pageTotalCredit = (float) $pageValidTransactions->sum('credit');

return [
    'data' => $paginatedTransactions,
    'meta' => $paginationMeta,
    'totals' => [
        'total_debit' => $totalDebit,
        'total_credit' => $totalCredit,
        'net_change' => $netChange,
        'page_total_debit' => $pageTotalDebit,
        'page_total_credit' => $pageTotalCredit,
    ]
];
```

### 4. Data Types

- `total_debit`: `float` or `decimal` (minimum 2 decimal places)
- `total_credit`: `float` or `decimal` (minimum 2 decimal places)
- `net_change`: `float` or `decimal` (minimum 2 decimal places, can be negative)

### 5. Edge Cases

1. **Empty Transactions**: If no transactions are returned, totals should be:
   ```json
   "totals": {
     "total_debit": 0.00,
     "total_credit": 0.00,
     "net_change": 0.00,
     "page_total_debit": 0.00,
     "page_total_credit": 0.00
   }
   ```

2. **Null Values**: If a transaction has `null` for debit or credit, treat it as `0.00` in the calculation.

3. **Filtered Results**: When date filters (`start_date`, `end_date`) are applied:
   - `total_debit`, `total_credit`, `net_change` should include ALL transactions within that date range (across all pages)
   - `page_total_debit`, `page_total_credit` should only include transactions in the current page

### 6. Performance Considerations

- Calculate totals in the database query using `SUM()` aggregation for better performance
- Use separate queries for all-time totals vs page totals to avoid loading all transactions
- Example SQL for all-time totals:
  ```sql
  SELECT 
    SUM(debit) as total_debit,
    SUM(credit) as total_credit,
    SUM(debit) - SUM(credit) as net_change
  FROM journal_entry_lines
  WHERE account_id = ? 
    AND [date filters]
    -- Note: No pagination conditions here
  ```
- Example SQL for page totals:
  ```sql
  SELECT 
    SUM(debit) as page_total_debit,
    SUM(credit) as page_total_credit
  FROM journal_entry_lines
  WHERE account_id = ? 
    AND [date filters]
    AND [pagination conditions]
  ```

### 7. Group Accounts

For group accounts (when viewing transactions across child accounts):

- Calculate totals for all transactions shown in the current page
- Include transactions from all child accounts that match the filters
- The calculation logic remains the same (sum of debits, sum of credits, net change)

### 8. Currency Handling

- Totals should be in the same currency as the account
- If multiple currencies exist (edge case), use the account's primary currency
- Format totals with 2 decimal places

## Frontend Integration

The frontend will:
1. Display totals in a footer row of the transactions table
2. Show both all-time totals (from `total_debit`, `total_credit`, `net_change`) and page totals (from `page_total_debit`, `page_total_credit`)
3. Show an explanation of what the totals mean based on account type
4. Display net change with appropriate color coding (green for positive, red for negative)
5. If backend doesn't provide totals yet, frontend will calculate from current page as fallback

## Testing Requirements

The backend should include tests for:

1. ✅ Totals are calculated correctly for a single page
2. ✅ Totals are zero when no transactions exist
3. ✅ Totals handle null debit/credit values correctly
4. ✅ Totals respect date filters
5. ✅ Totals work correctly for group accounts
6. ✅ Totals are formatted with 2 decimal places
7. ✅ Net change calculation is correct (debit - credit)
8. ✅ Totals are calculated efficiently using database aggregation

## Implementation Priority

**Priority: Medium**

This enhancement improves user experience by providing quick insights into transaction totals without requiring manual calculation.

## Related Documents

- `docs/chart-of-accounts-backend.mdc` - Chart of Accounts specification
- `docs/accounting-transactions-backend.mdc` - Transaction API specification
- `docs/COA-NEGATIVE-BALANCE-VALIDATION-BACKEND-REQUIREMENTS.md` - Balance validation requirements

