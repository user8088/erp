# Opening Balance - Backend Requirements

## Overview

This document specifies how opening balances should be handled in the accounting system. Opening balances represent the initial balance of an account at the start of a financial period (typically the beginning of the fiscal year or when an account is first created).

## Current Implementation Status

**Frontend Status**: ✅ **COMPLETE**
- Opening balance filtering UI has been implemented
- Visual identification for opening balance transactions added (amber background, badge)
- Filter checkboxes added to account detail page ("Exclude Opening Balances" and "Opening Balances Only")
- API client updated to support filter parameters (`exclude_opening_balances`, `opening_balances_only`)
- Transaction type updated to include `is_opening_balance` field

**Backend Status**: ⚠️ **PENDING IMPLEMENTATION**
- Opening balances can be recorded using journal entries with `voucher_type = "Opening Balance"` ✅
- Filter parameters (`exclude_opening_balances`, `opening_balances_only`) need to be implemented ❌
- `is_opening_balance` field needs to be added to transaction responses ❌

## Recommended Approach

### Option 1: Use Journal Entries (Current Approach) ✅

Opening balances are recorded as regular journal entries with a special voucher type.

**Pros**:
- Simple implementation
- Consistent with existing transaction system
- Full audit trail
- No special handling required

**Cons**:
- Opening balances appear in regular transaction lists
- No special filtering or identification
- May clutter transaction history

### Option 2: Dedicated Opening Balance Table (Recommended for Future)

Create a separate `opening_balances` table to store opening balances separately from regular transactions.

**Pros**:
- Clean separation of opening balances from regular transactions
- Can be filtered out of transaction lists easily
- Better for reporting and balance calculations
- Can have different date handling

**Cons**:
- More complex implementation
- Requires migration of existing data
- Additional table to maintain

## Implementation: Option 1 (Journal Entry Approach)

### Frontend: How to Add Opening Balance

**✅ UPDATED**: "Opening Balance" has been added as a voucher type option.

Users can add opening balances using the existing Journal Entry form:

1. **Navigate to**: `/journal-entry/new`
2. **Fill in the form**:
   - **Date**: Set to the opening balance date (typically start of fiscal year or account creation date)
   - **Voucher Type**: Select "Opening Balance" from dropdown (✅ Now available)
   - **Reference Number**: Optional (e.g., "OB-001", "Opening Balance 2026")
   - **Description**: Optional (e.g., "Opening balance for Cash In Hand")
3. **Add Journal Entry Lines**:
   - **Line 1**: 
     - Account: The account receiving the opening balance (e.g., "Cash In Hand")
     - Debit: Opening balance amount (for debit normal accounts like assets)
     - Credit: 0
   - **Line 2**:
     - Account: Counter account (typically "Capital" or "Retained Earnings" for assets)
     - Debit: 0
     - Credit: Opening balance amount
4. **Create Entry**: Submit the journal entry

### Example Opening Balance Entry

**Scenario**: Adding PKR 50,000 opening balance to "Cash In Hand" account

```json
POST /api/journal-entries
{
  "company_id": 1,
  "date": "2026-01-01",
  "voucher_type": "Opening Balance",
  "reference_number": "OB-2026-001",
  "description": "Opening balance for Cash In Hand",
  "lines": [
    {
      "account_id": 5,  // Cash In Hand (Asset - Debit Normal)
      "debit": 50000.00,
      "credit": 0.00,
      "description": "Opening cash balance"
    },
    {
      "account_id": 20, // Capital Account (Equity - Credit Normal)
      "debit": 0.00,
      "credit": 50000.00,
      "description": "Initial capital contribution"
    }
  ]
}
```

## Backend Requirements

### 1. Voucher Type Support

The backend should support `"Opening Balance"` as a valid voucher type:

**Validation**:
- Allow `voucher_type = "Opening Balance"` in journal entry creation
- No special validation rules required (follows standard double-entry rules)

**Storage**:
- Store in `journal_entries.voucher_type` field as string
- No special flags or indicators needed

### 2. Transaction Filtering

The backend should provide a way to filter or identify opening balance transactions:

#### ✅ REQUIRED: Filter by Voucher Type

**Status**: Frontend has been updated to support these filters. Backend must implement.

```php
// In AccountService or TransactionService
public function getTransactions($accountId, $filters = [])
{
    $query = JournalEntryLine::where('account_id', $accountId)
        ->with(['journalEntry', 'account']);
    
    // Filter out opening balances if requested
    if (isset($filters['exclude_opening_balances']) && $filters['exclude_opening_balances']) {
        $query->whereHas('journalEntry', function($q) {
            $q->where('voucher_type', '!=', 'Opening Balance');
        });
    }
    
    // Filter by opening balances only if requested
    if (isset($filters['opening_balances_only']) && $filters['opening_balances_only']) {
        $query->whereHas('journalEntry', function($q) {
            $q->where('voucher_type', '=', 'Opening Balance');
        });
    }
    
    return $query->paginate($filters['per_page'] ?? 15);
}
```

#### ✅ REQUIRED: API Endpoint Enhancement

**Status**: Frontend is calling these parameters. Backend must implement.

Add optional query parameters to `GET /api/accounts/{id}/transactions`:

- `exclude_opening_balances` (boolean, default: `false`): Exclude opening balance transactions
- `opening_balances_only` (boolean, default: `false`): Show only opening balance transactions

**Important**: These parameters are mutually exclusive. If both are provided, `opening_balances_only` takes precedence.

**Example**:
```
GET /api/accounts/5/transactions?exclude_opening_balances=true
GET /api/accounts/5/transactions?opening_balances_only=true
```

**Validation**:
- Both parameters should accept `true`, `false`, `1`, `0`, `"true"`, `"false"` as valid values
- If both are `true`, only `opening_balances_only` should be applied

### 3. Balance Calculation

Opening balances should be included in balance calculations by default.

**Current Behavior** (Recommended):
- Opening balance journal entries are regular transactions
- They contribute to account balance like any other transaction
- Balance calculation: `sum(debits) - sum(credits)` (for debit normal accounts)

**No Special Handling Required**:
- Opening balances are already included in balance calculations
- The `getBalance()` method automatically includes them

### 4. Opening Balance Date Handling

**Important Considerations**:

1. **Opening Balance Date**:
   - Should typically be set to the start of the fiscal year or account creation date
   - Can be any date in the past
   - Should not be in the future

2. **Balance Calculations with Date Filters**:
   - When calculating balance "as of" a specific date, opening balances before that date should be included
   - Opening balances on or after the "as of" date should be excluded

**Example**:
```php
public function getBalanceAsOf(Account $account, $asOfDate)
{
    // Get opening balance (transactions before as_of_date)
    $openingBalance = $this->getOpeningBalance($account, $asOfDate);
    
    // Get transactions up to and including as_of_date
    $transactions = JournalEntryLine::where('account_id', $account->id)
        ->whereHas('journalEntry', function($q) use ($asOfDate) {
            $q->where('date', '<=', $asOfDate);
        })
        ->get();
    
    // Calculate balance including opening balance
    $totalDebit = $transactions->sum('debit');
    $totalCredit = $transactions->sum('credit');
    
    if ($account->normal_balance === 'debit') {
        return $totalDebit - $totalCredit;
    } else {
        return $totalCredit - $totalDebit;
    }
}

public function getOpeningBalance(Account $account, $beforeDate)
{
    // Sum all opening balance transactions before the specified date
    $openingEntries = JournalEntryLine::where('account_id', $account->id)
        ->whereHas('journalEntry', function($q) use ($beforeDate) {
            $q->where('voucher_type', 'Opening Balance')
              ->where('date', '<', $beforeDate);
        })
        ->get();
    
    $totalDebit = $openingEntries->sum('debit');
    $totalCredit = $openingEntries->sum('credit');
    
    if ($account->normal_balance === 'debit') {
        return $totalDebit - $totalCredit;
    } else {
        return $totalCredit - $totalDebit;
    }
}
```

### 5. Account Statement Display

Opening balances should be clearly identified in account statements:

**In Transaction Lists**:
- Show `voucher_type = "Opening Balance"` clearly
- Optionally highlight or group opening balance entries
- Include in running balance calculations

**In PDF Statements**:
- Optionally show opening balance separately in a summary section
- Or include in transaction list with clear identification

**Example Transaction Display**:
```json
{
  "id": 1,
  "date": "2026-01-01",
  "voucher_type": "Opening Balance",
  "reference_number": "OB-2026-001",
  "description": "Opening balance for Cash In Hand",
  "debit": 50000.00,
  "credit": 0.00,
  "balance": 50000.00,
  "is_opening_balance": true  // ✅ REQUIRED: Flag for easy identification in frontend
}
```

**✅ REQUIRED**: The backend must include `is_opening_balance` field in transaction responses:
- Set to `true` when `voucher_type === "Opening Balance"`
- Set to `false` for all other transactions
- This allows frontend to easily identify and style opening balance transactions

### 6. Validation Rules

**Standard Journal Entry Validation**:
- Opening balance entries must follow double-entry bookkeeping (debit = credit)
- Only ledger accounts can be used (not group accounts)
- All standard journal entry validations apply

**Additional Recommendations**:
- Consider warning if opening balance date is in the future
- Consider warning if multiple opening balances exist for the same account
- Consider validation to prevent editing/deleting old opening balances (if lock date feature exists)

### 7. Multiple Opening Balances

**Scenario**: User may need to add opening balances at different dates or for different periods.

**Handling**:
- Allow multiple opening balance entries
- Each entry is treated as a separate transaction
- All opening balances contribute to the account balance
- Consider adding a validation to prevent duplicate opening balances for the same date/period

**Example**: 
- Opening balance on 2026-01-01: PKR 50,000
- Additional opening balance adjustment on 2026-06-01: PKR 10,000
- Total balance: PKR 60,000

## API Endpoints

### Existing Endpoints (No Changes Required)

- `POST /api/journal-entries` - Create journal entry (supports opening balance via voucher_type)
- `GET /api/accounts/{id}/transactions` - Get transactions (can filter by voucher_type)
- `GET /api/accounts/{id}/balance` - Get balance (includes opening balances automatically)

### ✅ Required Enhancements

1. **✅ REQUIRED: Add Filter Parameters** to `GET /api/accounts/{id}/transactions`:
   - `exclude_opening_balances` (boolean, default: `false`)
   - `opening_balances_only` (boolean, default: `false`)
   - **Status**: Frontend is already calling these parameters. Backend must implement.

2. **✅ REQUIRED: Add `is_opening_balance` Field** to transaction responses:
   - Boolean field indicating if transaction is an opening balance
   - Set based on `voucher_type === "Opening Balance"`
   - **Status**: Frontend expects this field. Backend must include it.

3. **Add Opening Balance Helper Endpoint** (Optional, for future use):
   ```
   GET /api/accounts/{id}/opening-balance?as_of_date=2026-01-01
   ```
   Returns the opening balance amount for the account as of a specific date.

## Database Schema

### Current Schema (No Changes Required)

Opening balances use existing tables:

- `journal_entries` - Stores opening balance entry header
  - `voucher_type = "Opening Balance"`
  - `date` - Opening balance date
  - `reference_number` - Optional reference
  - `description` - Optional description

- `journal_entry_lines` - Stores opening balance debit/credit lines
  - `account_id` - The account with opening balance
  - `debit` / `credit` - Opening balance amounts
  - `description` - Optional line description

### Future Enhancement: Dedicated Opening Balance Table

If implementing Option 2 in the future:

```php
Schema::create('opening_balances', function (Blueprint $table) {
    $table->id();
    $table->foreignId('company_id')->constrained();
    $table->foreignId('account_id')->constrained();
    $table->date('as_of_date'); // Date for which this opening balance applies
    $table->decimal('debit', 15, 2)->default(0);
    $table->decimal('credit', 15, 2)->default(0);
    $table->string('reference_number')->nullable();
    $table->text('description')->nullable();
    $table->foreignId('created_by')->constrained('users');
    $table->timestamps();
    
    $table->unique(['company_id', 'account_id', 'as_of_date']);
    $table->index(['account_id', 'as_of_date']);
});
```

## Frontend Implementation

### Current Implementation

The frontend already supports creating opening balances through the journal entry form:

1. **Journal Entry Form** (`app/components/Accounting/JournalEntryForm.tsx`):
   - Voucher Type dropdown includes "Opening Balance" option
   - No special UI needed - works like regular journal entry

2. **Account Detail Page** (`app/accounting/accounts/[id]/AccountDetailClient.tsx`):
   - Shows all transactions including opening balances
   - No special filtering currently

### Recommended Enhancements

1. **Add Opening Balance Filter** to account transactions:
   - Add toggle/checkbox to "Exclude Opening Balances"
   - Add filter to show "Opening Balances Only"

2. **Visual Identification**:
   - Highlight opening balance transactions differently
   - Add icon or badge for opening balance entries
   - Group opening balances separately in transaction list

3. **Opening Balance Summary**:
   - Show opening balance amount in account header
   - Display opening balance date
   - Show opening balance in account statement summary

## Best Practices

### 1. Opening Balance Date

- **Recommended**: Set opening balance date to the start of the fiscal year
- **Alternative**: Set to account creation date if account is created mid-year
- **Avoid**: Setting opening balance date in the future

### 2. Counter Account Selection

- **For Asset Accounts**: Use Equity account (Capital, Retained Earnings) as counter
- **For Liability Accounts**: Use Asset account (Cash, Bank) as counter
- **For Equity Accounts**: Use Asset account (Cash, Bank) as counter
- **For Income/Expense**: Typically not used for opening balances (these start at zero)

### 3. Reference Number Convention

- Use consistent format: `OB-YYYY-XXX` or `OB-YYYY-MM-DD`
- Example: `OB-2026-001`, `OB-2026-01-01`

### 4. Documentation

- Always include description explaining the opening balance
- Document source of opening balance (e.g., "Balance from previous system", "Initial capital")

## Testing Requirements

The backend should include tests for:

1. ✅ Opening balance can be created via journal entry
2. ✅ Opening balance follows double-entry rules
3. ✅ Opening balance is included in balance calculations
4. ✅ Opening balance can be filtered from transaction lists
5. ✅ Opening balance date handling works correctly
6. ✅ Multiple opening balances are handled correctly
7. ✅ Opening balance appears in account statements
8. ✅ Opening balance respects date filters in balance calculations

## Migration from Existing Data

If migrating from another system:

1. **Identify Opening Balances**: Determine which transactions are opening balances
2. **Create Journal Entries**: Create journal entries with `voucher_type = "Opening Balance"`
3. **Set Appropriate Dates**: Use fiscal year start date or account creation date
4. **Verify Balances**: Ensure account balances match after migration

## Related Documents

- `docs/ACCOUNT-TRANSACTIONS-TIMESTAMP-BALANCE-BACKEND-REQUIREMENTS.md` - Transaction and balance requirements
- `docs/ACCOUNT-STATEMENT-DOWNLOAD-BACKEND-REQUIREMENTS.md` - Account statement requirements
- `docs/accounting-transactions-backend.mdc` - Journal entry implementation
- `docs/laravel-backend.mdc` - Backend API specification

## Summary

**Current Approach**: Opening balances are recorded as journal entries with `voucher_type = "Opening Balance"`. This is simple and works well, but could benefit from:

1. **Filtering Support**: Add ability to exclude/include opening balances in transaction lists
2. **Visual Identification**: Clearly mark opening balance transactions in UI
3. **Helper Methods**: Add methods to easily retrieve opening balance amounts
4. **Validation**: Consider warnings for unusual opening balance scenarios

**Future Enhancement**: Consider dedicated opening balance table for better separation and handling, but current approach is sufficient for most use cases.

