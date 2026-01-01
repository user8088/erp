# Account Transactions Timestamp and Balance - Backend Requirements

## Overview

This document specifies the backend requirements for providing exact creation timestamps and running balances for each transaction in the account transactions API response. These fields are essential for audit trails and understanding account balance progression.

## API Endpoint

**Endpoint**: `GET /api/accounts/{id}/transactions`

## Current Response Structure

Currently, the API returns transactions with optional `created_at` and `balance` fields:

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
  "meta": { ... }
}
```

## Required Changes

### 1. Mandatory `created_at` Field

**Current Status**: Optional, may be `null` or missing

**Required Change**: `created_at` must **always** be present and contain a valid ISO 8601 timestamp.

**Format**: ISO 8601 format with timezone (e.g., `"2026-01-01T10:30:45.000000Z"`)

**Source**: 
- Use `journal_entry_lines.created_at` or `journal_entries.created_at`
- If transaction is from a different source (e.g., sales, purchases), use the creation timestamp from that source
- **Never return `null` or omit this field**

**Example**:
```json
{
  "id": 1,
  "created_at": "2026-01-01T10:30:45.123456Z"
}
```

### 2. Mandatory Running Balance Field

**Current Status**: Optional, may be `null` or missing

**Required Change**: `balance` must **always** be present and contain the running balance after that transaction.

**Calculation Logic**:
- For **debit-normal accounts** (Assets, Expenses):
  ```
  running_balance = previous_balance + debit_amount - credit_amount
  ```
- For **credit-normal accounts** (Liabilities, Equity, Income):
  ```
  running_balance = previous_balance + credit_amount - debit_amount
  ```

**Ordering**: Transactions must be ordered by:
1. `date` (ascending)
2. `created_at` (ascending) - for transactions on the same date
3. `id` (ascending) - as final tiebreaker

**Initial Balance**: For the first transaction, use the account's opening balance (if any) or 0.

**Example**:
```json
{
  "id": 1,
  "debit": 1000.00,
  "credit": 0.00,
  "balance": 1000.00  // Running balance after this transaction
}
```

### 3. Updated Response Structure

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
      "created_at": "2026-01-01T10:30:45.123456Z",
      "entry_date": "2026-01-01",
      "entry_time": "10:30:45",
      "entry_datetime": "2026-01-01 10:30:45"
    },
    {
      "id": 2,
      "date": "2026-01-01",
      "voucher_type": "Journal Entry",
      "reference_number": "JV-002",
      "description": "Payment received",
      "debit": 500.00,
      "credit": 0.00,
      "balance": 1500.00,
      "created_at": "2026-01-01T14:15:30.789012Z",
      "entry_date": "2026-01-01",
      "entry_time": "14:15:30",
      "entry_datetime": "2026-01-01 14:15:30"
    }
  ],
  "meta": { ... }
}
```

### 4. Calculation Implementation

#### 4.1 Running Balance Calculation

**For Ledger Accounts**:

```php
// Get account's normal balance
$normalBalance = $account->normal_balance; // 'debit' or 'credit'

// Get opening balance (if any)
$openingBalance = $this->getOpeningBalance($accountId, $startDate);

// Order transactions by date, then created_at, then id
$transactions = JournalEntryLine::where('account_id', $accountId)
    ->when($startDate, fn($q) => $q->where('date', '>=', $startDate))
    ->when($endDate, fn($q) => $q->where('date', '<=', $endDate))
    ->orderBy('date', 'asc')
    ->orderBy('created_at', 'asc')
    ->orderBy('id', 'asc')
    ->get();

$runningBalance = $openingBalance;

foreach ($transactions as $transaction) {
    if ($normalBalance === 'debit') {
        $runningBalance = $runningBalance + $transaction->debit - $transaction->credit;
    } else {
        $runningBalance = $runningBalance + $transaction->credit - $transaction->debit;
    }
    
    $transaction->balance = $runningBalance;
}
```

**For Group Accounts**:

- Calculate running balance for each child account separately
- Sum the balances of all child accounts for the group balance
- Show the balance of the specific child account in `related_account_balance` field

#### 4.2 Timestamp Source Priority

1. **Journal Entry Lines**: Use `journal_entry_lines.created_at` (preferred)
2. **Journal Entry Header**: If line doesn't have timestamp, use `journal_entries.created_at`
3. **Source Transaction**: For transactions from other modules (sales, purchases), use the creation timestamp from that module
4. **Fallback**: If no timestamp exists, use `journal_entries.date` at midnight (00:00:00) - but this should be rare

### 5. Performance Considerations

#### 5.1 Efficient Balance Calculation

- Use a single query with window functions (if database supports):
  ```sql
  SELECT 
    *,
    SUM(
      CASE 
        WHEN normal_balance = 'debit' THEN debit - credit
        ELSE credit - debit
      END
    ) OVER (
      ORDER BY date ASC, created_at ASC, id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) + opening_balance AS balance
  FROM journal_entry_lines
  WHERE account_id = ?
  ORDER BY date ASC, created_at ASC, id ASC
  ```

- Or calculate in application layer with a single pass through ordered transactions

#### 5.2 Caching Considerations

- Running balances should be calculated fresh each time (don't cache)
- Opening balance can be cached or stored in a separate table
- Consider storing running balances in a materialized view for very large datasets

### 6. Edge Cases

1. **No Transactions**: Return empty array, no balance calculation needed

2. **Opening Balance**: 
   - If account has an opening balance entry, include it as the first transaction
   - Or add opening balance to the first transaction's balance calculation

3. **Same Timestamp**: 
   - If multiple transactions have identical `created_at`, order by `id` as tiebreaker
   - This ensures deterministic ordering

4. **Future-Dated Transactions**: 
   - Include them in chronological order
   - Balance calculation should still work correctly

5. **Backdated Transactions**: 
   - Recalculate running balances for all transactions after the inserted date
   - Or show balance as of that transaction's position in chronological order

6. **Deleted/Reversed Transactions**: 
   - If transactions can be deleted or reversed, ensure balance calculation accounts for this
   - Consider showing both original and adjusted balances

### 7. Group Accounts

For group accounts, the response should include:

- `balance`: The running balance of the specific child account (not the group total)
- `related_account_balance`: The balance of the child account after this transaction
- Group-level balance aggregation should be handled separately

### 8. Data Types

- `created_at`: `string` (ISO 8601 format, required, never null)
- `balance`: `float` or `decimal` (required, never null)
- `entry_date`: `string` (YYYY-MM-DD format, optional but recommended)
- `entry_time`: `string` (HH:MM:SS format, optional but recommended)
- `entry_datetime`: `string` (YYYY-MM-DD HH:MM:SS format, optional but recommended)

### 9. Validation

The backend should validate:

1. ✅ `created_at` is always present and valid ISO 8601 format
2. ✅ `balance` is always present and is a valid number
3. ✅ Running balance calculation is correct based on account's normal balance
4. ✅ Transactions are ordered correctly (date, then created_at, then id)
5. ✅ Balance progression is logical (no impossible jumps)

### 10. Testing Requirements

The backend should include tests for:

1. ✅ `created_at` is always present and not null
2. ✅ `balance` is always present and not null
3. ✅ Running balance calculation is correct for debit-normal accounts
4. ✅ Running balance calculation is correct for credit-normal accounts
5. ✅ Transactions are ordered correctly
6. ✅ Balance calculation handles opening balance correctly
7. ✅ Balance calculation works with date filters
8. ✅ Balance calculation works for group accounts
9. ✅ Multiple transactions with same timestamp are handled correctly
10. ✅ Performance is acceptable with large numbers of transactions

## Implementation Priority

**Priority: High**

These fields are essential for:
- Audit trails (exact timestamp of when transactions were created)
- Understanding account balance progression over time
- Financial reporting and reconciliation
- User trust and transparency

## Related Documents

- `docs/accounting-transactions-backend.mdc` - Transaction API specification
- `docs/chart-of-accounts-backend.mdc` - Chart of Accounts specification
- `docs/ACCOUNT-TRANSACTIONS-TOTALS-BACKEND-REQUIREMENTS.md` - Totals requirements

